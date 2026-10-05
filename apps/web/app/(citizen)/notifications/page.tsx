"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import type { IconName } from "@/app/_components/idn/icons"
import { Card, Overline, Row, type RowTone } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { notificationRoute } from "@/lib/citizen/notification-route"

import { FilterChips } from "../_components/account/filter-chips"

type Filter = "all" | "unread" | "security" | "documents"

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "unread", label: "Non lues" },
  { id: "security", label: "Sécurité" },
  { id: "documents", label: "Documents" },
]

const VISUAL: Record<string, { icon: IconName; tone: RowTone; label: string }> = {
  security: { icon: "alert", tone: "yellow", label: "Sécurité" },
  kyc: { icon: "shield", tone: "blue", label: "Vérification" },
  consent: { icon: "keyRound", tone: "green", label: "Accès" },
  comms: { icon: "mail", tone: "blue", label: "iBoîte" },
  documents: { icon: "file", tone: "neutral", label: "iDocument" },
  cv: { icon: "fileUser", tone: "neutral", label: "iCV" },
  ai: { icon: "sparkles", tone: "neutral", label: "iCV" },
  system: { icon: "bell", tone: "neutral", label: "IDN" },
}

function relative(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60_000)
  if (min < 1) return "À l’instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h} h`
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short" }).format(ts)
}

function bucket(ts: number, now: number): "today" | "week" | "older" {
  const d = new Date(now)
  const startToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  if (ts >= startToday) return "today"
  if (ts >= startToday - 6 * 86_400_000) return "week"
  return "older"
}

const BUCKETS = [
  { id: "today", label: "Aujourd’hui" },
  { id: "week", label: "Cette semaine" },
  { id: "older", label: "Plus ancien" },
] as const

/** Notifications : transposition de apps/mobile/src/app/notifications.tsx. */
export default function NotificationsPage() {
  const router = useRouter()
  const [filter, setFilter] = React.useState<Filter>("all")
  const rows = useQuery(api.notifications.listMine, { limit: 100, filter })
  const unread = useQuery(api.notifications.unreadCount)
  const markAllRead = useMutation(api.notifications.markAllRead)
  const markRead = useMutation(api.notifications.markRead)
  const clearAll = useMutation(api.notifications.clearAll)
  const [clearOpen, setClearOpen] = React.useState(false)
  const now = Date.now()

  async function open(n: NonNullable<typeof rows>[number]) {
    if (!n.readAt) await markRead({ notificationId: n._id }).catch(() => undefined)
    const route = notificationRoute(n)
    if (route) router.push(route)
  }

  return (
    <Screen
      header={
        <AppBar
          title="Notifications"
          back="/dashboard"
          right={
            unread ? (
              <button
                type="button"
                onClick={() => void markAllRead({})}
                className="rounded-md px-1 text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              >
                Tout lire
              </button>
            ) : null
          }
        />
      }
    >
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} label="Filtrer les notifications" />

      {rows === undefined ? (
        <p className="mt-6 text-idn-muted">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="mt-12 text-center">
          <h2 className="text-base font-semibold text-idn-ink">Aucune notification</h2>
          <p className="mt-1 text-sm text-idn-muted">
            {filter === "unread" ? "Tout est lu." : "Tes alertes de sécurité, courriers et démarches apparaîtront ici."}
          </p>
        </div>
      ) : (
        BUCKETS.map((b) => {
          const items = rows.filter((n) => bucket(n.createdAt, now) === b.id)
          if (!items.length) return null
          return (
            <section key={b.id} aria-label={b.label}>
              <Overline className="mb-2 mt-[22px]">{b.label}</Overline>
              <Card>
                {items.map((n) => {
                  const v = VISUAL[n.category] ?? VISUAL.system!
                  const route = notificationRoute(n)
                  return (
                    <Row
                      key={n._id}
                      icon={v.icon}
                      tone={v.tone}
                      unread={!n.readAt}
                      title={n.title}
                      sub={
                        <span className="flex flex-col gap-0.5">
                          {n.body ? <span className="line-clamp-2 text-idn-ink-2 [overflow-wrap:anywhere]">{n.body}</span> : null}
                          <span className="text-xs">{`${relative(n.createdAt, now)} · ${v.label}`}</span>
                        </span>
                      }
                      chevron={!!route}
                      onClick={() => void open(n)}
                      ariaLabel={`${n.readAt ? "" : "Non lue, "}${n.title}`}
                    />
                  )
                })}
              </Card>
            </section>
          )
        })
      )}
      {rows && rows.length > 0 ? (
        <IdnButton variant="ghost" full className="mt-6" onClick={() => setClearOpen(true)}>
          Effacer les notifications
        </IdnButton>
      ) : null}
      <ConfirmDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Effacer les notifications ?"
        description="Elles disparaissent de cet écran. Tes courriers et documents ne sont pas touchés."
        confirmLabel="Effacer"
        destructive
        onConfirm={async () => {
          await clearAll({})
        }}
      />
    </Screen>
  )
}
