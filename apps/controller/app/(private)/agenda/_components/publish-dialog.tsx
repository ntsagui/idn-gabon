"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"

import { describeError } from "../../../_lib/errors"
import { DAY_MS, isoDay, librevilleTimestamp } from "../../../_lib/format"

const DURATIONS = [30, 45, 60] as const

/** Publication d'une plage horaire, découpée côté serveur en créneaux réservables. */
export function PublishDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createAvailability = useMutation(api.level3.scheduling.createAvailability)
  const [day, setDay] = React.useState(() => isoDay(Date.now() + DAY_MS))
  const [start, setStart] = React.useState("09:00")
  const [end, setEnd] = React.useState("12:00")
  const [duration, setDuration] = React.useState<(typeof DURATIONS)[number]>(30)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const startsAt = librevilleTimestamp(day, start)
  const endsAt = librevilleTimestamp(day, end)
  const count =
    Number.isFinite(startsAt) && Number.isFinite(endsAt) && endsAt > startsAt
      ? Math.floor((endsAt - startsAt) / (duration * 60_000))
      : 0

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (count === 0) {
      setError("La plage doit contenir au moins un créneau complet : vérifiez l'heure de fin.")
      return
    }
    setSubmitting(true)
    try {
      const result = await createAvailability({ startsAt, endsAt, durationMinutes: duration })
      toast.success(`${result.created} créneau${result.created > 1 ? "x" : ""} de ${duration} min publié${result.created > 1 ? "s" : ""}.`)
      onOpenChange(false)
    } catch (err) {
      setError(describeError(err, "Impossible de publier cette disponibilité."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Publier une disponibilité</DialogTitle>
            <DialogDescription>
              Heure de Libreville. La plage est découpée en créneaux que les citoyens réservent depuis leur espace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="publish-day">Date</Label>
            <Input id="publish-day" type="date" value={day} min={isoDay(Date.now())} onChange={(e) => setDay(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="publish-start">Début</Label>
              <Input id="publish-start" type="time" step={900} value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="publish-end">Fin</Label>
              <Input id="publish-end" type="time" step={900} value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publish-duration">Durée d&apos;un entretien</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v) as (typeof DURATIONS)[number])}>
              <SelectTrigger id="publish-duration" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="rounded-lg bg-idn-surface-2 px-3 py-2 text-[13px] text-idn-ink-2" aria-live="polite">
            {count > 0
              ? `${count} créneau${count > 1 ? "x" : ""} de ${duration} minutes ${count > 1 ? "seront publiés" : "sera publié"}.`
              : "Aucun créneau complet dans cette plage."}
          </p>
          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || count === 0}>
              {submitting ? "Publication…" : "Publier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
