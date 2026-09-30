import React, { useMemo, useState } from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { NLargeHeader } from "@/components/chrome/large-header"
import { api } from "@/lib/api"
import { Icon } from "@/design/icons"

type Filter = { id: string; label: string; actions: readonly string[] | null }
const FILTERS: readonly Filter[] = [
  { id: "all", label: "Tout", actions: null },
  {
    id: "connections",
    label: "Connexions",
    actions: [
      "login_success",
      "login_failure",
      "login_lockout",
      "session_revoked",
      "session_revoked_global",
    ],
  },
  {
    id: "consents",
    label: "Consentements",
    actions: ["consent_granted", "consent_revoked", "partner_token_exchanged"],
  },
  {
    id: "kyc",
    label: "KYC",
    actions: [
      "kyc_submitted",
      "kyc_under_review",
      "kyc_complement_requested",
      "kyc_complement_provided",
      "kyc_approved",
      "kyc_rejected",
    ],
  },
  {
    id: "security",
    label: "Sécurité",
    actions: [
      "password_changed",
      "pin_changed",
      "email_changed",
      "otp_sent",
      "otp_verified",
      "account_modified",
    ],
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

const ACTION_LABEL: Record<
  string,
  { e: string; cat: string; col: "green" | "blue" | "yellow" | "muted" }
> = {
  login_success: { e: "Connexion réussie", cat: "AUTH", col: "green" },
  login_failure: {
    e: "Tentative de connexion échouée",
    cat: "AUTH",
    col: "yellow",
  },
  login_lockout: {
    e: "Compte temporairement verrouillé",
    cat: "AUTH",
    col: "yellow",
  },
  otp_sent: { e: "Code OTP envoyé", cat: "AUTH", col: "muted" },
  otp_verified: { e: "Code OTP vérifié", cat: "AUTH", col: "green" },
  otp_expired: { e: "Code OTP expiré", cat: "AUTH", col: "muted" },
  account_created: { e: "Compte créé", cat: "COMPTE", col: "green" },
  account_modified: { e: "Profil modifié", cat: "COMPTE", col: "green" },
  account_disabled: { e: "Compte désactivé", cat: "COMPTE", col: "yellow" },
  password_changed: {
    e: "Identifiant de connexion modifié",
    cat: "SÉC",
    col: "green",
  },
  email_changed: { e: "Adresse email modifiée", cat: "SÉC", col: "green" },
  pin_changed: { e: "Code PIN modifié", cat: "SÉC", col: "green" },
  kyc_submitted: {
    e: "Vérification d'identité soumise",
    cat: "KYC",
    col: "blue",
  },
  kyc_under_review: { e: "KYC en cours de revue", cat: "KYC", col: "blue" },
  kyc_complement_requested: {
    e: "Pièces complémentaires demandées",
    cat: "KYC",
    col: "yellow",
  },
  kyc_complement_provided: {
    e: "Pièces complémentaires fournies",
    cat: "KYC",
    col: "blue",
  },
  kyc_approved: { e: "Niveau de garantie augmenté", cat: "KYC", col: "green" },
  kyc_rejected: { e: "KYC refusé", cat: "KYC", col: "yellow" },
  consent_granted: { e: "Consentement accordé", cat: "CONS", col: "blue" },
  consent_revoked: { e: "Consentement révoqué", cat: "CONS", col: "muted" },
  partner_token_exchanged: {
    e: "Connexion à une application partenaire",
    cat: "CONS",
    col: "blue",
  },
  session_revoked: { e: "Session révoquée", cat: "SÉC", col: "green" },
  session_revoked_global: {
    e: "Toutes les sessions ont été révoquées",
    cat: "SÉC",
    col: "green",
  },
  presentation_minted: {
    e: "QR d'identité présenté",
    cat: "PRES",
    col: "blue",
  },
  identity_check_performed: {
    e: "Identité vérifiée par un contrôleur",
    cat: "PRES",
    col: "green",
  },
  oauth_app_created: {
    e: "Application OAuth créée",
    cat: "OAUTH",
    col: "muted",
  },
  oauth_app_modified: {
    e: "Application OAuth modifiée",
    cat: "OAUTH",
    col: "muted",
  },
  oauth_app_disabled: {
    e: "Application OAuth désactivée",
    cat: "OAUTH",
    col: "muted",
  },
  admin_action: { e: "Action administrateur", cat: "ADMIN", col: "muted" },
  role_assigned: { e: "Rôle attribué", cat: "ADMIN", col: "muted" },
  role_revoked: { e: "Rôle révoqué", cat: "ADMIN", col: "muted" },
  signature_verified: {
    e: "Document signé vérifié",
    cat: "SIGN",
    col: "green",
  },
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

function groupByDay(
  rows: ActivityRow[],
): { d: string; items: ActivityRow[] }[] {
  const now = new Date()
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime()
  const yesterday = today - 86_400_000
  const groups = new Map<string, ActivityRow[]>()
  for (const row of rows) {
    const ts = row.createdAt
    let key: string
    if (ts >= today) key = "Aujourd'hui"
    else if (ts >= yesterday) key = "Hier"
    else {
      const d = new Date(ts)
      const months = [
        "janv.",
        "févr.",
        "mars",
        "avr.",
        "mai",
        "juin",
        "juil.",
        "août",
        "sept.",
        "oct.",
        "nov.",
        "déc.",
      ]
      key = `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`
    }
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

export default function Activity() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [filter, setFilter] = useState(0)
  const { isAuthenticated } = useConvexAuth()
  const rows = useQuery(
    api.activity.listMine,
    isAuthenticated ? { limit: 100 } : "skip",
  ) as ActivityRow[] | undefined

  const filtered = useMemo(() => {
    if (!rows) return undefined
    const allowed = FILTERS[filter].actions
    if (!allowed) return rows
    return rows.filter((r) => allowed.includes(r.action))
  }, [rows, filter])

  const colorFor = (c: "green" | "blue" | "yellow" | "muted") =>
    c === "green"
      ? idnTokens.green
      : c === "blue"
        ? idnTokens.blue
        : c === "yellow"
          ? idnTokens.yellow
          : t.muted

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NLargeHeader
        t={t}
        title="Activité"
        sub="Tous les événements de votre compte"
        onBack={() => router.back()}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 12,
          gap: 6,
        }}
      >
        {FILTERS.map((f, i) => {
          const sel = i === filter
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(i)}
              style={{
                paddingHorizontal: 12,
                minHeight: 30,
                borderRadius: 9999,
                borderWidth: 1,
                backgroundColor: sel ? idnTokens.green : t.surface,
                borderColor: sel ? idnTokens.green : t.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "500",
                  color: sel ? "#fff" : t.ink2,
                }}
              >
                {f.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 4,
          paddingBottom: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {filtered === undefined ? (
          [0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                marginTop: 14,
                height: 80,
                borderRadius: 14,
                backgroundColor: t.surface2,
              }}
            />
          ))
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", padding: 40, gap: 10 }}>
            <Icon name="shield" size={32} color={t.muted} />
            <Text style={{ color: t.muted, fontSize: 13, textAlign: "center" }}>
              Aucun événement{" "}
              {FILTERS[filter].id !== "all"
                ? `dans la catégorie « ${FILTERS[filter].label} »`
                : ""}
              .
            </Text>
          </View>
        ) : (
          groupByDay(filtered).map((day, di) => (
            <View key={di}>
              <Text
                style={{
                  fontSize: 11,
                  color: t.muted,
                  letterSpacing: 1.2,
                  fontWeight: "600",
                  paddingTop: 14,
                  paddingBottom: 8,
                }}
              >
                {day.d.toUpperCase()}
              </Text>
              <View
                style={{
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {day.items.map((ev, i) => {
                  const meta = ACTION_LABEL[ev.action] ?? {
                    e: ev.action,
                    cat: "INFO",
                    col: "muted" as const,
                  }
                  const detail = metadataDetail(ev)
                  return (
                    <View
                      key={ev._id}
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        padding: 14,
                        alignItems: "flex-start",
                        borderBottomWidth: i === day.items.length - 1 ? 0 : 1,
                        borderBottomColor: t.borderSoft,
                      }}
                    >
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 9999,
                          backgroundColor: colorFor(meta.col),
                          marginTop: 6,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: t.ink,
                            fontWeight: "500",
                          }}
                        >
                          {meta.e}
                        </Text>
                        {detail ? (
                          <Text
                            style={{
                              fontSize: 11,
                              color: t.muted,
                              marginTop: 2,
                            }}
                          >
                            {detail}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={{
                          fontFamily: idnTokens.mono,
                          fontSize: 11,
                          color: t.muted,
                        }}
                      >
                        {formatTime(ev.createdAt)}
                      </Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}
