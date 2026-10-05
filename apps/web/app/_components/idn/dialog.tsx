"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@repo/ui/components/dialog"

import { IdnButton } from "./button"
import { ErrorNote } from "./list"

/**
 * Fenêtre de la charte : rayon 20, bordure 1 px, aucune ombre (ADR-0008).
 * Sur téléphone elle s'ancre en bas comme une feuille.
 */
export function IdnDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  closable = true,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  closable?: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={closable}
        onInteractOutside={closable ? undefined : (e) => e.preventDefault()}
        onEscapeKeyDown={closable ? undefined : (e) => e.preventDefault()}
        className="top-auto bottom-0 max-h-[92svh] max-w-full translate-y-0 gap-0 overflow-y-auto rounded-b-none rounded-t-[20px] border-idn-border bg-idn-bg p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-none sm:top-1/2 sm:bottom-auto sm:max-w-md sm:-translate-y-1/2 sm:rounded-[20px] sm:pb-5"
      >
        <DialogTitle className="pr-8 text-lg font-semibold leading-6 text-idn-ink">{title}</DialogTitle>
        {description ? (
          <DialogDescription className="mt-1.5 text-sm leading-5 text-idn-muted">{description}</DialogDescription>
        ) : (
          <DialogDescription className="sr-only">{typeof title === "string" ? title : ""}</DialogDescription>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Confirmation d'une action (équivalent web des `Alert.alert` du mobile) :
 * même titre, même texte, mêmes libellés de boutons. L'erreur éventuelle
 * s'affiche dans la fenêtre, qui reste ouverte.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive,
  onConfirm,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => Promise<void> | void
  children?: React.ReactNode
}) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  React.useEffect(() => {
    if (open) setError(null)
  }, [open])
  return (
    <IdnDialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)} title={title} description={description}>
      {children}
      <ErrorNote>{error}</ErrorNote>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <IdnButton variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={busy} className="min-h-11">
          {cancelLabel}
        </IdnButton>
        <IdnButton
          variant={destructive ? "danger" : "primary"}
          size="sm"
          loading={busy}
          className="min-h-11"
          onClick={async () => {
            setBusy(true)
            setError(null)
            try {
              await onConfirm()
              onOpenChange(false)
            } catch (e) {
              setError(e instanceof Error && e.message ? cleanError(e.message) : "Action impossible. Réessaie.")
            } finally {
              setBusy(false)
            }
          }}
        >
          {confirmLabel}
        </IdnButton>
      </div>
    </IdnDialog>
  )
}

/** Retire l'enveloppe technique des erreurs Convex (« [CONVEX M(...)] Uncaught Error: … »). */
export function cleanError(message: string): string {
  const m = message.match(/Uncaught (?:Convex)?Error:\s*([\s\S]*?)(?:\n\s+at |\n\s*Called by client|$)/)
  // Les actions doublent parfois l'enveloppe (« Uncaught ConvexError: Uncaught ConvexError: … »).
  const text = (m?.[1] ?? message).trim().replace(/^(?:Uncaught (?:Convex)?Error:\s*)+/, "")
  // ConvexError({ code, message }) : le texte est la charge JSON, on n'en garde que le message.
  if (text.startsWith("{")) {
    try {
      const data = JSON.parse(text) as { message?: unknown }
      if (typeof data.message === "string") return data.message
    } catch {
      // Pas du JSON : on rend le texte tel quel.
    }
  }
  return text
}
