"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, Note, Row, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

const CATEGORY_LABEL: Record<string, string> = {
  administrative: "Administratif",
  civilStatus: "État civil",
  fiscal: "Fiscalité",
  education: "Éducation",
  health: "Santé",
  transport: "Transport",
  social: "Social",
  other: "Autre",
}

/** N'ouvre que des liens web : jamais un schéma qui exécuterait du contenu. */
function safeLink(url: string): string | null {
  try {
    const u = new URL(url)
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null
  } catch {
    return null
  }
}

/** Fiche d'un service publié par une application autorisée (apps/mobile/src/app/service/[id].tsx). */
export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>()
  const decodedId = decodeURIComponent(id ?? "")
  const service = useQuery(api.services.get, decodedId ? { id: decodedId } : "skip")
  const header = <AppBar title="Service" back="/mes-services" />

  if (service === undefined) {
    return (
      <Screen header={header}>
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement du service" />
        </div>
      </Screen>
    )
  }
  if (!service) {
    return (
      <Screen header={header}>
        <Note center className="mt-8">Ce service n’est plus disponible, ou tu n’y as plus accès.</Note>
      </Screen>
    )
  }

  const link = safeLink(service.link)
  return (
    <Screen
      header={header}
      footer={
        link ? (
          <IdnButton href={link} target="_blank" rel="noopener noreferrer" full leadIcon={<Icon name="link" size={18} />}>
            Accéder au service
          </IdnButton>
        ) : undefined
      }
    >
      <div className="mt-5">
        <Badge tone="green">{CATEGORY_LABEL[service.category] ?? service.category}</Badge>
      </div>
      <ScreenTitle title={service.label} lead={service.description} />

      <Card className="mt-5">
        <Row icon="building" tone="blue" title={service.appName} sub="Application qui propose ce service" />
      </Card>

      <div className="mt-4 flex gap-2.5 rounded-[14px] bg-c-blue-badge p-3.5">
        <Icon name="shield" size={18} className="mt-px shrink-0 text-c-blue-text" />
        <p className="flex-1 text-[13px] leading-[19px] text-idn-ink-2">
          Tu vas ouvrir le site de {service.appName}. Tu as déjà autorisé cette application : elle accède aux seules
          informations que tu as acceptées. Tu peux lui retirer cet accès à tout moment dans « Applications autorisées ».
        </p>
      </div>
      {!link ? <Note>Le lien de ce service n’est pas valide. Signale-le à l’application qui le propose.</Note> : null}
    </Screen>
  )
}
