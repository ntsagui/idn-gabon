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
import { Label } from "@repo/ui/components/label"
import { Textarea } from "@repo/ui/components/textarea"

/**
 * Confirmation d'une action sensible : la conséquence est écrite en clair,
 * le bouton dit ce qu'il fait. Le motif facultatif est transmis à l'action
 * (et donc à l'audit) quand `reasonLabel` est fourni.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  confirmLabel,
  destructive = false,
  reasonLabel,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  consequence: ReactNode
  confirmLabel: string
  destructive?: boolean
  reasonLabel?: string
  onConfirm: (reason: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState("")

  const close = (next: boolean) => {
    if (busy) return
    if (!next) setReason("")
    onOpenChange(next)
  }

  const confirm = async () => {
    setBusy(true)
    try {
      await onConfirm(reason.trim())
      setReason("")
      onOpenChange(false)
    } catch {
      // Le message d'erreur est affiché par l'appelant (toast) ; la boîte
      // reste ouverte pour permettre de réessayer.
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent className="shadow-none sm:max-w-[480px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-sm text-idn-muted">{consequence}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {reasonLabel ? (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-reason">{reasonLabel}</Label>
            <Textarea
              id="confirm-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "En cours…" : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
