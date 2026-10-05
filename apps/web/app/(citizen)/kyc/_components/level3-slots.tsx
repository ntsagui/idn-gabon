"use client"

import * as React from "react"

import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { Card, Overline, ScreenTitle } from "@/app/_components/idn/list"
import { slotsByDay } from "@/lib/citizen/level3-view"

export type AvailableSlot = { _id: Id<"level3AppointmentSlot">; startsAt: number; endsAt: number; controllerName: string }

const TZ = "Africa/Libreville"
const WEEKDAY = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short" })
const DAYNUM = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric" })
const LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" })
const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })

export function slotSummary(slot: AvailableSlot): string {
  const d = LONG.format(slot.startsAt)
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} à ${TIME.format(slot.startsAt)}`
}

/** Choix du créneau (prototype « l3-slot ») : jours puis horaires disponibles. */
export function Level3Slots({
  slots,
  selected,
  onSelect,
}: {
  slots: AvailableSlot[] | undefined
  selected: AvailableSlot | null
  onSelect: (s: AvailableSlot) => void
}) {
  const days = React.useMemo(() => slotsByDay(slots ?? []), [slots])
  const [day, setDay] = React.useState<string | null>(null)
  const activeDay = days.find((d) => d.day === day) ?? days[0]
  const durations = [...new Set((slots ?? []).map((s) => Math.round((s.endsAt - s.startsAt) / 60_000)))]

  return (
    <>
      <ScreenTitle
        title="Quand es-tu disponible ?"
        lead={`Entretien de ${durations.length === 1 ? `${durations[0]} min` : "quelques minutes"} · heure de Libreville`}
      />
      {slots === undefined ? (
        <p className="mt-6 text-sm text-idn-muted">Chargement des créneaux…</p>
      ) : days.length === 0 ? (
        <Card padded className="mt-6">
          <p className="text-sm font-semibold text-idn-ink">Aucun créneau disponible pour le moment</p>
          <p className="mt-1 text-[13px] leading-[19px] text-idn-muted">
            Les contrôleurs publient régulièrement de nouveaux créneaux. Ta demande reste ouverte : reviens plus tard ou active les notifications.
          </p>
        </Card>
      ) : (
        <>
          <div role="group" aria-label="Jour" className="mt-5 flex flex-wrap gap-1.5">
            {days.slice(0, 14).map((d) => {
              const sel = d.day === activeDay?.day
              const ts = d.slots[0]!.startsAt
              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setDay(d.day)}
                  aria-pressed={sel}
                  aria-label={LONG.format(ts)}
                  className={cn(
                    "flex w-[46px] flex-col items-center rounded-[10px] border py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    sel ? "border-idn-green bg-idn-green" : "border-idn-border bg-idn-surface hover:bg-idn-surface-2"
                  )}
                >
                  <span className={cn("text-[11px]", sel ? "text-[#D9EADF]" : "text-idn-muted")}>{WEEKDAY.format(ts)}</span>
                  <span className={cn("text-[17px] font-semibold", sel ? "text-white" : "text-idn-ink")}>{DAYNUM.format(ts)}</span>
                </button>
              )
            })}
          </div>
          {activeDay ? (
            <>
              <Overline className="mb-2.5 mt-5">{LONG.format(activeDay.slots[0]!.startsAt)}</Overline>
              <div role="group" aria-label="Horaire" className="-mx-1 flex flex-wrap">
                {activeDay.slots.map((s) => {
                  const sel = selected?._id === s._id
                  return (
                    <div key={s._id} className="w-1/3 p-1 sm:w-1/4">
                      <button
                        type="button"
                        onClick={() => onSelect(s)}
                        aria-pressed={sel}
                        aria-label={`${TIME.format(s.startsAt)}, avec ${s.controllerName}`}
                        className={cn(
                          "flex h-11 w-full items-center justify-center rounded-[10px] text-[15px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          sel
                            ? "border-2 border-idn-green bg-c-green-badge font-semibold text-c-green-text"
                            : "border border-idn-border bg-idn-surface text-idn-ink hover:bg-idn-surface-2"
                        )}
                      >
                        {TIME.format(s.startsAt)}
                      </button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}
        </>
      )}
    </>
  )
}
