"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { FunctionReturnType } from "convex/server"
import { useMutation, useQuery } from "convex/react"
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InboxIcon,
  MoreHorizontalIcon,
  VideoIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { pages } from "../../../_content/fr"
import { PageHeader } from "../../../_components/page-header"
import { EmptyState, Panel, Skeleton } from "../../../_components/panel"
import { StatusPill } from "../../../_components/status-pill"
import { describeError } from "../../../_lib/errors"
import {
  DAY_MS,
  formatDate,
  formatTime,
  formatWeekday,
  formatWeekdayShort,
  isoDay,
  relativeTime,
  startOfDay,
  startOfWeek,
  waitingSince,
} from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"
import { AssignDialog } from "./assign-dialog"
import { CancelAppointmentDialog } from "./cancel-appointment-dialog"
import { PublishDialog } from "./publish-dialog"

type Planning = FunctionReturnType<typeof api.controller.agenda.planning>
type Slot = Planning["slots"][number]
type Waiting = Planning["waiting"][number]

const DOC_STATUS: Record<string, string> = {
  pending: "Pièces non envoyées",
  submitted: "Pièces déposées",
  under_review: "Pièces en revue",
  complement_required: "Complément attendu",
  approved: "Pièces approuvées",
  rejected: "Pièces refusées",
  expired: "Pièces expirées",
}

export function Agenda() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const now = useNow()

  const weekParam = params.get("semaine")
  const parsedWeek = weekParam ? Date.parse(`${weekParam}T12:00:00+01:00`) : Number.NaN
  const weekStart = startOfWeek(Number.isFinite(parsedWeek) ? parsedWeek : now)
  const weekEnd = weekStart + 7 * DAY_MS
  const isCurrentWeek = weekStart === startOfWeek(now)

  const planning = useQuery(api.controller.agenda.planning, { from: weekStart, to: weekEnd })
  const cancelSlot = useMutation(api.level3.scheduling.cancelAvailability)

  const [publishOpen, setPublishOpen] = React.useState(false)
  const [assign, setAssign] = React.useState<{ slot?: Slot; request?: Waiting } | null>(null)
  const [cancelAppointment, setCancelAppointment] = React.useState<Slot | null>(null)
  const [removeSlot, setRemoveSlot] = React.useState<Slot | null>(null)
  const [removing, setRemoving] = React.useState(false)

  const goToWeek = (start: number | null) => {
    const sp = new URLSearchParams(params.toString())
    if (start === null) sp.delete("semaine")
    else sp.set("semaine", isoDay(start))
    const qs = sp.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const days = Array.from({ length: 7 }, (_, i) => weekStart + i * DAY_MS)
  const slotsByDay = new Map<number, Slot[]>()
  for (const slot of planning?.slots ?? []) {
    const day = startOfDay(slot.startsAt)
    slotsByDay.set(day, [...(slotsByDay.get(day) ?? []), slot])
  }
  const booked = planning?.slots.filter((s) => s.booking) ?? []
  const free = planning?.slots.filter((s) => s.status === "available" && s.startsAt > now) ?? []

  const onRemoveSlot = async () => {
    if (!removeSlot) return
    setRemoving(true)
    try {
      await cancelSlot({ slotId: removeSlot._id })
      toast.success(`Créneau du ${formatWeekday(removeSlot.startsAt)} à ${formatTime(removeSlot.startsAt)} retiré.`)
      setRemoveSlot(null)
    } catch (error) {
      toast.error(describeError(error, "Impossible de retirer ce créneau."))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <PageHeader
        kicker={pages.agenda.kicker}
        title={pages.agenda.title}
        description={pages.agenda.description}
        actions={
          <Button onClick={() => setPublishOpen(true)}>
            <CalendarPlusIcon aria-hidden />
            Publier une disponibilité
          </Button>
        }
      />
      <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-[15px] font-semibold text-idn-ink">
              Semaine du {formatDate(weekStart)}
              {isCurrentWeek && <span className="ml-2 text-[13px] font-normal text-idn-muted">· semaine en cours</span>}
            </h2>
            <Button variant="outline" size="sm" onClick={() => goToWeek(weekStart - 7 * DAY_MS)} aria-label="Semaine précédente">
              <ChevronLeftIcon aria-hidden />
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToWeek(null)} disabled={isCurrentWeek}>
              Aujourd&apos;hui
            </Button>
            <Button variant="outline" size="sm" onClick={() => goToWeek(weekStart + 7 * DAY_MS)} aria-label="Semaine suivante">
              <ChevronRightIcon aria-hidden />
            </Button>
          </div>

          <ol className="grid grid-cols-7 gap-1.5" aria-label="Résumé de la semaine">
            {days.map((day) => {
              const list = slotsByDay.get(day) ?? []
              const bookedCount = list.filter((s) => s.booking).length
              const today = day === startOfDay(now)
              return (
                <li key={day}>
                  <a
                    href={`#jour-${isoDay(day)}`}
                    className={cn(
                      "block rounded-lg border px-2 py-2 text-center transition-colors duration-150 hover:bg-idn-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      today ? "border-idn-green bg-idn-green-soft/60 dark:bg-[#0F2A18]" : "border-idn-border bg-idn-surface",
                    )}
                  >
                    <span className="block text-xs text-idn-muted first-letter:uppercase">{formatWeekdayShort(day).split(" ")[0]}</span>
                    <span className="block text-base font-semibold tabular-nums text-idn-ink">
                      {new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Libreville", day: "numeric" }).format(day)}
                    </span>
                    <span className="block text-[11px] text-idn-muted">
                      {planning === undefined ? "…" : list.length === 0 ? "—" : `${bookedCount}/${list.length} pris`}
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>

          {planning === undefined ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : planning.slots.length === 0 ? (
            <Panel>
              <EmptyState
                icon={CalendarClockIcon}
                title="Aucun créneau cette semaine"
                action={
                  <Button variant="outline" onClick={() => setPublishOpen(true)}>
                    Publier une disponibilité
                  </Button>
                }
              >
                Publiez une plage horaire : elle est découpée en créneaux que les citoyens réservent depuis leur espace.
              </EmptyState>
            </Panel>
          ) : (
            days
              .filter((day) => (slotsByDay.get(day) ?? []).length > 0)
              .map((day) => (
                <Panel
                  key={day}
                  as="section"
                  className="scroll-mt-4"
                  title={
                    <span id={`jour-${isoDay(day)}`} className="inline-block first-letter:uppercase">
                      {formatWeekday(day)}
                      {day === startOfDay(now) && <span className="ml-2 font-normal normal-case text-idn-muted">· aujourd&apos;hui</span>}
                    </span>
                  }
                >
                  <ul>
                    {(slotsByDay.get(day) ?? []).map((slot) => (
                      <SlotRow
                        key={slot._id}
                        slot={slot}
                        now={now}
                        hasWaiting={(planning.waiting ?? []).some((w) => w.documentsReady)}
                        onAssign={() => setAssign({ slot })}
                        onRemove={() => setRemoveSlot(slot)}
                        onCancelAppointment={() => setCancelAppointment(slot)}
                      />
                    ))}
                  </ul>
                </Panel>
              ))
          )}
        </div>

        <aside className="space-y-4" aria-label="Demandes et synthèse">
          <Panel
            title="Demandes sans rendez-vous"
            description="Demandes Niveau 3 en attente d'un créneau, de la plus ancienne à la plus récente."
          >
            {planning === undefined ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : planning.waiting.length === 0 ? (
              <EmptyState icon={InboxIcon} title="Aucune demande en attente">
                Chaque demande Niveau 3 est déjà planifiée.
              </EmptyState>
            ) : (
              <ul>
                {planning.waiting.map((request) => (
                  <li key={request.verificationId} className="border-b border-idn-border-soft px-4 py-3 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-idn-ink">{request.citizen.name}</p>
                        <p className="truncate font-mono text-xs text-idn-muted">
                          {request.ref}
                          {request.citizen.idnId ? ` · ${request.citizen.idnId}` : ""}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-idn-muted">
                          <StatusPill tone={request.documentsReady ? "blue" : "neutral"}>
                            {request.documentStatus ? DOC_STATUS[request.documentStatus] ?? request.documentStatus : "Aucune pièce"}
                          </StatusPill>
                          <span>{waitingSince(request.requestedAt, now)}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!request.documentsReady}
                        title={request.documentsReady ? undefined : "Les pièces doivent être déposées avant l'entretien"}
                        onClick={() => setAssign({ request })}
                      >
                        Planifier
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Cette semaine">
            <dl className="grid grid-cols-2 gap-4 px-5 py-4">
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-idn-muted">Entretiens</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-idn-ink">{planning ? booked.length : "…"}</dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-idn-muted">Créneaux libres</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-idn-ink">{planning ? free.length : "…"}</dd>
              </div>
            </dl>
            <p className="border-t border-idn-border-soft px-5 py-3 text-xs text-idn-muted">
              La salle d&apos;entretien ouvre 15 minutes avant l&apos;heure prévue et reste accessible 30 minutes après la fin du créneau.
            </p>
          </Panel>
        </aside>
      </div>

      <PublishDialog open={publishOpen} onOpenChange={setPublishOpen} />
      {assign && (
        <AssignDialog
          slot={assign.slot}
          request={assign.request}
          waiting={planning?.waiting ?? []}
          onClose={() => setAssign(null)}
        />
      )}
      {cancelAppointment?.booking && (
        <CancelAppointmentDialog
          verificationId={cancelAppointment.booking.verificationId}
          citizenName={cancelAppointment.booking.citizen.name}
          startsAt={cancelAppointment.startsAt}
          onClose={() => setCancelAppointment(null)}
        />
      )}
      <AlertDialog open={removeSlot !== null} onOpenChange={(open) => !open && !removing && setRemoveSlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ce créneau ?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeSlot &&
                `Le créneau du ${formatWeekday(removeSlot.startsAt)}, ${formatTime(removeSlot.startsAt)} – ${formatTime(removeSlot.endsAt)}, ne sera plus proposé aux citoyens.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Garder</AlertDialogCancel>
            <Button variant="destructive" onClick={onRemoveSlot} disabled={removing}>
              {removing ? "Retrait…" : "Retirer le créneau"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function SlotRow({
  slot,
  now,
  hasWaiting,
  onAssign,
  onRemove,
  onCancelAppointment,
}: {
  slot: Slot
  now: number
  hasWaiting: boolean
  onAssign: () => void
  onRemove: () => void
  onCancelAppointment: () => void
}) {
  const past = slot.endsAt < now
  const booking = slot.booking
  const time = (
    <span className="w-[112px] shrink-0 font-mono text-[13px] tabular-nums text-idn-ink">
      {formatTime(slot.startsAt)} – {formatTime(slot.endsAt)}
    </span>
  )

  if (!booking) {
    return (
      <li className="flex min-h-11 items-center gap-3 border-b border-idn-border-soft px-5 py-2 last:border-b-0">
        {time}
        <span className="flex-1 text-[13px] text-idn-muted">{past ? "Créneau passé, non réservé" : "Libre"}</span>
        {!past && (
          <>
            {hasWaiting && (
              <Button variant="ghost" size="sm" onClick={onAssign}>
                Planifier une demande
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-idn-muted">
              Retirer
            </Button>
          </>
        )}
      </li>
    )
  }

  const decided = booking.status === "approved" || booking.status === "rejected"
  return (
    <li className="flex min-h-11 flex-wrap items-center gap-3 border-b border-idn-border-soft px-5 py-2.5 last:border-b-0">
      {time}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-idn-ink">
          {booking.citizen.name}
          <LoABadge level={booking.citizen.loa} compact />
        </p>
        <p className="font-mono text-xs text-idn-muted">
          {booking.ref}
          {booking.citizen.idnId ? ` · ${booking.citizen.idnId}` : ""}
        </p>
      </div>
      {booking.status === "approved" ? (
        <StatusPill tone="green">Niveau 3 accordé</StatusPill>
      ) : booking.status === "rejected" ? (
        <StatusPill tone="red">Refusé</StatusPill>
      ) : booking.status === "in_interview" ? (
        <StatusPill tone="blue">Entretien en cours</StatusPill>
      ) : booking.canJoin ? (
        <StatusPill tone="green">Salle ouverte</StatusPill>
      ) : past ? (
        <StatusPill tone="yellow">Sans décision</StatusPill>
      ) : (
        <span className="text-xs text-idn-muted">Salle ouverte {relativeTime(booking.joinOpensAt, now)}</span>
      )}
      {!decided && (
        <div className="flex items-center gap-1">
          {booking.canJoin && (
            <Button asChild size="sm">
              <Link href={`/agenda/entretien/${booking.verificationId}`}>
                <VideoIcon aria-hidden />
                Rejoindre
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Actions pour le rendez-vous de ${booking.citizen.name}`}>
                <MoreHorizontalIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/agenda/entretien/${booking.verificationId}`}>Voir le dossier</Link>
              </DropdownMenuItem>
              {booking.status === "claimed" && (
                <DropdownMenuItem variant="destructive" onSelect={onCancelAppointment}>
                  Annuler le rendez-vous
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </li>
  )
}

export type { Slot, Waiting }
