"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import type { IconName } from "@/app/_components/idn/icons"
import { Card, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

const LABELS = {
  profilePhoto: "Photo de profil",
  kycDocFront: "Pièce d’identité — recto",
  kycDocBack: "Pièce d’identité — verso",
  selfie: "Selfie de vérification",
  attestation: "Attestation",
} as const

const ICONS: Record<keyof typeof LABELS, IconName> = {
  profilePhoto: "userRound",
  kycDocFront: "idCard",
  kycDocBack: "idCard",
  selfie: "scanFace",
  attestation: "doc",
}

const fmt = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

/** Mes pièces justificatives : transposition de apps/mobile/src/app/settings/documents.tsx. */
export default function DocumentsPage() {
  const documents = useQuery(api.documents.listMine)
  return (
    <Screen header={<AppBar title="Mes pièces justificatives" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">
        Ta photo de profil et les attestations enregistrées sur ton compte. Les pièces de ta vérification d’identité restent dans ton dossier de vérification.
      </p>
      <Card className="mt-4">
        <Row icon="shield" tone="blue" title="Dossier de vérification" sub="Recto, verso et selfie envoyés pour le Niveau 2" chevron href="/kyc/review" />
      </Card>
      {documents === undefined ? (
        <Card className="mt-4">
          <Row title="Chargement…" />
        </Card>
      ) : documents.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <IdnLottie name="idocument" size={120} label="Illustration : document" />
          <p className="text-[15px] font-semibold text-idn-ink">Aucune pièce enregistrée</p>
          <p className="text-[13px] leading-[19px] text-idn-muted">Ajoute une photo de profil depuis Profil pour la retrouver ici.</p>
        </div>
      ) : (
        <Card className="mt-4">
          {documents.map((d) => {
            const sub = `Ajoutée le ${fmt(d.createdAt)}${d.expiresAt ? ` · expire le ${fmt(d.expiresAt)}` : ""}`
            return d.url ? (
              <a
                key={d._id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Ouvrir ${LABELS[d.type]} (nouvel onglet)`}
                className="block rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Row icon={ICONS[d.type]} title={LABELS[d.type]} sub={sub} chevron />
              </a>
            ) : (
              <Row key={d._id} icon={ICONS[d.type]} title={LABELS[d.type]} sub={`${sub} · fichier indisponible`} />
            )
          })}
        </Card>
      )}
    </Screen>
  )
}
