"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useAction, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, DetailRow, ErrorNote, ScreenTitle, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { aiErrorMessage } from "../_components/cv-ui"

interface AtsResult {
  score?: number
  breakdown?: Record<string, number>
  recommendations?: string[]
}

/** Dimensions renvoyées par `cv.ai` (chacune notée sur 25). */
const DIMENSIONS: Record<string, string> = {
  keywords: "Mots-clés",
  structure: "Structure",
  length: "Longueur",
  readability: "Lisibilité",
}

/** Score ATS (apps/mobile/src/app/icv/ats.tsx). */
export default function ICVAts() {
  const params = useSearchParams()
  const cvId = params.get("cv") as Id<"citizenCv"> | null
  const job = useQuery(api.cv.ai.getLastResult, cvId ? { cvId, feature: "ats_check" } : "skip")
  const atsCheck = useAction(api.cv.ai.atsCheck)
  const [starting, setStarting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isLoading = cvId !== null && job === undefined
  const isPending = job?.status === "queued" || job?.status === "running"
  const hasResult = job?.status === "completed" && !!job.result

  async function start() {
    if (!cvId || starting) return
    setStarting(true)
    setError(null)
    try {
      await atsCheck({ cvId })
    } catch (e) {
      setError(aiErrorMessage(e))
    } finally {
      setStarting(false)
    }
  }

  return (
    <Screen
      header={<AppBar title="Score ATS" back="/icv/studio" backIcon="close" />}
      footer={
        cvId && !isLoading && !isPending ? (
          <IdnButton full variant={hasResult ? "ghost" : "primary"} onClick={start} loading={starting}>
            {hasResult ? "Relancer l’analyse" : "Lancer l’analyse"}
          </IdnButton>
        ) : undefined
      }
    >
      <p className="mt-4 text-sm leading-5 text-idn-muted">
        Compatibilité de ton CV avec les logiciels de tri des candidatures (ATS) utilisés par les recruteurs.
      </p>
      <ErrorNote>{error}</ErrorNote>
      {!cvId ? (
        <ErrorNote>Aucun CV sélectionné. Ferme cette fenêtre et relance l’outil depuis le Studio.</ErrorNote>
      ) : isLoading || isPending ? (
        <div className="flex flex-col items-center py-10" aria-live="polite">
          <IdnLottie name="loader" size={80} loop label="Analyse en cours" />
          <p className="mt-2 text-sm text-idn-muted">{isPending ? "Analyse en cours…" : "Chargement…"}</p>
        </div>
      ) : hasResult ? (
        <AtsResultBody result={job.result as AtsResult} />
      ) : (
        <div className="flex flex-col items-center py-6">
          {job?.status === "failed" ? <ErrorNote>{job.errorMessage || "La dernière analyse a échoué."}</ErrorNote> : null}
          <ScreenTitle center title="Aucune analyse pour ce CV" lead="Lance l’analyse : le résultat s’affichera ici dans quelques secondes." />
        </div>
      )}
    </Screen>
  )
}

function AtsResultBody({ result }: { result: AtsResult }) {
  const score = clampScore(result.score)
  const tone =
    score >= 80
      ? { label: "Bien optimisé", badge: "green" as const, stroke: "stroke-idn-green" }
      : score >= 50
        ? { label: "À améliorer", badge: "yellow" as const, stroke: "stroke-c-yellow-text" }
        : { label: "Peu optimisé", badge: "red" as const, stroke: "stroke-c-red-text" }
  const size = 140
  const stroke = 11
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <>
      <Card padded className="mt-4 flex flex-col items-center">
        <div role="img" aria-label={`Score ATS : ${score} sur 100, ${tone.label}`} className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="absolute inset-0" aria-hidden>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-idn-surface-2" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - score / 100)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className={tone.stroke}
            />
          </svg>
          <span className="text-[34px] font-semibold text-idn-ink">{score}</span>
          <span className="font-mono text-[11px] tracking-[0.12em] text-idn-muted">SUR 100</span>
        </div>
        <Badge tone={tone.badge} className="mt-3">{tone.label}</Badge>
      </Card>

      {result.breakdown ? (
        <>
          <SectionTitle>Détail</SectionTitle>
          <Card>
            <dl className="divide-y divide-idn-border">
              {Object.entries(result.breakdown).map(([k, v]) => (
                <DetailRow key={k} label={DIMENSIONS[k] ?? k} value={`${v} / 25`} />
              ))}
            </dl>
          </Card>
        </>
      ) : null}

      {result.recommendations && result.recommendations.length > 0 ? (
        <>
          <SectionTitle>Recommandations</SectionTitle>
          <Card padded>
            <ul className="flex flex-col gap-2.5">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-2.5">
                  <Icon name="checkCir" size={18} className="mt-px shrink-0 text-c-green-text" />
                  <span className="flex-1 text-sm leading-5 text-idn-ink">{rec}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
    </>
  )
}

function clampScore(s: unknown): number {
  return typeof s === "number" && Number.isFinite(s) ? Math.max(0, Math.min(100, Math.round(s))) : 0
}
