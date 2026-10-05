"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Card, Note, Overline, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { AUDIT_ACTION_LABELS } from "@/lib/citizen/activity-format"
import { activityVisual } from "@/lib/citizen/display"

import { FilterChips } from "../_components/account/filter-chips"

type FilterId = "all" | "connections" | "consents" | "kyc" | "security"
const FILTERS: readonly { id: FilterId; label: string; match: ((action: string) => boolean) | null }[] = [
  { id: "all", label: "Tout", match: null },
  {
    id: "connections",
    label: "Connexions",
    match: (a) => ["login_success", "login_failure", "login_lockout", "session_revoked", "session_revoked_global"].includes(a),
  },
  { id: "consents", label: "Applications", match: (a) => ["consent_granted", "consent_revoked", "partner_token_exchanged"].includes(a) },
  { id: "kyc", label: "Vérification", match: (a) => a.startsWith("kyc_") || a.startsWith("level3_") || a === "identity_check_performed" },
  {
    id: "security",
    label: "Sécurité",
    match: (a) => ["password_changed", "pin_changed", "email_changed", "otp_sent", "otp_verified", "account_modified"].includes(a),
  },
]

type ActivityRow = {
  _id: string
  action: string
  ip?: string
  metadata?: unknown
  createdAt: number
}

function metadataDetail(row: ActivityRow): string {
  const m = row.metadata as Record<string, unknown> | undefined
  const parts: string[] = []
  if (typeof m?.device === "string") parts.push(m.device)
  if (typeof m?.location === "string") parts.push(m.location)
  if (row.ip) parts.push(row.ip)
  if (typeof m?.app === "string") parts.push(m.app)
  if (typeof m?.scopes === "string") parts.push(m.scopes)
  if (typeof m?.field === "string") parts.push(`champ : ${m.field}`)
  return parts.join(" · ")
}

const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })

function groupByDay(rows: ActivityRow[]): { d: string; items: ActivityRow[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000
  const groups = new Map<string, ActivityRow[]>()
  for (const row of rows) {
    const ts = row.createdAt
    const key = ts >= today ? "Aujourd’hui" : ts >= yesterday ? "Hier" : DAY.format(ts)
    const arr = groups.get(key) ?? []
    arr.push(row)
    groups.set(key, arr)
  }
  return Array.from(groups.entries()).map(([d, items]) => ({ d, items }))
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

/** Journal d'activité : transposition de apps/mobile/src/app/activity.tsx. */
export default function ActivityPage() {
  const [filter, setFilter] = React.useState<FilterId>("all")
  const rows = useQuery(api.activity.listMine, { limit: 100 }) as ActivityRow[] | undefined
  const current = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]!

  const filtered = React.useMemo(() => {
    if (!rows) return undefined
    return current.match ? rows.filter((r) => current.match!(r.action)) : rows
  }, [rows, current])

  return (
    <Screen header={<AppBar title="Journal d’activité" back="/profile" />}>
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filtrer le journal" />
      {filtered === undefined ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement du journal" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 flex flex-col items-center">
          <IdnLottie name="shield" size={110} label="Illustration : bouclier" />
          <Note center className="mt-1">
            {current.match
              ? `Aucun événement dans la catégorie « ${current.label} ».`
              : "Aucun événement pour l’instant. Tes connexions et démarches apparaîtront ici."}
          </Note>
        </div>
      ) : (
        groupByDay(filtered).map((day) => (
          <section key={day.d} aria-label={day.d}>
            <Overline className="mb-2 mt-4">{day.d}</Overline>
            <Card>
              {day.items.map((ev) => {
                const v = activityVisual(ev.action)
                const detail = metadataDetail(ev)
                return (
                  <Row
                    key={ev._id}
                    icon={v.icon}
                    tone={v.tone}
                    title={AUDIT_ACTION_LABELS[ev.action] ?? ev.action}
                    sub={detail ? <span className="[overflow-wrap:anywhere]">{detail}</span> : undefined}
                    right={
                      <time dateTime={new Date(ev.createdAt).toISOString()} className="shrink-0 font-mono text-xs text-idn-muted">
                        {formatTime(ev.createdAt)}
                      </time>
                    }
                  />
                )
              })}
            </Card>
          </section>
        ))
      )}
      {rows && rows.length >= 100 ? <Note center>Seuls les 100 derniers événements sont affichés.</Note> : null}
    </Screen>
  )
}
