"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"
import { Textarea } from "@repo/ui/components/textarea"

import { describeError } from "../../../_lib/errors"
import { formatTime, formatWeekday } from "../../../_lib/format"
import { CANCEL_REASONS, composeReason, OTHER_REASON } from "./reasons"

export function CancelAppointmentDialog({
  verificationId,
  citizenName,
  startsAt,
  onClose,
}: {
  verificationId: Id<"level3Verification">
  citizenName: string
  startsAt: number
  onClose: () => void
}) {
  const cancel = useMutation(api.controller.agenda.cancelAppointment)
  const [reason, setReason] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const composed = composeReason(CANCEL_REASONS, reason, details)
    if ("error" in composed) {
      setError(composed.error)
      return
    }
    setSubmitting(true)
    try {
      await cancel({ verificationId, reason: composed.message })
      toast.success(`Rendez-vous de ${citizenName} annulé. La demande revient en attente de créneau.`)
      onClose()
    } catch (err) {
      setError(describeError(err, "Impossible d'annuler ce rendez-vous."))
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !submitting && onClose()}>
      <AlertDialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler le rendez-vous de {citizenName} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Entretien du {formatWeekday(startsAt)} à {formatTime(startsAt)}. Le créneau est retiré de votre agenda, la demande
              revient en attente et le citoyen reçoit le motif pour choisir un autre créneau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motif</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="cancel-reason" className="w-full" aria-required="true">
                <SelectValue placeholder="Choisissez un motif" />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-details">{reason === OTHER_REASON ? "Précisions (obligatoires)" : "Précisions (facultatives)"}</Label>
            <Textarea id="cancel-details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Garder le rendez-vous
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Annulation…" : "Annuler le rendez-vous"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
