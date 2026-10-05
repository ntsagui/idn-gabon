"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAction, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"
import { ErrorNote } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { CvField, aiErrorMessage } from "../_components/cv-ui"

type Dialog = { title: string; message: string; then?: () => void }

/** Optimiser pour une offre (apps/mobile/src/app/icv/optimize.tsx) : crée un CV dérivé. */
export default function ICVOptimize() {
  const params = useSearchParams()
  const cvId = params.get("cv") as Id<"citizenCv"> | null
  const router = useRouter()
  const optimizeForJob = useAction(api.cv.ai.optimizeForJob)
  const [offer, setOffer] = React.useState("")
  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [activeJobId, setActiveJobId] = React.useState<Id<"citizenCvAiJob"> | null>(null)
  const [dialog, setDialog] = React.useState<Dialog | null>(null)

  // `optimizeForJob` délègue au pool IA : on suit le job et on ouvre le CV dérivé une fois créé.
  const job = useQuery(api.cv.ai.getLastResult, activeJobId && cvId ? { cvId, feature: "optimize_job" } : "skip")

  React.useEffect(() => {
    if (!activeJobId || !job || job._id !== activeJobId) return
    if (job.status === "completed" && job.derivedCvId) {
      const derived = job.derivedCvId
      setActiveJobId(null)
      setBusy(false)
      setDialog({ title: "CV optimisé créé", message: "Ton nouveau CV adapté à l’offre est prêt.", then: () => router.replace(`/icv?cv=${derived}`) })
    } else if (job.status === "failed") {
      setActiveJobId(null)
      setBusy(false)
      setDialog({ title: "Optimisation impossible", message: job.errorMessage ?? "L’outil IA a échoué. Réessaie dans un instant." })
    }
  }, [activeJobId, job, router])

  async function submit() {
    if (!cvId || busy) return
    const trimmed = offer.trim()
    if (trimmed.length < 30) return setDialog({ title: "Offre trop courte", message: "Colle au moins 30 caractères du texte de l’offre." })
    setBusy(true)
    try {
      const { jobId } = await optimizeForJob({ cvId, jobOfferText: trimmed, newCvName: name.trim() || undefined })
      setActiveJobId(jobId)
    } catch (e) {
      setBusy(false)
      setDialog({ title: "Optimisation impossible", message: aiErrorMessage(e) })
    }
  }

  function closeDialog() {
    const next = dialog?.then
    setDialog(null)
    next?.()
  }

  const header = <AppBar title="Optimiser pour une offre" back="/icv/studio" backIcon="close" />

  if (!cvId) {
    return (
      <Screen header={header}>
        <ErrorNote>Aucun CV sélectionné. Ferme cette fenêtre et relance l’outil depuis le Studio.</ErrorNote>
      </Screen>
    )
  }

  return (
    <Screen
      header={header}
      footer={
        <IdnButton full onClick={submit} loading={busy}>
          {busy ? "Optimisation en cours…" : "Créer le CV optimisé"}
        </IdnButton>
      }
    >
      {busy ? (
        <div className="mt-8 flex flex-col items-center text-center" aria-live="polite">
          <IdnLottie name="loader" size={80} loop label="Optimisation en cours" />
          <p className="mt-3 text-sm text-idn-muted">L’IA adapte ton CV à l’offre. Tu peux patienter ici, le nouveau CV s’ouvrira tout seul.</p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm leading-5 text-idn-muted">L’IA crée un nouveau CV adapté à l’offre. Ton CV actuel n’est pas modifié.</p>
          <CvField
            label="Texte de l’offre"
            value={offer}
            onChange={setOffer}
            placeholder="Colle ici la description du poste visé…"
            multiline
            minHeight={180}
            maxLength={8000}
            hint={`${offer.length} / 8 000 caractères`}
          />
          <CvField label="Nom du nouveau CV (facultatif)" value={name} onChange={setName} placeholder="Par exemple : CV Chef de projet" maxLength={80} />
        </>
      )}
      <IdnDialog open={!!dialog} onOpenChange={(o) => !o && closeDialog()} title={dialog?.title ?? ""} description={dialog?.message}>
        <div className="mt-5 flex justify-end">
          <IdnButton size="sm" className="min-h-11" onClick={closeDialog}>
            OK
          </IdnButton>
        </div>
      </IdnDialog>
    </Screen>
  )
}
