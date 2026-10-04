"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { ArrowRight } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { EmptyState } from "../../_components/empty-state"
import { LoginChart } from "../../_components/login-chart"
import { PageBody, PageHeader } from "../../_components/page-header"
import { Panel } from "../../_components/panel"
import { PersonCell } from "../../_components/person"
import { PanelSkeleton, Skeleton } from "../../_components/skeleton"
import { StatTile } from "../../_components/stat-tile"
import { StatusPill } from "../../_components/status-pill"
import { useNow } from "../../_lib/use-now"
import { fmtNumber, personLabel, plural, relativeTime } from "../../_lib/format"
import { eventLabel, eventTone } from "../../_lib/labels"

const PERIODS = [
  { days: 7, label: "7 jours" },
  { days: 30, label: "30 jours" },
] as const

function deltaLabel(current: number, previous: number): string {
  if (previous === 0) {
    return current === 0 ? "Aucune la veille non plus" : "Aucune la veille"
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return "Stable par rapport à la veille"
  return `${pct > 0 ? "+" : ""}${pct} % par rapport à la veille`
}

export default function DashboardPage() {
  const [days, setDays] = useState<7 | 30>(30)
  const tzOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), [])
  const now = useNow(30_000)

  const kpis = useQuery(api.admin.dashboard.getDashboardKpis, {})
  const registry = useQuery(api.admin.directory.countAccounts, {})
  const logins = useQuery(api.admin.overview.loginActivity, {
    days,
    tzOffsetMinutes,
  })
  const apps = useQuery(api.admin.oauthApps.listApps, { limit: 500 })
  const openFlags = useQuery(api.duplicates.queries.openFlagCount, {})
  const duplicateGroups = useQuery(api.admin.duplicates.duplicateGroupCount, {})
  const codes = useQuery(api.admin.overview.activeRecoveryCodes, {})
  const recent = useQuery(api.admin.auditExplorer.listEvents, { limit: 8 })

  const activeApps = apps?.filter((a) => !a.disabled).length
  const pendingApps = apps?.filter((a) => a.status === "pending").length
  const kycQueue = kpis ? kpis.kyc.submitted + kpis.kyc.underReview : undefined
  const liveCodes = codes?.filter((c) => c.expiresAt > now)

  return (
    <>
      <PageHeader
        kicker="Pilotage"
        title="Tableau de bord"
        description="État du registre, activité de connexion et files à traiter."
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {registry === undefined ? (
            <PanelSkeleton />
          ) : (
            <StatTile
              label="Comptes IDN"
              value={fmtNumber(registry.total)}
              context={`${fmtNumber(registry.byLoa.loa2 + registry.byLoa.loa3)} vérifiés en Niveau 2 ou 3`}
              href="/users"
            />
          )}
          {logins === undefined ? (
            <PanelSkeleton />
          ) : (
            <StatTile
              label="Connexions · 24 h"
              value={fmtNumber(logins.last24h)}
              context={deltaLabel(logins.last24h, logins.previous24h)}
              href="/logs?type=auth"
            />
          )}
          {activeApps === undefined ? (
            <PanelSkeleton />
          ) : (
            <StatTile
              label="Applications actives"
              value={fmtNumber(activeApps)}
              context={
                pendingApps
                  ? `${plural(pendingApps, "demande", "demandes")} en attente de revue`
                  : "Aucune demande en attente"
              }
              href="/apps"
            />
          )}
          {kycQueue === undefined ? (
            <PanelSkeleton />
          ) : (
            <StatTile
              label="Dossiers KYC en attente"
              value={fmtNumber(kycQueue)}
              context="File des contrôleurs d'identité"
            />
          )}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            id="logins"
            title="Connexions réussies par jour"
            description={
              logins
                ? `${fmtNumber(logins.buckets.reduce((s, b) => s + b.count, 0))} sur ${days} jours, selon votre fuseau horaire`
                : `${days} derniers jours`
            }
            actions={
              <div role="group" aria-label="Période" className="flex rounded-md border border-idn-border p-0.5">
                {PERIODS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    aria-pressed={days === p.days}
                    onClick={() => setDays(p.days)}
                    className={cn(
                      "h-7 rounded px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                      days === p.days
                        ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                        : "text-idn-muted hover:text-idn-ink",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            }
          >
            {logins === undefined ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <LoginChart buckets={logins.buckets} />
            )}
          </Panel>

          <Panel id="loa" title="Répartition par niveau de garantie" description="Tous les comptes du registre">
            {registry === undefined ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <LoaDistribution byLoa={registry.byLoa} />
            )}
          </Panel>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Panel id="queues" title="À traiter" bodyClassName="p-0">
            <ul className="divide-y divide-idn-border-soft">
              <QueueLink
                href="/apps?statut=pending"
                label="Demandes de passage en production"
                count={pendingApps}
              />
              <QueueLink
                href="/users?vue=doublons"
                label="Signalements de doublon à arbitrer"
                count={openFlags}
              />
              <QueueLink
                href="/users?vue=doublons"
                label="Identités portées par plusieurs comptes"
                count={duplicateGroups}
              />
            </ul>
            <div className="border-t border-idn-border-soft px-5 py-4">
              <h3 className="text-[13px] font-semibold text-idn-ink">
                Codes provisoires en cours de validité
              </h3>
              <p className="mt-0.5 text-xs text-idn-muted">
                Remis par un agent après vérification d&apos;identité. Un code
                peut déjà avoir été utilisé.
              </p>
              {liveCodes === undefined ? (
                <Skeleton className="mt-3 h-8 w-full" />
              ) : liveCodes.length === 0 ? (
                <p className="mt-3 text-[13px] text-idn-muted">Aucun code en cours.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
                  {liveCodes.map((c) => (
                    <li key={c._id} className="flex items-center justify-between gap-3">
                      <PersonCell person={c.account} />
                      <span className="shrink-0 text-right text-xs text-idn-muted">
                        {c.kind === "pin" ? "PIN" : "Mot de passe"}
                        <span className="block">expire {relativeTime(c.expiresAt, now)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <Panel
            id="recent"
            title="Activité récente"
            actions={
              <Link
                href="/logs"
                className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-idn-green outline-none hover:underline focus-visible:ring-2 focus-visible:ring-idn-green dark:text-idn-green-on-dark"
              >
                Journal complet
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {recent === undefined ? (
              <div className="space-y-3 p-5">
                <Skeleton className="w-full" />
                <Skeleton className="w-3/4" />
                <Skeleton className="w-5/6" />
              </div>
            ) : recent.rows.length === 0 ? (
              <EmptyState
                title="Aucun événement journalisé"
                description="Les connexions, décisions KYC et actions d'administration apparaîtront ici."
              />
            ) : (
              <ul className="divide-y divide-idn-border-soft">
                {recent.rows.map((e) => (
                  <li key={e._id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[13px] font-medium text-idn-ink">
                        {eventTone(e.action) !== "neutral" ? (
                          <StatusPill tone={eventTone(e.action)} className="h-5 px-2 text-[11px]">
                            {eventTone(e.action) === "red" ? "Échec" : "Attention"}
                          </StatusPill>
                        ) : null}
                        <span className="truncate">{eventLabel(e.action, e.metadata)}</span>
                      </p>
                      <p className="truncate text-xs text-idn-muted">
                        {e.target.person && e.target.person.userId !== e.actor?.userId
                          ? `Compte : ${personLabel(e.target.person)}`
                          : e.target.appName
                            ? `Application : ${e.target.appName}`
                            : null}
                      </p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <PersonCell person={e.actor} />
                    </div>
                    <time
                      dateTime={new Date(e.createdAt).toISOString()}
                      className="whitespace-nowrap text-right text-xs text-idn-muted"
                    >
                      {relativeTime(e.createdAt, now)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  )
}

function QueueLink({
  href,
  label,
  count,
}: {
  href: string
  label: string
  count: number | undefined
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-12 items-center justify-between gap-3 px-5 text-[13px] text-idn-ink outline-none transition-colors hover:bg-idn-surface-2 focus-visible:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-idn-green"
      >
        <span>{label}</span>
        <span className="flex items-center gap-2">
          {count === undefined ? (
            <Skeleton className="h-4 w-6" />
          ) : (
            <span
              className={cn(
                "rounded-full px-2 font-mono text-xs leading-5 tabular-nums",
                count > 0
                  ? "bg-idn-yellow-soft text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]"
                  : "bg-idn-surface-2 text-idn-muted",
              )}
            >
              {fmtNumber(count)}
            </span>
          )}
          <ArrowRight aria-hidden className="size-4 text-idn-muted" />
        </span>
      </Link>
    </li>
  )
}

function LoaDistribution({
  byLoa,
}: {
  byLoa: { loa1: number; loa2: number; loa3: number }
}) {
  const rows = [
    { level: 1 as const, value: byLoa.loa1, bar: "bg-loa-1" },
    { level: 2 as const, value: byLoa.loa2, bar: "bg-idn-blue" },
    { level: 3 as const, value: byLoa.loa3, bar: "bg-idn-green" },
  ]
  const sum = rows.reduce((s, r) => s + r.value, 0)
  if (sum === 0) {
    return <p className="text-[13px] text-idn-muted">Aucun compte dans le registre.</p>
  }
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const pct = Math.round((r.value / sum) * 100)
        return (
          <li key={r.level}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <LoABadge level={r.level} compact />
              <span className="text-[13px] text-idn-ink tabular-nums">
                <span className="font-mono font-semibold">{fmtNumber(r.value)}</span>
                <span className="text-idn-muted"> · {pct} %</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-idn-surface-2" aria-hidden>
              <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${pct}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
