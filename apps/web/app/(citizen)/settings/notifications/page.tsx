"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { cleanError } from "@/app/_components/idn/dialog"
import type { IconName } from "@/app/_components/idn/icons"
import { Card, ErrorNote, Note, Row, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { IdnSwitch } from "../../_components/account/switch"
import { PushDeviceCard } from "../_components/push-device-card"

type Category = "security" | "kyc" | "consent" | "comms"
type Channel = "email" | "inApp"
type Preferences = Record<Channel, Record<Category, boolean>>

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
  { id: "email", title: "Par e-mail", note: "Envoyés à l’adresse e-mail de ton compte." },
]

/** Notifications : transposition de apps/mobile/src/app/settings/notification-preferences.tsx. */
export default function NotificationPreferencesPage() {
  const remote = useQuery(api.preferences.getMyNotificationPreferences)
  const update = useMutation(api.preferences.updateMyNotificationPreferences)
  const [local, setLocal] = React.useState<Preferences | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (remote !== undefined) setLocal(remote ? { email: { ...remote.email }, inApp: { ...remote.inApp } } : FALLBACK)
  }, [remote])

  async function toggle(channel: Channel, category: Category, value: boolean) {
    if (!local) return
    const previous = local
    const next = { ...local, [channel]: { ...local[channel], [category]: value } }
    setLocal(next)
    setError(null)
    try {
      await update({ [channel]: next[channel] })
    } catch (caught) {
      setLocal(previous)
      setError(caught instanceof Error ? cleanError(caught.message) : "Mise à jour impossible.")
    }
  }

  return (
    <Screen header={<AppBar title="Notifications" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">
        {local === null ? "Chargement…" : "Choisis les catégories que tu reçois dans l’application et par e-mail."}
      </p>
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
                  <IdnSwitch
                    checked={local?.[channel.id][category.id] ?? false}
                    onChange={(value) => void toggle(channel.id, category.id, value)}
                    label={`${category.label}, ${channel.title.toLowerCase()}`}
                    disabled={local === null}
                  />
                }
              />
            ))}
          </Card>
          <Note className="mt-2">{channel.note}</Note>
        </React.Fragment>
      ))}
      <ErrorNote>{error}</ErrorNote>
      <SectionTitle>Navigateur</SectionTitle>
      <PushDeviceCard />
    </Screen>
  )
}
