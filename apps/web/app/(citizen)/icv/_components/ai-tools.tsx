"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAction } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"
import type { IconName } from "@/app/_components/idn/icons"
import { Card, Row, SectionTitle, type RowTone } from "@/app/_components/idn/list"

import { aiErrorMessage } from "./cv-ui"

export type AiToolId = "improve_summary" | "suggest_skills" | "optimize_job" | "generate_letter" | "ats_check"

/** Section « Outils IA » (apps/mobile/src/components/cv/ai-tools.tsx), chaque outil branché sur `cv.ai.*`. */
const TOOLS: { id: AiToolId; label: string; desc: string; icon: IconName; tone: RowTone }[] = [
  { id: "improve_summary", label: "Améliorer ton résumé", desc: "Reformulation de ton profil professionnel", icon: "sparkles", tone: "green" },
  { id: "suggest_skills", label: "Suggérer des compétences", desc: "À partir de tes expériences", icon: "star", tone: "blue" },
  { id: "optimize_job", label: "Optimiser pour une offre", desc: "Un nouveau CV adapté au poste visé", icon: "briefcase", tone: "yellow" },
  { id: "generate_letter", label: "Lettre de motivation", desc: "Rédigée à partir de ton CV", icon: "file", tone: "neutral" },
  { id: "ats_check", label: "Score ATS", desc: "Compatibilité avec les logiciels de recrutement", icon: "activity", tone: "neutral" },
]

export function AiTools({ cvId, onResult }: { cvId: Id<"citizenCv">; onResult: (feature: AiToolId) => void }) {
  const router = useRouter()
  const improveSummary = useAction(api.cv.ai.improveSummary)
  const suggestSkills = useAction(api.cv.ai.suggestSkills)
  const atsCheck = useAction(api.cv.ai.atsCheck)
  const generateLetter = useAction(api.cv.ai.generateLetter)
  const [pending, setPending] = React.useState<AiToolId | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function run(tool: AiToolId) {
    if (pending) return
    if (tool === "optimize_job") {
      router.push(`/icv/optimize?cv=${cvId}`)
      return
    }
    setPending(tool)
    try {
      if (tool === "improve_summary") await improveSummary({ cvId })
      else if (tool === "suggest_skills") await suggestSkills({ cvId })
      else if (tool === "ats_check") await atsCheck({ cvId })
      else if (tool === "generate_letter") await generateLetter({ cvId, tone: "formal" })
      onResult(tool)
    } catch (e) {
      setError(aiErrorMessage(e))
    } finally {
      setPending(null)
    }
  }

  return (
    <>
      <SectionTitle>Outils IA</SectionTitle>
      <Card>
        {TOOLS.map((tool) => (
          <Row
            key={tool.id}
            icon={tool.icon}
            tone={tool.tone}
            title={tool.label}
            sub={pending === tool.id ? "Envoi en cours…" : tool.desc}
            onClick={() => void run(tool.id)}
            disabled={pending !== null}
            chevron
          />
        ))}
      </Card>
      <IdnDialog open={!!error} onOpenChange={(o) => !o && setError(null)} title="Outil IA indisponible" description={error ?? undefined}>
        <div className="mt-5 flex justify-end">
          <IdnButton size="sm" className="min-h-11" onClick={() => setError(null)}>
            OK
          </IdnButton>
        </div>
      </IdnDialog>
    </>
  )
}
