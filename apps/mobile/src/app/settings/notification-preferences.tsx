import React from "react"
import { Pressable, View } from "react-native"
import { Text } from "@/design/text"
import { useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"

import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, ErrorNote, Note, Row, SectionTitle } from "@/design/components/list"
import type { IconName } from "@/design/icons"
import { useIdnTheme } from "@/design/theme"
import { api } from "@/lib/api"

type Category = "security" | "kyc" | "consent" | "comms"
type Channel = "email" | "inApp"
type Matrix = Record<Category, boolean>
type Preferences = Record<Channel, Matrix>

const FALLBACK: Preferences = {
  email: { security: true, kyc: true, consent: true, comms: false },
  inApp: { security: true, kyc: true, consent: true, comms: true },
}

const CATEGORIES: { id: Category; label: string; help: string; icon: IconName }[] = [
  { id: "security", label: "Sécurité", help: "Connexions, code PIN et alertes sensibles", icon: "shield" },
  { id: "kyc", label: "Vérification d’identité", help: "Avancement et décisions de vérification", icon: "idCard" },
  { id: "consent", label: "Consentements", help: "Nouveaux accès et révocations", icon: "keyRound" },
  { id: "comms", label: "Informations IDN", help: "Actualités et communications de service", icon: "bell" },
]

const CHANNELS: { id: Channel; title: string; note: string }[] = [
  { id: "inApp", title: "Dans l’application", note: "Couvre aussi les notifications push sur ton téléphone." },
  { id: "email", title: "Par e-mail", note: "Envoyés à l’adresse e-mail de ton compte."},
]

/** Interrupteur de la charte (52 × 32), accessible comme un switch natif. */
function Switch({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  const t = useIdnTheme()
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      accessibilityLabel={label}
      hitSlop={6}
      style={{ width: 52, height: 32, borderRadius: 9999, padding: 3, backgroundColor: value ? t.green : t.border, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}
    >
      <View style={{ width: 26, height: 26, borderRadius: 9999, backgroundColor: "#fff", alignSelf: value ? "flex-end" : "flex-start" }} />
    </Pressable>
  )
}

export default function NotificationPreferences() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const remote = useQuery(
    api.preferences.getMyNotificationPreferences,
    isAuthenticated ? {} : "skip",
  )
  const update = useMutation(api.preferences.updateMyNotificationPreferences)
  const [local, setLocal] = React.useState<Preferences | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (remote !== undefined)
      setLocal(
        remote
          ? { email: { ...remote.email }, inApp: { ...remote.inApp } }
          : FALLBACK,
      )
  }, [remote])

  async function toggle(channel: Channel, category: Category, value: boolean) {
    if (!local) return
    const previous = local
    const next = {
      ...local,
      [channel]: { ...local[channel], [category]: value },
    }
    setLocal(next)
    setError(null)
    try {
      await update({ [channel]: next[channel] })
    } catch (caught) {
      setLocal(previous)
      setError(
        caught instanceof Error ? caught.message : "Mise à jour impossible.",
      )
    }
  }

  return (
    <Screen header={<AppBar title="Notifications" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        {local === null ? "Chargement…" : "Choisis les catégories que tu reçois dans l’application et par e-mail."}
      </Text>
      {CHANNELS.map((channel) => (
        <React.Fragment key={channel.id}>
          <SectionTitle>{channel.title}</SectionTitle>
          <Card>
            {CATEGORIES.map((category) => (
              <Row
                key={category.id}
                icon={category.icon}
                title={category.label}
                sub={category.help}
                right={
                  <Switch
                    value={local?.[channel.id][category.id] ?? false}
                    onChange={(value) => void toggle(channel.id, category.id, value)}
                    label={`${category.label}, ${channel.title.toLowerCase()}`}
                    disabled={local === null}
                  />
                }
              />
            ))}
          </Card>
          <Note style={{ marginTop: 8 }}>{channel.note}</Note>
        </React.Fragment>
      ))}
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  )
}
