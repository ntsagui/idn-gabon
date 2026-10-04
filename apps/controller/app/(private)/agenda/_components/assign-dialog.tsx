"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Label } from "@repo/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"

import { describeError } from "../../../_lib/errors"
import { DAY_MS, formatTime, formatWeekday } from "../../../_lib/format"
import type { Slot, Waiting } from "./agenda"

/**
 * Planifier une demande sur l'un de vos créneaux libres (citoyen joint par
 * téléphone ou au guichet). Ouvert depuis un créneau ou depuis une demande.
 */
export function AssignDialog({
  slot,
  request,
  waiting,
  onClose,
}: {
  slot?: Slot
  request?: Waiting
  waiting: Waiting[]
  onClose: () => void
}) {
  const assignSlot = useMutation(api.controller.agenda.assignSlot)
  const [from] = React.useState(() => Date.now())
  const upcoming = useQuery(api.controller.agenda.planning, slot ? "skip" : { from, to: from + 60 * DAY_MS })
  const freeSlots = (upcoming?.slots ?? []).filter((s) => s.status === "available" && s.startsAt > from)
  const ready = waiting.filter((w) => w.documentsReady)

  const [slotId, setSlotId] = React.useState<string>(slot?._id ?? "")
  const [verificationId, setVerificationId] = React.useState<string>(request?.verificationId ?? "")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const chosenSlot = slot ?? freeSlots.find((s) => s._id === slotId)
  const chosenRequest = request ?? ready.find((w) => w.verificationId === verificationId)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!chosenSlot || !chosenRequest) {
      setError(slot ? "Choisissez la demande à planifier." : "Choisissez un créneau.")
      return
    }
    setSubmitting(true)
    try {
      await assignSlot({
        verificationId: chosenRequest.verificationId,
        slotId: chosenSlot._id as Id<"level3AppointmentSlot">,
      })
      toast.success(
        `Entretien de ${chosenRequest.citizen.name} planifié le ${formatWeekday(chosenSlot.startsAt)} à ${formatTime(chosenSlot.startsAt)}. Le citoyen est notifié.`,
      )
      onClose()
    } catch (err) {
      setError(describeError(err, "Impossible de planifier cet entretien."))
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Planifier un entretien</DialogTitle>
            <DialogDescription>
              {slot
                ? `Créneau du ${formatWeekday(slot.startsAt)}, ${formatTime(slot.startsAt)} – ${formatTime(slot.endsAt)}.`
                : `Demande ${request?.ref} de ${request?.citizen.name}.`}{" "}
              Le citoyen reçoit la date par notification et e-mail, puis un rappel la veille.
            </DialogDescription>
          </DialogHeader>

          {slot ? (
            <div className="space-y-1.5">
              <Label htmlFor="assign-request">Demande</Label>
              <Select value={verificationId} onValueChange={setVerificationId}>
                <SelectTrigger id="assign-request" className="w-full">
                  <SelectValue placeholder="Choisissez une demande" />
                </SelectTrigger>
                <SelectContent>
                  {ready.map((w) => (
                    <SelectItem key={w.verificationId} value={w.verificationId}>
                      {w.citizen.name} · {w.ref}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="assign-slot">Créneau</Label>
              {upcoming !== undefined && freeSlots.length === 0 ? (
                <p className="rounded-lg bg-idn-surface-2 px-3 py-2 text-[13px] text-idn-ink-2">
                  Vous n&apos;avez aucun créneau libre dans les 60 prochains jours : publiez d&apos;abord une disponibilité.
                </p>
              ) : (
                <Select value={slotId} onValueChange={setSlotId} disabled={upcoming === undefined}>
                  <SelectTrigger id="assign-slot" className="w-full">
                    <SelectValue placeholder={upcoming === undefined ? "Chargement des créneaux…" : "Choisissez un créneau"} />
                  </SelectTrigger>
                  <SelectContent>
                    {freeSlots.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        <span className="inline-block first-letter:uppercase">{formatWeekday(s.startsAt)}</span> · {formatTime(s.startsAt)} – {formatTime(s.endsAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Planification…" : "Planifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
