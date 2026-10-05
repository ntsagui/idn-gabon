import React from "react"
import { Linking } from "react-native"
import { Text } from "@/design/text"
import { useRouter } from "expo-router"

import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, ErrorNote, Row } from "@/design/components/list"
import { useIdnTheme } from "@/design/theme"

export default function Support() {
  const t = useIdnTheme()
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)

  function open(url: string, fallback: string) {
    setError(null)
    Linking.openURL(url).catch(() => setError(fallback))
  }

  return (
    <Screen header={<AppBar title="Aide et contact" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        Une difficulté avec ton identité numérique ? Choisis le moyen qui te convient.
      </Text>
      <Card style={{ marginTop: 16 }}>
        <Row
          icon="smartphone"
          tone="green"
          title="Appeler le centre d’appel"
          sub="1407"
          chevron
          onPress={() => open("tel:1407", "Impossible de lancer l’appel depuis cet appareil. Compose le 1407 depuis un téléphone.")}
        />
        <Row
          icon="mail"
          title="Écrire au support"
          sub="support@identite.ga · réponse sous 48 heures ouvrées"
          chevron
          onPress={() => open("mailto:support@identite.ga", "Aucune application de messagerie n’est configurée. Écris à support@identite.ga.")}
        />
        <Row
          icon="globe"
          title="Consulter le centre d’aide"
          sub="Guides et questions fréquentes"
          chevron
          onPress={() => open("https://identite.ga/help", "Impossible d’ouvrir le centre d’aide. Rends-toi sur identite.ga/help.")}
        />
      </Card>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  )
}
