import React, { useMemo, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useQuery } from "convex/react"
import { Text } from "@/design/text"
import { useIdnTheme } from "@/design/theme"
import type { IconName } from "@/design/icons"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, Note, Overline, Row, type RowTone } from "@/design/components/list"
import { IdnLottie } from "@/design/components/lottie"
import { AUDIT_ACTION_LABELS } from "@/lib/activity-format"
import { api } from "@/lib/api"

type Filter = { id: string; label: string; match: ((action: string) => boolean) | null }
const FILTERS: readonly Filter[] = [
  { id: "all", label: "Tout", match: null },
  {
    id: "connections",
    label: "Connexions",
    match: (a) =>
      ["login_success", "login_failure", "login_lockout", "session_revoked", "session_revoked_global"].includes(a),
  },
  {
    id: "consents",
    label: "Applications",
    match: (a) => ["consent_granted", "consent_revoked", "partner_token_exchanged"].includes(a),
  },
  {
    id: "kyc",
    label: "Vérification",
    match: (a) => a.startsWith("kyc_") || a.startsWith("level3_") || a === "identity_check_performed",
  },
  {
    id: "security",
    label: "Sécurité",
    match: (a) =>
      ["password_changed", "pin_changed", "email_changed", "otp_sent", "otp_verified", "account_modified"].includes(a),
  },
]

type ActivityRow = {
  _id: string
  action: string
  targetType: string
  targetId: string
  ip?: string
  metadata?: Record<string, unknown>
  createdAt: number
}

/** Même correspondance icône / couleur que l'activité récente de l'accueil. */
function activityVisual(action: string): { icon: IconName; tone: RowTone } {
  if (action.startsWith("login") || action === "partner_token_exchanged") return { icon: "logOut", tone: "green" }
  if (action.startsWith("consent")) return { icon: "keyRound", tone: "green" }
  if (action.startsWith("kyc") || action.startsWith("level3") || action === "identity_check_performed") return { icon: "shield", tone: "blue" }
  if (action.startsWith("session")) return { icon: "smartphone", tone: "yellow" }
  if (action.includes("pin") || action.includes("password")) return { icon: "lock", tone: "neutral" }
  if (action === "presentation_minted") return { icon: "qr", tone: "green" }
  return { icon: "activity", tone: "neutral" }
}

function metadataDetail(row: ActivityRow): string {
  const m = row.metadata as Record<string, unknown> | undefined
  const parts: string[] = []
  if (typeof m?.device === "string") parts.push(m.device)
  if (typeof m?.location === "string") parts.push(m.location)
  if (row.ip) parts.push(row.ip)
  if (typeof m?.app === "string") parts.push(m.app as string)
  if (typeof m?.scopes === "string") parts.push(m.scopes as string)
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

/** Journal d'activité du compte (événements d'audit). */
export default function Activity() {
  const t = useIdnTheme()
  const router = useRouter()
  const [filter, setFilter] = useState(0)
  const { isAuthenticated } = useConvexAuth()
  const rows = useQuery(api.activity.listMine, isAuthenticated ? { limit: 100 } : "skip") as ActivityRow[] | undefined

  const filtered = useMemo(() => {
    if (!rows) return undefined
    const match = FILTERS[filter].match
    return match ? rows.filter((r) => match(r.action)) : rows
  }, [rows, filter])

  return (
    <Screen header={<AppBar title="Journal d’activité" onBack={() => router.back()} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingVertical: 12, paddingHorizontal: 20 }}>
        {FILTERS.map((f, i) => {
          const sel = i === filter
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected: sel }}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
            >
              <Text style={{ fontSize: 13, fontWeight: sel ? "600" : "500", color: sel ? t.greenText : t.ink2 }}>{f.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {filtered === undefined ? (
        <View style={{ alignItems: "center", paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement du journal" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 16 }}>
          <IdnLottie name="shield" size={110} />
          <Note center style={{ marginTop: 4 }}>
            {FILTERS[filter].match
              ? `Aucun événement dans la catégorie « ${FILTERS[filter].label} ».`
              : "Aucun événement pour l’instant. Tes connexions et démarches apparaîtront ici."}
          </Note>
        </View>
      ) : (
        groupByDay(filtered).map((day) => (
          <View key={day.d}>
            <Overline style={{ marginTop: 16, marginBottom: 8 }}>{day.d}</Overline>
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
                    sub={detail || undefined}
                    right={<Text style={{ fontFamily: t.mono, fontSize: 12, color: t.muted }}>{formatTime(ev.createdAt)}</Text>}
                  />
                )
              })}
            </Card>
          </View>
        ))
      )}
      {rows && rows.length >= 100 ? <Note center>Seuls les 100 derniers événements sont affichés.</Note> : null}
    </Screen>
  )
}
