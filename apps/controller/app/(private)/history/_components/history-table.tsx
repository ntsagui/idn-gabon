"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { FunctionReturnType } from "convex/server"
import { useQuery } from "convex/react"
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, HistoryIcon, SearchIcon } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"
import { cn } from "@repo/ui/lib/utils"

import { pages } from "../../../_content/fr"
import { PageHeader } from "../../../_components/page-header"
import { EmptyState, Field, Panel, Skeleton } from "../../../_components/panel"
import { StatusPill, type Tone } from "../../../_components/status-pill"
import { DAY_MS, formatDateTime, formatNumber, isoDay, startOfDay } from "../../../_lib/format"
import { downloadText, toCsv } from "./csv"

type Row = FunctionReturnType<typeof api.controller.activity.list>["rows"][number]
type ActivityType = Row["type"]
type Outcome = Row["outcome"]

const TYPES: Record<ActivityType, string> = {
  kyc: "Dossier KYC",
  level3: "Entretien Niveau 3",
  agenda: "Agenda",
  scan: "Contrôle terrain",
  signature: "Vérification d'acte",
}
const OUTCOMES: Record<Outcome, { label: string; tone: Tone }> = {
  approved: { label: "Favorable", tone: "green" },
  complement: { label: "Complément", tone: "yellow" },
  rejected: { label: "Défavorable", tone: "red" },
  info: { label: "Information", tone: "neutral" },
}
const PERIODS = {
  today: "Aujourd'hui",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
  all: "Tout l'historique",
} as const
type Period = keyof typeof PERIODS
const PAGE_SIZE = 25

function periodFrom(period: Period, now: number): number | undefined {
  const today = startOfDay(now)
  switch (period) {
    case "today":
      return today
    case "7d":
      return today - 6 * DAY_MS
    case "30d":
      return today - 29 * DAY_MS
    case "90d":
      return today - 89 * DAY_MS
    default:
      return undefined
  }
}

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

export function HistoryTable() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [mountedAt] = React.useState(() => Date.now())

  const typeParam = params.get("type")
  const type = typeParam && typeParam in TYPES ? (typeParam as ActivityType) : undefined
  const outcomeParam = params.get("issue")
  const outcome = outcomeParam && outcomeParam in OUTCOMES ? (outcomeParam as Outcome) : undefined
  const periodParam = params.get("periode")
  const period: Period = periodParam && periodParam in PERIODS ? (periodParam as Period) : "30d"
  const search = params.get("q") ?? ""
  const order = params.get("tri") === "asc" ? "asc" : "desc"
  const page = Math.max(0, Number.parseInt(params.get("page") ?? "0", 10) || 0)

  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") sp.delete(key)
        else sp.set(key, value)
      }
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const from = periodFrom(period, mountedAt)
  const data = useQuery(api.controller.activity.list, { type, outcome, ...(from !== undefined ? { from } : {}) })
  const [draft, setDraft] = React.useState(search)
  React.useEffect(() => {
    if (draft === search) return
    const timer = window.setTimeout(() => setParams({ q: draft, page: null }), 250)
    return () => window.clearTimeout(timer)
  }, [draft, search, setParams])

  const [detail, setDetail] = React.useState<Row | null>(null)

  const filtered = React.useMemo(() => {
    const rows = data?.rows ?? []
    const tokens = normalize(search).split(/\s+/).filter(Boolean)
    const matched = tokens.length
      ? rows.filter((row) => {
          const haystack = normalize([row.subject, row.subjectId, row.reference, row.label, row.location, row.detail].filter(Boolean).join(" "))
          return tokens.every((t) => haystack.includes(t))
        })
      : rows
    return order === "asc" ? [...matched].reverse() : matched
  }, [data, search, order])

  const pages_ = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pages_ - 1)
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  const exportCsv = () => {
    const csv = toCsv(
      ["Date (heure de Libreville)", "Type", "Action", "Issue", "Personne ou acte", "Identifiant", "Référence", "Lieu", "Détail"],
      filtered.map((row) => [
        formatDateTime(row.at),
        TYPES[row.type],
        row.label,
        OUTCOMES[row.outcome].label,
        row.subject,
        row.subjectId,
        row.reference,
        row.location,
        row.detail,
      ]),
    )
    downloadText(`historique-controles-${isoDay(Date.now())}.csv`, csv)
    toast.success(`${formatNumber(filtered.length)} ligne${filtered.length > 1 ? "s" : ""} exportée${filtered.length > 1 ? "s" : ""} au format CSV.`)
  }

  const filtersActive = Boolean(type || outcome || search || period !== "30d")

  return (
    <>
      <PageHeader
        kicker={pages.history.kicker}
        title={pages.history.title}
        description={pages.history.description}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={!data || filtered.length === 0}>
            <DownloadIcon aria-hidden />
            Exporter en CSV
          </Button>
        }
      />
      <div className="space-y-4 px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-end gap-3" role="group" aria-label="Filtres">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
            <Input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Nom, identifiant, référence, lieu"
              aria-label="Rechercher dans l'historique"
              className="pl-9"
            />
          </div>
          <Select value={type ?? "all"} onValueChange={(v) => setParams({ type: v === "all" ? null : v, page: null })}>
            <SelectTrigger className="w-[190px]" aria-label="Type de contrôle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {(Object.keys(TYPES) as ActivityType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPES[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(v) => setParams({ periode: v === "30d" ? null : v, page: null })}>
            <SelectTrigger className="w-[180px]" aria-label="Période">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIODS) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIODS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={outcome ?? "all"} onValueChange={(v) => setParams({ issue: v === "all" ? null : v, page: null })}>
            <SelectTrigger className="w-[170px]" aria-label="Issue">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les issues</SelectItem>
              {(Object.keys(OUTCOMES) as Outcome[]).map((o) => (
                <SelectItem key={o} value={o}>
                  {OUTCOMES[o].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtersActive && (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft("")
                setParams({ type: null, issue: null, periode: null, q: null, page: null })
              }}
            >
              Réinitialiser
            </Button>
          )}
        </div>

        <Panel>
          {data === undefined ? (
            <div className="space-y-2 p-4" aria-busy="true" aria-label="Chargement de l'historique">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={HistoryIcon}
              title={filtersActive ? "Aucun contrôle ne correspond" : "Aucun contrôle enregistré"}
              action={
                filtersActive ? (
                  <Button variant="outline" onClick={() => setParams({ type: null, issue: null, periode: "all", q: null, page: null })}>
                    Afficher tout l&apos;historique
                  </Button>
                ) : (
                  <Button asChild variant="outline">
                    <Link href="/queue">Ouvrir la file de demandes</Link>
                  </Button>
                )
              }
            >
              {filtersActive
                ? "Élargissez la période ou retirez un filtre."
                : "Vos décisions KYC, entretiens, contrôles terrain et vérifications d'actes apparaîtront ici."}
            </EmptyState>
          ) : (
            <>
              <div className="max-h-[calc(100svh-320px)] min-h-[240px] overflow-auto">
                <table className="w-full min-w-[860px] text-left text-[13px]">
                  <caption className="sr-only">
                    Historique des contrôles, {filtered.length} lignes. Sélectionnez une ligne pour afficher le détail.
                  </caption>
                  <thead className="sticky top-0 z-[1] bg-idn-surface text-xs text-idn-muted">
                    <tr className="border-b border-idn-border">
                      <th scope="col" aria-sort={order === "asc" ? "ascending" : "descending"} className="h-11 px-4 font-medium">
                        <button
                          type="button"
                          onClick={() => setParams({ tri: order === "asc" ? null : "asc", page: null })}
                          className="inline-flex items-center gap-1 rounded-sm hover:text-idn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Date
                          {order === "asc" ? <ArrowUpIcon aria-hidden className="size-3.5" /> : <ArrowDownIcon aria-hidden className="size-3.5" />}
                          <span className="sr-only">{order === "asc" ? "(plus anciens d'abord)" : "(plus récents d'abord)"}</span>
                        </button>
                      </th>
                      <th scope="col" className="px-3 font-medium">Contrôle</th>
                      <th scope="col" className="px-3 font-medium">Personne ou acte</th>
                      <th scope="col" className="px-3 font-medium">Référence</th>
                      <th scope="col" className="px-3 font-medium">Lieu ou détail</th>
                      <th scope="col" className="px-4 font-medium">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr
                        key={row._id}
                        tabIndex={0}
                        onClick={() => setDetail(row)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            setDetail(row)
                          }
                        }}
                        aria-label={`${row.label}, ${row.subject || row.reference}, ${formatDateTime(row.at)} : afficher le détail`}
                        className="h-11 cursor-pointer border-b border-idn-border-soft transition-colors duration-150 last:border-b-0 hover:bg-idn-surface-2 focus-visible:bg-idn-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <td className="whitespace-nowrap px-4 font-mono text-xs tabular-nums text-idn-muted">{formatDateTime(row.at)}</td>
                        <td className="px-3">
                          <span className="block text-idn-ink">{row.label}</span>
                          <span className="block text-xs text-idn-muted">{TYPES[row.type]}</span>
                        </td>
                        <td className="px-3">
                          <span className="block max-w-[220px] truncate text-idn-ink">{row.subject || "—"}</span>
                          {row.subjectId && <span className="block max-w-[220px] truncate text-xs text-idn-muted">{row.subjectId}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 font-mono text-xs text-idn-ink-2">{row.reference}</td>
                        <td className="px-3">
                          <span className="block max-w-[260px] truncate text-idn-ink-2">{row.location ?? row.detail ?? ""}</span>
                        </td>
                        <td className="px-4">
                          <StatusPill tone={OUTCOMES[row.outcome].tone}>{OUTCOMES[row.outcome].label}</StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-idn-border-soft px-4 py-2.5">
                <p className="mr-auto text-xs text-idn-muted">
                  {formatNumber(filtered.length)} contrôle{filtered.length > 1 ? "s" : ""} · page {current + 1} sur {pages_}
                  {data.capped && " · seuls les 1 000 plus récents sont chargés : réduisez la période"}
                </p>
                <Button size="sm" variant="outline" disabled={current === 0} onClick={() => setParams({ page: current > 1 ? String(current - 1) : null })}>
                  Précédent
                </Button>
                <Button size="sm" variant="outline" disabled={current + 1 >= pages_} onClick={() => setParams({ page: String(current + 1) })}>
                  Suivant
                </Button>
              </div>
            </>
          )}
        </Panel>
      </div>

      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        {detail && (
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>{detail.label}</DialogTitle>
              <DialogDescription>
                {TYPES[detail.type]} · {formatDateTime(detail.at)} (heure de Libreville)
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Issue">
                <StatusPill tone={OUTCOMES[detail.outcome].tone}>{OUTCOMES[detail.outcome].label}</StatusPill>
              </Field>
              <Field label="Référence" mono>{detail.reference}</Field>
              <Field label={detail.type === "signature" ? "Numéro de l'acte" : "Personne"}>{detail.subject || "Non disponible"}</Field>
              <Field label={detail.type === "signature" ? "Émetteur" : "Identifiant IDN"} mono={detail.type !== "signature"}>
                {detail.subjectId ?? "Non disponible"}
              </Field>
              {detail.location && <Field label="Lieu" className="col-span-2">{detail.location}</Field>}
              {detail.detail && (
                <Field label="Détail" className="col-span-2">
                  {detail.detail}
                </Field>
              )}
            </dl>
            <DialogFooter className={cn(!detail.kycRequestId && !detail.verificationId && "hidden")}>
              {detail.kycRequestId && (
                <Button asChild variant="outline">
                  <Link href={`/queue?id=${detail.kycRequestId}&status=all`}>Ouvrir le dossier</Link>
                </Button>
              )}
              {detail.verificationId && (
                <Button asChild variant="outline">
                  <Link href={`/agenda/entretien/${detail.verificationId}`}>Ouvrir l&apos;entretien</Link>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
