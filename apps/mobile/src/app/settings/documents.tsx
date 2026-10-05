import React from "react"
import { Alert, View } from "react-native"
import { Text } from "@/design/text"
import { useRouter } from "expo-router"
import * as WebBrowser from "expo-web-browser"
import { useConvexAuth, useQuery } from "convex/react"

import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, Row } from "@/design/components/list"
import { IdnLottie } from "@/design/components/lottie"
import type { IconName } from "@/design/icons"
import { useIdnTheme } from "@/design/theme"
import { api } from "@/lib/api"

const LABELS = {
  profilePhoto: "Photo de profil",
  kycDocFront: "Pièce d’identité — recto",
  kycDocBack: "Pièce d’identité — verso",
  selfie: "Selfie de vérification",
  attestation: "Attestation",
} as const

const ICONS: Record<keyof typeof LABELS, IconName> = {
  profilePhoto: "userRound",
  kycDocFront: "idCard",
  kycDocBack: "idCard",
  selfie: "scanFace",
  attestation: "doc",
}

const fmt = (ts: number) => new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

export default function AccountDocuments() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const documents = useQuery(
    api.documents.listMine,
    isAuthenticated ? {} : "skip",
  )

  async function open(url: string | null) {
    if (!url)
      return Alert.alert(
        "Fichier indisponible",
        "Ce document ne peut pas être ouvert pour le moment.",
      )
    await WebBrowser.openBrowserAsync(url)
  }

  return (
    <Screen header={<AppBar title="Mes pièces justificatives" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        Ta photo de profil et les attestations enregistrées sur ton compte. Les pièces de ta vérification d’identité restent dans ton dossier de vérification.
      </Text>
      <Card style={{ marginTop: 16 }}>
        <Row icon="shield" tone="blue" title="Dossier de vérification" sub="Recto, verso et selfie envoyés pour le Niveau 2" chevron onPress={() => router.push("/kyc/review")} />
      </Card>
      {documents === undefined ? (
        <Card style={{ marginTop: 16 }}>
          <Row title="Chargement…" />
        </Card>
      ) : documents.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40, gap: 12 }}>
          <IdnLottie name="idocument" size={120} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: t.ink }}>Aucune pièce enregistrée</Text>
          <Text style={{ fontSize: 13, lineHeight: 19, color: t.muted, textAlign: "center" }}>
            Ajoute une photo de profil depuis Profil pour la retrouver ici.
          </Text>
        </View>
      ) : (
        <Card style={{ marginTop: 16 }}>
          {documents.map((document) => (
            <Row
              key={document._id}
              icon={ICONS[document.type]}
              title={LABELS[document.type]}
              sub={`Ajoutée le ${fmt(document.createdAt)}${document.expiresAt ? ` · expire le ${fmt(document.expiresAt)}` : ""}`}
              chevron
              onPress={() => void open(document.url)}
              accessibilityLabel={`Ouvrir ${LABELS[document.type]}`}
            />
          ))}
        </Card>
      )}
    </Screen>
  )
}
