"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge, LevelBadge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, Note } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { kycTimeline, type TimelineState } from "@/lib/citizen/kyc-timeline"

import { useKycFlow } from "../_components/flow"

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })

function Dot({ state }: { state: TimelineState }) {
  if (state === "done") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-idn-green text-white">
        <Icon name="check" size={14} strokeWidth={2.5} />
      </span>
    )
  }
  if (state === "current") return <span className="size-6 shrink-0 rounded-full border-2 border-idn-blue bg-c-blue-badge" />
  if (state === "failed") {
    return (
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#B3261E] text-white">
        <Icon name="close" size={14} strokeWidth={2.5} />
      </span>
    )
  }
  return <span className="size-6 shrink-0 rounded-full border-[1.5px] border-idn-border bg-idn-surface" />
}

const STATE_LABEL: Record<TimelineState, string> = {
  done: "terminé",
  current: "en cours",
  upcoming: "à venir",
  failed: "échec",
}

/** Statut de la vérification d'identité (prototype « kyc », écran de résultat). */
export default function KycReviewPage() {
  return (
    <React.Suspense fallback={null}>
      <KycReview />
    </React.Suspense>
  )
}

function KycReview() {
  const flow = useKycFlow()
  const active = useQuery(api.kyc.getActiveRequest)
  const latest = useQuery(api.kyc.getMyLatest)
  const me = useQuery(api.profile.getCurrentUser)
  const status = active?.status ?? latest?.status
  const loading = active === undefined || latest === undefined || me === undefined
  const steps = kycTimeline(status, (active?.timeline ?? []).map((e) => e.action))
  const loa = (me?.profile?.loa ?? 1) as 1 | 2 | 3

  const head =
    status === "approved"
      ? { lottie: "shield" as const, title: "Identité vérifiée", badge: <LevelBadge level={loa} /> }
      : status === "rejected"
        ? { lottie: null, title: "Vérification refusée", badge: <Badge tone="red" icon="close">Refusée</Badge> }
        : status === "expired"
          ? { lottie: null, title: "Dossier expiré", badge: <Badge tone="neutral" icon="clock">Expiré</Badge> }
          : status === "complement_required"
            ? { lottie: null, title: "Complément demandé", badge: <Badge tone="yellow" icon="alert">Action requise</Badge> }
            : status === "pending"
              ? { lottie: null, title: "Dossier à compléter", badge: <Badge tone="neutral">Non envoyé</Badge> }
              : status
                ? { lottie: "success" as const, title: "Dossier envoyé", badge: <Badge tone="blue" icon="clock">En revue</Badge> }
                : { lottie: null, title: "Aucune vérification en cours", badge: null }

  const footer =
    status === "complement_required" || status === "pending" ? (
      <IdnButton full href={flow.href("/kyc/doc")}>
        {status === "pending" ? "Continuer ma vérification" : "Répondre au complément"}
      </IdnButton>
    ) : status === "rejected" || status === "expired" || !status ? (
      <IdnButton full href={flow.href("/kyc/intro")} replace>
        {status ? "Recommencer la vérification" : "Vérifier mon identité"}
      </IdnButton>
    ) : status === "approved" && loa === 2 ? (
      <>
        <IdnButton full href="/kyc/level3" replace>
          Passer au Niveau 3
        </IdnButton>
        <IdnButton variant="ghost" full href="/dashboard" replace>
          Retour à l’accueil
        </IdnButton>
      </>
    ) : (
      <IdnButton variant={status === "approved" ? "primary" : "ghost"} full href="/dashboard" replace>
        Retour à l’accueil
      </IdnButton>
    )

  const reason = active?.rejectionReason ?? latest?.rejectionReason

  return (
    <Screen header={<AppBar title="Vérification d’identité" back="/dashboard" />} footer={loading ? undefined : footer}>
      {loading ? null : (
        <>
          <div className="mt-6 flex flex-col items-center text-center" aria-live="polite">
            {head.lottie ? <IdnLottie key={head.lottie} name={head.lottie} size={128} label={head.title} /> : null}
            <h2 className="mt-3 text-[22px] font-semibold leading-7 text-idn-ink">{head.title}</h2>
            {head.badge ? <div className="mt-2">{head.badge}</div> : null}
          </div>

          {status === "complement_required" && active?.complementRequest ? (
            <div className="mt-5 rounded-[14px] border border-idn-border bg-c-yellow-badge px-3.5 py-3.5">
              <p className="text-[13px] font-semibold text-idn-ink">Message du contrôleur</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-5 text-idn-ink-2">{active.complementRequest.message}</p>
            </div>
          ) : null}
          {status === "rejected" && reason ? (
            <div className="mt-5 rounded-[14px] border border-idn-border bg-c-red-badge px-3.5 py-3.5">
              <p className="text-[13px] font-semibold text-idn-ink">Motif</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-5 text-idn-ink-2">{reason}</p>
            </div>
          ) : null}

          {status ? (
            <Card className="mt-5" as="section">
              <ol aria-label="Avancement de ta vérification" className="divide-y divide-idn-border">
                {steps.map((s) => (
                  <li key={s.label} className="flex min-h-[52px] items-center gap-3 py-2">
                    <Dot state={s.state} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", s.state === "current" ? "font-semibold" : "font-medium", s.state === "upcoming" ? "text-idn-muted" : "text-idn-ink")}>
                        {s.label}
                        <span className="sr-only"> : {STATE_LABEL[s.state]}</span>
                      </p>
                      {s.state === "current" ? <p className="text-[13px] text-idn-muted">{s.hint}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <Note center>Fais vérifier ta pièce d’identité et ton visage pour passer au Niveau 2.</Note>
          )}

          {latest?.submittedAt && status !== "pending" ? (
            <Note center>Envoyé le {DAY.format(latest.submittedAt)}. Tu recevras une notification à chaque étape.</Note>
          ) : null}
        </>
      )}
    </Screen>
  )
}
