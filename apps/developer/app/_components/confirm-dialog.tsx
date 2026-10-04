"use client"

import { useState, type ReactNode } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Button } from "@repo/ui/components/button"

/**
 * Confirmation d'une action destructive ou irréversible. La conséquence est
 * écrite en clair ; le bouton reste occupé pendant l'appel serveur.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<boolean | void>
  destructive?: boolean
  children?: ReactNode
}) {
  const [busy, setBusy] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent className="rounded-[14px] border-idn-border bg-idn-surface shadow-none">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold text-idn-ink">{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm leading-6 text-idn-muted">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                const keepOpen = await onConfirm()
                if (keepOpen !== true) onOpenChange(false)
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy ? "Veuillez patienter…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
