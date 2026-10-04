"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  FileSignatureIcon,
  HistoryIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  VideoIcon,
} from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { pages } from "../../_content/fr"
import { PageHeader } from "../../_components/page-header"
import { EmptyState, Panel, Skeleton, StatTile } from "../../_components/panel"
import { StatusPill } from "../../_components/status-pill"
import {
  formatNumber,
  formatTime,
  formatWeekday,
  formatWeekdayShort,
  relativeTime,
  startOfDay,
  waitingSince,
} from "../../_lib/format"
import { useNow } from "../../_lib/use-now"

const AGE_ROWS = [
  { key: "under1d", label: "Moins d'1 jour" },
  { key: "d1to3", label: "1 à 3 jours" },
  { key: "d3to7", label: "3 à 7 jours" },
  { key: "over7d", label: "Plus de 7 jours" },
] as const

export function Dashboard() {
  const summary = useQuery(api.controller.dashboard.summary, {})
  const now = useNow()

  const decisionsTotal = summary
    ? summary.activity.last30d.approved + summary.activity.last30d.complement + summary.activity.last30d.rejected
    : 0

  return (
    <>
      <PageHeader
        kicker={`${pages.dashboard.kicker} · ${formatWeekday(now).toUpperCase()}`}
        title={pages.dashboard.title}
        description={pages.dashboard.description}
        actions={
          summary?.queue.next ? (
            <Button asChild>
              <Link href={`/queue?id=${summary.queue.next.kycRequestId}`}>
                Examiner le plus ancien dossier
                <ArrowRightIcon aria-hidden />
              </Link>
            </Button>
          ) : null
        }
      />
      <div className="space-y-6 px-5 py-6 md:px-8">
        <section aria-label="Charge du jour" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary === undefined ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[118px] rounded-xl" />)
          ) : (
            <>
              <StatTile
                label="Dossiers à examiner"
                value={`${formatNumber(summary.queue.toReview)}${summary.queue.capped ? "+" : ""}`}
                context={
                  summary.queue.oldestSubmittedAt
                    ? `Le plus ancien attend ${waitingSince(summary.queue.oldestSubmittedAt, now)}`
                    : "Aucun dossier en attente"
                }
              />
              <StatTile
                label="Entretiens aujourd'hui"
                value={formatNumber(summary.level3.appointmentsToday)}
                context={(() => {
                  const next = summary.level3.upcoming.find((a) => a.scheduledEndAt > now)
                  if (!next) return "Aucun entretien à venir"
                  return startOfDay(next.scheduledAt) === startOfDay(now)
                    ? `Prochain à ${formatTime(next.scheduledAt)}`
                    : `Prochain le ${formatWeekdayShort(next.scheduledAt)}`
                })()}
              />
              <StatTile
                label="Décisions aujourd'hui"
                value={formatNumber(summary.activity.today.kycDecisions + summary.activity.today.interviews)}
                context={`${formatNumber(summary.activity.today.identityChecks)} contrôle${summary.activity.today.identityChecks > 1 ? "s" : ""} terrain · ${formatNumber(summary.activity.today.signatureChecks)} acte${summary.activity.today.signatureChecks > 1 ? "s" : ""} vérifié${summary.activity.today.signatureChecks > 1 ? "s" : ""}`}
              />
              {decisionsTotal > 0 ? (
                <StatTile
                  label="Taux d'approbation · 30 j"
                  value={`${Math.round((summary.activity.last30d.approved / decisionsTotal) * 100)} %`}
                  context={`${summary.activity.last30d.approved} approuvé${summary.activity.last30d.approved > 1 ? "s" : ""} · ${summary.activity.last30d.complement} complément${summary.activity.last30d.complement > 1 ? "s" : ""} · ${summary.activity.last30d.rejected} refus`}
                />
              ) : (
                <StatTile
                  label="Compléments en attente"
                  value={formatNumber(summary.queue.complementRequired)}
                  context="Dossiers attendant un renvoi du citoyen"
                />
              )}
            </>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Panel
            title="Dossiers en attente par ancienneté"
            description="Délai depuis le dépôt des pièces. Au-delà de 7 jours, le délai de traitement est dépassé."
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/queue">Ouvrir la file</Link>
              </Button>
            }
          >
            {summary === undefined ? (
              <div className="space-y-3 p-5">
                {AGE_ROWS.map((row) => (
                  <Skeleton key={row.key} className="h-6" />
                ))}
              </div>
            ) : summary.queue.toReview === 0 ? (
              <EmptyState icon={ShieldCheckIcon} title="File à jour">
                Aucun dossier n&apos;attend d&apos;examen. Les nouveaux dépôts apparaîtront ici dès leur passage en revue.
              </EmptyState>
            ) : (
              <div className="p-5">
                <ul className="space-y-3">
                  {AGE_ROWS.map((row) => {
                    const value = summary.queue.byAge[row.key]
                    const max = Math.max(...AGE_ROWS.map((r) => summary.queue.byAge[r.key]), 1)
                    return (
                      <li key={row.key} className="grid grid-cols-[120px_1fr_40px] items-center gap-3 text-[13px]">
                        <span className="text-idn-ink-2">{row.label}</span>
                        <span className="h-3 rounded-r bg-idn-surface-2">
                          <span
                            className={cn(
                              "block h-3 rounded-r",
                              row.key === "over7d" ? "bg-[#B3261E]" : row.key === "d3to7" ? "bg-[#9A7400]" : "bg-idn-green",
                            )}
                            style={{ width: `${(value / max) * 100}%` }}
                          />
                        </span>
                        <span className="text-right font-mono tabular-nums text-idn-ink">{value}</span>
                      </li>
                    )
                  })}
                </ul>
                {summary.queue.next && (
                  <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-idn-border-soft bg-idn-surface-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-idn-muted">Prochain dossier (le plus ancien)</p>
                      <p className="truncate text-sm font-medium text-idn-ink">
                        {summary.queue.next.name}{" "}
                        <span className="font-normal text-idn-muted">· {waitingSince(summary.queue.next.submittedAt, now)}</span>
                      </p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/queue?id=${summary.queue.next.kycRequestId}`}>Examiner</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            title="Prochains entretiens"
            description="La salle ouvre 15 minutes avant l'heure du rendez-vous."
            actions={
              <Button asChild variant="outline" size="sm">
                <Link href="/agenda">Agenda</Link>
              </Button>
            }
          >
            {summary === undefined ? (
              <div className="space-y-3 p-5">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : summary.level3.upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarDaysIcon}
                title="Aucun entretien planifié"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href="/agenda">Publier des disponibilités</Link>
                  </Button>
                }
              >
                {summary.level3.waitingForSlot > 0
                  ? `${summary.level3.waitingForSlot} demande${summary.level3.waitingForSlot > 1 ? "s" : ""} Niveau 3 attend${summary.level3.waitingForSlot > 1 ? "ent" : ""} un créneau.`
                  : "Les citoyens réservent leur entretien sur vos créneaux publiés."}
              </EmptyState>
            ) : (
              <ul>
                {summary.level3.upcoming.map((appointment) => (
                  <li
                    key={appointment.verificationId}
                    className="flex items-center gap-4 border-b border-idn-border-soft px-5 py-3 last:border-b-0"
                  >
                    <div className="w-[88px] shrink-0">
                      <p className="font-mono text-[13px] tabular-nums text-idn-ink">{formatTime(appointment.scheduledAt)}</p>
                      <p className="text-xs text-idn-muted">
                        {startOfDay(appointment.scheduledAt) === startOfDay(now)
                          ? "Aujourd'hui"
                          : formatWeekdayShort(appointment.scheduledAt)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-idn-ink">{appointment.name}</p>
                      <p className="truncate font-mono text-xs text-idn-muted">
                        {appointment.ref}
                        {appointment.idnId ? ` · ${appointment.idnId}` : ""}
                      </p>
                    </div>
                    {appointment.canJoin ? (
                      <Button asChild size="sm">
                        <Link href={`/agenda/entretien/${appointment.verificationId}`}>
                          <VideoIcon aria-hidden />
                          Rejoindre
                        </Link>
                      </Button>
                    ) : (
                      <StatusPill tone="neutral">{relativeTime(appointment.scheduledAt, now)}</StatusPill>
                    )}
                  </li>
                ))}
                {summary.level3.waitingForSlot > 0 && (
                  <li className="px-5 py-3 text-[13px] text-idn-muted">
                    <Link href="/agenda" className="font-medium text-idn-green-dark hover:underline dark:text-idn-green-on-dark">
                      {summary.level3.waitingForSlot} demande{summary.level3.waitingForSlot > 1 ? "s" : ""} sans rendez-vous
                    </Link>{" "}
                    à planifier.
                  </li>
                )}
              </ul>
            )}
          </Panel>
        </div>

        <section aria-labelledby="raccourcis">
          <h2 id="raccourcis" className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            Raccourcis
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { href: "/queue", icon: ShieldCheckIcon, title: "File de demandes", text: "Examiner et décider" },
              { href: "/scan", icon: QrCodeIcon, title: "Contrôle d'identité", text: "Lire un QR de présentation" },
              { href: "/verify", icon: FileSignatureIcon, title: "Vérifier un acte", text: "Code ou QR d'un acte officiel" },
              { href: "/history", icon: HistoryIcon, title: "Historique", text: "Filtrer et exporter" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-idn-border bg-idn-surface px-4 py-3 transition-colors duration-150 hover:border-idn-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark">
                    <item.icon aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-idn-ink">{item.title}</span>
                    <span className="block text-xs text-idn-muted">{item.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
