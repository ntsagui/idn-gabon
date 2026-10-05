"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Card, IconTile, Row, ScreenTitle, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { kycEntryRoute } from "@/lib/citizen/kyc-flow"

import { Fact, Facts } from "../_components/fact"
import { IN_REVIEW, useKycFlow } from "../_components/flow"

/** Présentation de la vérification d'identité (Niveau 2, ou première étape du Niveau 3). */
export default function KycIntroPage() {
  return (
    <React.Suspense fallback={null}>
      <KycIntro />
    </React.Suspense>
  )
}

function KycIntro() {
  const router = useRouter()
  const flow = useKycFlow()
  const me = useQuery(api.profile.getCurrentUser)
  const active = useQuery(api.kyc.getActiveRequest)
  const currentLoa = me?.profile?.loa ?? 1
  const targetLoa = flow.target === 3 || (flow.target === undefined && currentLoa === 2) ? 3 : 2

  // Parcours délégué (app partenaire) : on rend la main dès que le niveau
  // demandé est atteint, ou dès que le dossier est envoyé (l'app suit
  // l'avancement de son côté).
  React.useEffect(() => {
    if (!flow.returnTo || me === undefined || active === undefined) return
    if (currentLoa >= targetLoa || (active && IN_REVIEW.includes(active.status))) {
      window.location.assign(flow.returnTo)
    }
  }, [flow.returnTo, me, active, currentLoa, targetLoa])

  function continueFlow() {
    const destination = kycEntryRoute({ targetLoa, currentLoa, activeStatus: active?.status })
    if (destination === "review") router.replace(flow.href("/kyc/review"))
    else if (destination === "level3") router.replace(flow.href("/kyc/level3"))
    else router.push(flow.href("/kyc/doc", { target: String(targetLoa) }))
  }

  const label =
    active?.status === "complement_required"
      ? "Répondre au complément"
      : active?.status === "submitted" || active?.status === "under_review"
        ? "Voir l’avancement"
        : active?.status === "pending"
          ? "Reprendre ma vérification"
          : "Commencer"

  return (
    <Screen
      header={<AppBar title="Vérification d’identité" back="/dashboard" />}
      footer={
        <IdnButton full onClick={continueFlow} disabled={me === undefined || active === undefined}>
          {label}
        </IdnButton>
      }
    >
      <div className="mt-4">
        <IconTile icon="idCard" tone="blue" />
      </div>
      <ScreenTitle
        title="Passe au Niveau 2"
        lead={
          targetLoa === 3
            ? "Avant l’entretien du Niveau 3, fais vérifier ta pièce d’identité et ton visage."
            : "Ta pièce d’identité et un selfie suffisent. Un contrôleur confirme ensuite ton dossier."
        }
      />
      <Facts>
        <Fact value="5 min" label="Durée" />
        <Fact value="CNI" label="Recto, verso" />
        <Fact value="Gratuit" label="Service public" />
      </Facts>
      <SectionTitle>Les étapes</SectionTitle>
      <Card>
        <Row icon="idCard" tone="blue" title="Photo de ta CNI" sub="Recto puis verso, sans reflet" />
        <Row icon="scanFace" tone="blue" title="Selfie" sub="Comparé à la photo de ta pièce" />
        <Row icon="shield" tone="blue" title="Revue du dossier" sub="Délai moyen : 24 h, tu es notifié à chaque étape" />
      </Card>
      <SectionTitle>Ce que ça débloque</SectionTitle>
      <Card>
        <Row icon="landmark" tone="green" title="Démarches administratives en ligne" sub="Services publics qui exigent une identité vérifiée" />
        <Row icon="keyRound" tone="green" title="Connexion vérifiée chez les partenaires" sub="« Se connecter avec IDN » au Niveau 2" />
      </Card>
    </Screen>
  )
}
