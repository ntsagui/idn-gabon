import React from "react"
import { Alert, View } from "react-native"
import { useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { Text } from "@/design/text"
import { useIdnTheme } from "@/design/theme"
import type { IconName } from "@/design/icons"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, Note, Row } from "@/design/components/list"
import { IdnButton } from "@/design/components/idn-button"
import { IdnLottie } from "@/design/components/lottie"
import { scopeLabel } from "@/lib/consent-scopes"
import { api } from "@/lib/api"

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

/** Applications partenaires autorisées et révocation de leur accès. */
export default function Consents() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const list = useQuery(api.oauthConsents.listMine, isAuthenticated ? {} : "skip")
  const revoke = useMutation(api.oauthConsents.revokeForClient)
  const [revoking, setRevoking] = React.useState<string | null>(null)

  function confirm(clientId: string, appName: string) {
    Alert.alert(
      `Retirer l’accès à ${appName} ?`,
      "L’application ne pourra plus accéder à tes informations. Elle te redemandera ton autorisation à ta prochaine connexion.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Retirer", style: "destructive", onPress: () => void handleRevoke(clientId) },
      ],
    )
  }

  async function handleRevoke(clientId: string) {
    setRevoking(clientId)
    try {
      await revoke({ clientId })
      Alert.alert("Accès retiré", "L’autorisation et les jetons actifs de cette application ont été révoqués.")
    } catch (caught) {
      Alert.alert("Révocation impossible", caught instanceof Error ? caught.message : "Réessaie dans un instant.")
    } finally {
      setRevoking(null)
    }
  }

  return (
    <Screen header={<AppBar title="Applications autorisées" onBack={() => router.back()} />}>
      {list === undefined ? (
        <View style={{ alignItems: "center", paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement des applications" />
        </View>
      ) : list.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 24 }}>
          <IdnLottie name="partage" size={120} />
          <Text accessibilityRole="header" style={{ marginTop: 8, fontSize: 17, fontWeight: "600", color: t.ink, textAlign: "center" }}>
            Aucune application autorisée
          </Text>
          <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: "center" }}>
            Quand tu te connectes à un service avec ton compte IDN, il apparaît ici avec les informations que tu lui partages.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
            {list.length} application{list.length > 1 ? "s ont" : " a"} accès à une partie de tes informations. Tu peux retirer cet accès à tout moment.
          </Text>
          {list.map((consent) => (
            <View key={consent.id} style={{ marginTop: 16 }}>
              <Card>
                <Row
                  icon="building"
                  tone="blue"
                  title={consent.appName}
                  sub={`Autorisée depuis le ${DATE.format(consent.grantedAt)}`}
                />
                {consent.scopes.map((scope) => {
                  const meta = scopeLabel(scope)
                  return <Row key={scope} icon={meta.icon as IconName} title={meta.title} sub={meta.sub} />
                })}
              </Card>
              <IdnButton
                t={t}
                variant="dangerGhost"
                full
                style={{ marginTop: 8 }}
                loading={revoking === consent.clientId}
                disabled={revoking !== null && revoking !== consent.clientId}
                onPress={() => confirm(consent.clientId, consent.appName)}
                accessibilityLabel={`Retirer l’accès à ${consent.appName}`}
              >
                {revoking === consent.clientId ? "Révocation…" : "Retirer l’accès"}
              </IdnButton>
            </View>
          ))}
          <Note center>Retirer l’accès n’efface pas les données que l’application a déjà reçues : adresse-toi à elle pour cela.</Note>
        </>
      )}
    </Screen>
  )
}
