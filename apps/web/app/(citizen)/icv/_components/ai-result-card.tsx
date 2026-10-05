"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { IconButton } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { Card, ErrorNote, Overline } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"

type Feature = "improve_summary" | "suggest_skills" | "generate_letter"
type SkillLevel = "Débutant" | "Intermédiaire" | "Avancé" | "Expert"

const TITLES: Record<Feature, string> = {
  improve_summary: "Résumé proposé",
  suggest_skills: "Compétences suggérées",
  generate_letter: "Lettre de motivation",
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Card padded className="mt-4">
      <section aria-label={title}>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Badge tone="green" icon="sparkles">Suggestion de l’IA</Badge>
            <h3 className="text-base font-semibold text-idn-ink">{title}</h3>
          </div>
          <IconButton icon="close" label="Fermer la suggestion" onClick={onClose} size={36} />
        </div>
        <div className="mt-3">{children}</div>
      </section>
    </Card>
  )
}

/**
 * Résultat d'un outil IA (apps/mobile/src/components/cv/ai-result-card.tsx) :
 * lit le dernier job (`cv.ai.getLastResult`) et propose l'action adaptée
 * (remplacer le résumé, ajouter une compétence, copier la lettre).
 */
export function AiResultCard({
  cvId,
  feature,
  currentSummary,
  onClose,
}: {
  cvId: Id<"citizenCv">
  feature: Feature
  currentSummary?: string
  onClose: () => void
}) {
  const job = useQuery(api.cv.ai.getLastResult, { cvId, feature })
  const upsert = useMutation(api.cv.profile.upsert)
  const addSkill = useMutation(api.cv.skills.add)
  const [busy, setBusy] = React.useState(false)
  const [added, setAdded] = React.useState<string[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  if (job && (job.status === "queued" || job.status === "running")) {
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        <div className="flex items-center gap-3" aria-live="polite">
          <IdnLottie name="loader" size={40} loop label="Rédaction en cours" />
          <p className="flex-1 text-sm text-idn-muted">Rédaction en cours…</p>
        </div>
      </Shell>
    )
  }

  if (job && job.status === "failed") {
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        <ErrorNote className="mt-0">{job.errorMessage || "L’outil IA a échoué. Réessaie dans un instant."}</ErrorNote>
      </Shell>
    )
  }

  if (!job || job.status !== "completed" || !job.result) return null
  const result = job.result as Record<string, unknown>

  if (feature === "improve_summary") {
    const rewritten = (result.rewrittenSummary as string | undefined) ?? ""
    const accept = async () => {
      if (busy) return
      setBusy(true)
      setError(null)
      try {
        await upsert({ cvId, patch: { summary: rewritten } })
        onClose()
      } catch (e) {
        setError(e instanceof Error && e.message ? cleanError(e.message) : "Réessaie dans un instant.")
      } finally {
        setBusy(false)
      }
    }
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        {currentSummary ? (
          <div className="mb-2.5 rounded-[10px] bg-idn-surface-2 p-3">
            <Overline>Actuel</Overline>
            <p className="mt-1 text-[13px] leading-[19px] text-idn-ink-2">{currentSummary}</p>
          </div>
        ) : null}
        <p className="text-sm leading-[21px] text-idn-ink">{rewritten}</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <IdnButton size="sm" onClick={accept} loading={busy}>Remplacer mon résumé</IdnButton>
          <IdnButton size="sm" variant="ghost" onClick={onClose} disabled={busy}>Ignorer</IdnButton>
        </div>
      </Shell>
    )
  }

  if (feature === "suggest_skills") {
    const suggestions = (result.suggestions as { name: string; level: SkillLevel; rationale: string }[] | undefined) ?? []
    const add = async (name: string, level: SkillLevel) => {
      if (busy) return
      setBusy(true)
      setError(null)
      try {
        await addSkill({ cvId, data: { name, level } })
        setAdded((a) => [...a, name])
      } catch (e) {
        setError(e instanceof Error && e.message ? cleanError(e.message) : "Réessaie dans un instant.")
      } finally {
        setBusy(false)
      }
    }
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        {suggestions.length === 0 ? (
          <p className="text-sm text-idn-muted">Aucune suggestion : ton CV couvre déjà les compétences principales.</p>
        ) : (
          <ul className="divide-y divide-idn-border">
            {suggestions.map((s, i) => {
              const done = added.includes(s.name)
              return (
                <li key={i} className="flex items-center gap-2.5 py-3 first:pt-0">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-idn-ink">{s.name}</span>
                      <Badge tone="neutral">{s.level}</Badge>
                    </div>
                    <p className="text-[13px] leading-[18px] text-idn-muted">{s.rationale}</p>
                  </div>
                  {done ? (
                    <Badge tone="green" icon="check">Ajoutée</Badge>
                  ) : (
                    <IdnButton size="sm" variant="secondary" onClick={() => add(s.name, s.level)} disabled={busy} aria-label={`Ajouter ${s.name}`}>
                      Ajouter
                    </IdnButton>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <ErrorNote>{error}</ErrorNote>
      </Shell>
    )
  }

  const letter = (result.letter as string | undefined) ?? ""
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter)
      setCopied(true)
    } catch {
      setError("Copie impossible : sélectionne le texte et copie-le à la main.")
    }
  }
  return (
    <Shell title={TITLES[feature]} onClose={onClose}>
      <div tabIndex={0} aria-label="Texte de la lettre" className="max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-[10px] text-sm leading-[21px] text-idn-ink outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {letter}
      </div>
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <IdnButton size="sm" variant="secondary" onClick={copy}>Copier la lettre</IdnButton>
        {copied ? (
          <p role="status" className="text-[13px] text-c-green-text">
            Lettre copiée. Tu peux la coller dans ton e-mail ou ton traitement de texte.
          </p>
        ) : null}
      </div>
    </Shell>
  )
}
