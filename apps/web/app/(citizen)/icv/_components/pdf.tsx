"use client"

import * as React from "react"
import { useAction } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"

function pdfErrorMessage(e: unknown): string {
  const msg = (e as Error)?.message ?? ""
  return msg.includes("cvExport") || msg.includes("RATE_LIMIT")
    ? "Tu as atteint la limite d’exports pour aujourd’hui. Réessaie demain."
    : "La génération du PDF a échoué. Réessaie dans un instant."
}

function safeFileName(name: string | undefined) {
  const base = (name ?? "CV").replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "-")
  return `${base || "CV"}.pdf`
}

/** Le navigateur sait-il partager un fichier (feuille de partage du système) ? */
export function useCanShareFiles() {
  const [can, setCan] = React.useState(false)
  React.useEffect(() => {
    try {
      const probe = new File([new Blob(["%PDF"], { type: "application/pdf" })], "cv.pdf", { type: "application/pdf" })
      setCan(typeof navigator.share === "function" && !!navigator.canShare?.({ files: [probe] }))
    } catch {
      setCan(false)
    }
  }, [])
  return can
}

/**
 * Export PDF du CV via `cv.export.renderPdf` (URL signée du stockage Convex),
 * transposition de apps/mobile/src/components/cv/pdf-button.tsx :
 * - `open` : ouvre le PDF dans un nouvel onglet ;
 * - `share` : partage le fichier par la feuille de partage du système quand le
 *   navigateur le permet, sinon le télécharge.
 */
export function useCvPdf(cvId: Id<"citizenCv"> | null | undefined, fileName?: string) {
  const renderPdf = useAction(api.cv.export.renderPdf)
  const [pending, setPending] = React.useState<"open" | "share" | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function open() {
    if (!cvId || pending) return
    // Onglet ouvert pendant le geste de l'utilisateur : sinon le bloqueur de fenêtres l'interdit.
    const tab = window.open("", "_blank")
    setPending("open")
    try {
      const { url } = await renderPdf({ cvId })
      if (tab) tab.location.href = url
      else window.location.assign(url)
    } catch (e) {
      tab?.close()
      setError(pdfErrorMessage(e))
    } finally {
      setPending(null)
    }
  }

  async function share() {
    if (!cvId || pending) return
    setPending("share")
    try {
      const { url } = await renderPdf({ cvId })
      const res = await fetch(url)
      if (!res.ok) throw new Error(`PDF ${res.status}`)
      const blob = await res.blob()
      const file = new File([blob], safeFileName(fileName), { type: "application/pdf" })
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Partager mon CV" })
          return
        } catch (e) {
          if ((e as Error).name === "AbortError") return
          // Partage refusé par le navigateur : on retombe sur le téléchargement.
        }
      }
      const href = URL.createObjectURL(file)
      const a = document.createElement("a")
      a.href = href
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(href), 10_000)
    } catch (e) {
      setError(pdfErrorMessage(e))
    } finally {
      setPending(null)
    }
  }

  const errorDialog = (
    <IdnDialog open={!!error} onOpenChange={(o) => !o && setError(null)} title="PDF indisponible" description={error ?? undefined}>
      <div className="mt-5 flex justify-end">
        <IdnButton size="sm" className="min-h-11" onClick={() => setError(null)}>
          OK
        </IdnButton>
      </div>
    </IdnDialog>
  )

  return { pending, open, share, errorDialog }
}

/** Bouton icône « Ouvrir le PDF » pour la barre d'application. */
export function PdfButton({ cvId, fileName }: { cvId: Id<"citizenCv">; fileName?: string }) {
  const { pending, open, errorDialog } = useCvPdf(cvId, fileName)
  return (
    <>
      <IconButton
        icon={pending ? "clock" : "download"}
        label={pending ? "Préparation du PDF" : "Ouvrir le PDF"}
        onClick={() => void open()}
        className={pending ? "text-idn-muted" : undefined}
      />
      {errorDialog}
    </>
  )
}
