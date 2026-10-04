"use client"

/**
 * Journal d'audit : filtres combinables (type, acteur, période), noms
 * résolus, détail d'un événement et export CSV des lignes filtrées.
 */
import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { Download, Search, X } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

import { EmptyState } from "../../_components/empty-state"
import { PageBody, PageHeader } from "../../_components/page-header"
import { Field } from "../../_components/panel"
import { PersonCell } from "../../_components/person"
import { Skeleton, TableSkeleton } from "../../_components/skeleton"
import { StatusPill } from "../../_components/status-pill"
import { DataTable, Td, Th, Tr } from "../../_components/table"
import {
  fmtDateTime,
  fmtNumber,
  personLabel,
  plural,
  relativeTime,
  type PersonLike,
} from "../../_lib/format"
import {
  CATEGORY_LABEL,
  eventLabel,
  eventTone,
  type AuditCategory,
} from "../../_lib/labels"

type Period = "1h" | "24h" | "7d" | "30d" | "all" | "custom"

const PERIODS: Array<[Period, string]> = [
  ["1h", "Dernière heure"],
  ["24h", "24 heures"],
  ["7d", "7 jours"],
  ["30d", "30 jours"],
  ["all", "Tout l'historique"],
  ["custom", "Dates précises"],
]

const PERIOD_MS: Record<"1h" | "24h" | "7d" | "30d", number> = {
  "1h": 3_600_000,
  "24h": 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
}

type Row = {
  _id: Id<"auditLog">
  action: string
  actor: PersonLike | null
  target: { type: string; id: string; person?: PersonLike; appName?: string }
  ip?: string
  metadata?: Record<string, unknown>
  createdAt: number
}

const TARGET_TYPE_LABEL: Record<string, string> = {
  user: "Compte",
  app: "Application",
  session: "Session",
  kyc: "Dossier KYC",
  role: "Rôle",
  consent: "Consentement",
  document: "Document",
  system: "Système",
}

function targetLabel(t: Row["target"]): string {
  if (t.person) return personLabel(t.person)
  if (t.appName) return t.appName
  return `${TARGET_TYPE_LABEL[t.type] ?? t.type} ${t.id}`
}

/** Cellule CSV (séparateur « ; » pour les tableurs en français). */
function cell(value: unknown): string {
  if (value === undefined || value === null) return ""
  const s = String(value)
  return /[";\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
}

function toCsv(rows: Row[]): string {
  const header = [
    "horodatage",
    "evenement",
    "action",
    "acteur",
    "acteur_email",
    "acteur_id",
    "cible_type",
    "cible",
    "cible_id",
    "ip",
    "metadonnees",
  ]
  const lines = rows.map((r) =>
    [
      new Date(r.createdAt).toISOString(),
      eventLabel(r.action, r.metadata),
      r.action,
      r.actor ? personLabel(r.actor) : "Système",
      r.actor?.email ?? "",
      r.actor?.userId ?? "",
      r.target.type,
      targetLabel(r.target),
      r.target.id,
      r.ip ?? "",
      r.metadata ? JSON.stringify(r.metadata) : "",
    ]
      .map(cell)
      .join(";"),
  )
  return [header.join(";"), ...lines].join("\r\n")
}

function download(rows: Row[]) {
  const blob = new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
  a.href = url
  a.download = `idn-journal-audit-${stamp}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function LogsPage() {
  return (
    <Suspense fallback={null}>
      <LogsPageInner />
    </Suspense>
  )
}

function LogsPageInner() {
  const params = useSearchParams()
  const initialType = params.get("type")
  const [category, setCategory] = useState<"all" | AuditCategory>(
    initialType && initialType in CATEGORY_LABEL ? (initialType as AuditCategory) : "all",
  )
  const [actorInput, setActorInput] = useState("")
  const [actor, setActor] = useState("")
  const [period, setPeriod] = useState<Period>("7d")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [limit, setLimit] = useState(200)
  const [selected, setSelected] = useState<Id<"auditLog"> | null>(null)

  // La borne basse est figée au choix de la période, pour ne pas relancer la
  // query à chaque rendu.
  const range = useMemo(() => {
    if (period === "all") return {}
    if (period === "custom") {
      const f = from ? new Date(`${from}T00:00:00`).getTime() : undefined
      const t = to ? new Date(`${to}T00:00:00`).getTime() + 86_400_000 : undefined
      return { dateFrom: f, dateTo: t }
    }
    return { dateFrom: Date.now() - PERIOD_MS[period] }
  }, [period, from, to])

  const result = useQuery(api.admin.auditExplorer.listEvents, {
    category: category === "all" ? undefined : category,
    actor: actor || undefined,
    ...range,
    limit,
  })
  const rows = result?.rows as Row[] | undefined
  const filtered = category !== "all" || actor !== "" || period !== "7d"

  const reset = () => {
    setCategory("all")
    setActorInput("")
    setActor("")
    setPeriod("7d")
    setFrom("")
    setTo("")
    setLimit(200)
  }

  return (
    <>
      <PageHeader
        kicker={rows ? `Sécurité · ${plural(rows.length, "événement affiché", "événements affichés")}` : "Sécurité"}
        title="Journal d'audit"
        description="Traces signées des connexions, décisions et actions d'administration. Conservées 5 ans."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={!rows || rows.length === 0}
            onClick={() => rows && download(rows)}
          >
            <Download aria-hidden />
            Exporter en CSV
          </Button>
        }
      />
      <PageBody>
        <div className="adm-panel">
          <form
            className="flex flex-wrap items-end gap-3 border-b border-idn-border-soft p-4"
            onSubmit={(e) => {
              e.preventDefault()
              setActor(actorInput.trim())
              setLimit(200)
            }}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="log-type" className="adm-kicker">Type</label>
              <Select
                value={category}
                onValueChange={(v) => {
                  setCategory(v as "all" | AuditCategory)
                  setLimit(200)
                }}
              >
                <SelectTrigger id="log-type" className="!h-9 min-w-[220px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="shadow-none">
                  <SelectItem value="all">Tous les types</SelectItem>
                  {(Object.entries(CATEGORY_LABEL) as Array<[AuditCategory, string]>).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-[240px] flex-1 flex-col gap-1">
              <label htmlFor="log-actor" className="adm-kicker">Acteur</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
                  <Input
                    id="log-actor"
                    value={actorInput}
                    onChange={(e) => setActorInput(e.target.value)}
                    placeholder="E-mail, ID IDN ou identifiant"
                    className="h-9 pl-9"
                    aria-describedby={result?.actorNotFound ? "log-actor-error" : undefined}
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm" className="h-9">
                  Filtrer
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="log-period" className="adm-kicker">Période</label>
              <Select
                value={period}
                onValueChange={(v) => {
                  setPeriod(v as Period)
                  setLimit(200)
                }}
              >
                <SelectTrigger id="log-period" className="!h-9 min-w-[170px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="shadow-none">
                  {PERIODS.map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {period === "custom" ? (
              <>
                <div className="flex flex-col gap-1">
                  <label htmlFor="log-from" className="adm-kicker">Du</label>
                  <Input id="log-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className="h-9" />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="log-to" className="adm-kicker">Au (inclus)</label>
                  <Input id="log-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className="h-9" />
                </div>
              </>
            ) : null}

            {filtered ? (
              <Button type="button" variant="ghost" size="sm" className="h-9" onClick={reset}>
                <X aria-hidden />
                Réinitialiser
              </Button>
            ) : null}
          </form>

          {result?.actorNotFound ? (
            <p id="log-actor-error" role="alert" className="border-b border-idn-border-soft bg-[#FBE9E7] px-4 py-2 text-[13px] text-[#8C1D17] dark:bg-[#3A1513] dark:text-[#F2A49E]">
              Aucun compte ne correspond à « {actor} ». Saisissez un e-mail complet, un ID IDN ou un identifiant technique.
            </p>
          ) : null}
          {result?.truncated ? (
            <p className="border-b border-idn-border-soft bg-idn-yellow-soft px-4 py-2 text-[13px] text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
              Recherche partielle : seuls les 3 000 événements les plus récents de la période ont été parcourus. Réduisez la période ou précisez l&apos;acteur.
            </p>
          ) : null}

          {rows === undefined ? (
            <TableSkeleton rows={10} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Aucun événement pour ces critères"
              description="Élargissez la période ou retirez un filtre."
              action={filtered ? <Button variant="outline" size="sm" onClick={reset}>Réinitialiser les filtres</Button> : undefined}
            />
          ) : (
            <>
              <DataTable
                label="Événements du journal d'audit"
                minWidth={880}
                head={
                  <>
                    <Th>Quand</Th>
                    <Th>Événement</Th>
                    <Th>Acteur</Th>
                    <Th>Cible</Th>
                    <Th>Adresse IP</Th>
                  </>
                }
              >
                {rows.map((r) => {
                  const tone = eventTone(r.action)
                  return (
                    <Tr key={r._id} onActivate={() => setSelected(r._id)}>
                      <Td className="whitespace-nowrap">
                        <span className="flex flex-col">
                          <span className="text-idn-ink">{relativeTime(r.createdAt)}</span>
                          <time dateTime={new Date(r.createdAt).toISOString()} className="font-mono text-[11px] text-idn-muted">
                            {fmtDateTime(r.createdAt)}
                          </time>
                        </span>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => setSelected(r._id)}
                          className="flex items-center gap-2 rounded-sm text-left font-medium text-idn-ink outline-none hover:text-idn-green hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
                        >
                          {tone !== "neutral" ? (
                            <StatusPill tone={tone} className="h-5 px-2 text-[11px]">
                              {tone === "red" ? "Échec" : "Attention"}
                            </StatusPill>
                          ) : null}
                          {eventLabel(r.action, r.metadata)}
                        </button>
                      </Td>
                      <Td className="max-w-[220px]">
                        <PersonCell person={r.actor} />
                      </Td>
                      <Td className="max-w-[220px]">
                        {r.target.person ? (
                          <PersonCell person={r.target.person} />
                        ) : r.target.type === "app" ? (
                          <span className="flex min-w-0 flex-col">
                            <Link
                              href={`/apps/${encodeURIComponent(r.target.id)}`}
                              className="truncate rounded-sm font-medium text-idn-ink outline-none hover:text-idn-green hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
                            >
                              {r.target.appName ?? "Application supprimée"}
                            </Link>
                            <span className="truncate font-mono text-[11px] text-idn-muted">{r.target.id}</span>
                          </span>
                        ) : (
                          <span className="flex min-w-0 flex-col">
                            <span className="text-idn-ink-2">{TARGET_TYPE_LABEL[r.target.type] ?? r.target.type}</span>
                            <span className="truncate font-mono text-[11px] text-idn-muted">{r.target.id}</span>
                          </span>
                        )}
                      </Td>
                      <Td className="font-mono text-xs text-idn-muted">{r.ip ?? "Non relevée"}</Td>
                    </Tr>
                  )
                })}
              </DataTable>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-idn-border px-4 py-3 text-[13px] text-idn-muted">
                <span aria-live="polite">{plural(rows.length, "événement", "événements")}, du plus récent au plus ancien</span>
                {rows.length >= limit && limit < 500 ? (
                  <Button variant="outline" size="sm" onClick={() => setLimit(500)}>
                    Afficher jusqu&apos;à {fmtNumber(500)} événements
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </PageBody>

      <EventDetail id={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function EventDetail({ id, onClose }: { id: Id<"auditLog"> | null; onClose: () => void }) {
  const event = useQuery(api.admin.auditExplorer.getEvent, id ? { id } : "skip")
  return (
    <Dialog open={id !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto shadow-none sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {event ? eventLabel(event.action, event.metadata) : "Événement"}
          </DialogTitle>
          <DialogDescription>
            {event ? `${fmtDateTime(event.createdAt)} · ${relativeTime(event.createdAt)}` : "Chargement du détail…"}
          </DialogDescription>
        </DialogHeader>
        {event === undefined ? (
          <div className="space-y-3">
            <Skeleton className="w-full" />
            <Skeleton className="w-2/3" />
          </div>
        ) : event === null ? (
          <p className="text-[13px] text-idn-muted">Cet événement n&apos;existe plus.</p>
        ) : (
          <dl>
            <Field label="Action" mono>{event.action}</Field>
            <Field label="Acteur">
              <PersonCell person={event.actor} />
            </Field>
            <Field label="Cible">
              {event.target.person ? (
                <PersonCell person={event.target.person} />
              ) : (
                <span className="flex flex-col">
                  <span>{event.target.appName ?? TARGET_TYPE_LABEL[event.targetType] ?? event.targetType}</span>
                  <span className="font-mono text-[11px] text-idn-muted">{event.target.id}</span>
                </span>
              )}
            </Field>
            <Field label="Adresse IP" mono>{event.ip}</Field>
            <Field label="Navigateur" mono>{event.userAgent}</Field>
            <Field label="Signature">
              <StatusPill tone={event.signed ? "green" : "yellow"}>
                {event.signed ? "Entrée signée" : "Entrée non signée"}
              </StatusPill>
            </Field>
            <Field label="Métadonnées">
              {event.metadata && Object.keys(event.metadata).length > 0 ? (
                <dl className="space-y-1">
                  {Object.entries(event.metadata).map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[auto_1fr] gap-2 font-mono text-xs">
                      <dt className="text-idn-muted">{k}</dt>
                      <dd className="break-all text-idn-ink">
                        {typeof v === "string" ? v : JSON.stringify(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : undefined}
            </Field>
            <Field label="Référence" mono>{event._id}</Field>
          </dl>
        )}
      </DialogContent>
    </Dialog>
  )
}
