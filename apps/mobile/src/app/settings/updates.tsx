import React, { useRef, useState } from "react"
import { ActivityIndicator, Alert, Platform, View } from "react-native"
import { Text } from "@/design/text"
import { useRouter } from "expo-router"
import Constants from "expo-constants"
import * as Updates from "expo-updates"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Badge } from "@/design/components/badge"
import { Card, DetailRow, ErrorNote, IconTile, Note } from "@/design/components/list"
import { IdnButton } from "@/design/components/idn-button"
import { useIdnTheme } from "@/design/theme"
import { prepareAppUpdate } from "@/lib/app-updates"

type Phase =
  | "idle"
  | "checking"
  | "downloading"
  | "current"
  | "ready"
  | "restarting"

/** Mise à jour actuellement exécutée, lue dans expo-updates. */
function installedUpdate(): string {
  if (Updates.isEmbeddedLaunch || !Updates.createdAt) return "Version d’origine"
  return `Du ${Updates.createdAt.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
}

export default function SettingsUpdates() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isUpdatePending, isChecking, isDownloading } = Updates.useUpdates()
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const working = useRef(false)
  const enabled = Platform.OS !== "web" && !__DEV__ && Updates.isEnabled
  const ready = isUpdatePending || phase === "ready"
  const busy =
    isChecking ||
    isDownloading ||
    ["checking", "downloading", "restarting"].includes(phase)

  async function check() {
    if (working.current || busy || !enabled) return
    working.current = true
    setError(null)
    setPhase("checking")
    try {
      setPhase(await prepareAppUpdate(Updates, () => setPhase("downloading")))
    } catch {
      setPhase("idle")
      setError(
        "La mise à jour n’a pas pu être récupérée. Vérifie ta connexion et réessaie.",
      )
    } finally {
      working.current = false
    }
  }

  async function restart() {
    if (working.current || busy || !enabled || !ready) return
    working.current = true
    setError(null)
    setPhase("restarting")
    try {
      await Updates.reloadAsync()
    } catch {
      setPhase("ready")
      setError(
        "Le redémarrage a échoué. Ferme complètement l’application, puis rouvre-la pour appliquer la mise à jour.",
      )
    } finally {
      working.current = false
    }
  }

  function confirmRestart() {
    Alert.alert(
      "Installer la mise à jour ?",
      "L’application va redémarrer. Termine et enregistre ce que tu fais avant de continuer.",
      [
        { text: "Plus tard", style: "cancel" },
        { text: "Redémarrer", onPress: () => void restart() },
      ],
    )
  }

  const message = !enabled
    ? "Les mises à jour sont disponibles dans la version installée depuis TestFlight ou le store."
    : phase === "restarting"
      ? "Redémarrage en cours…"
      : phase === "downloading" || isDownloading
        ? "Téléchargement de la mise à jour…"
        : phase === "checking" || isChecking
          ? "Recherche d’une mise à jour…"
          : ready
            ? "Une mise à jour est prête. Redémarre l’application pour l’installer."
            : phase === "current"
              ? "Aucune nouvelle mise à jour n’est disponible pour cette version."
              : "Recherche les dernières corrections et améliorations de l’application."

  return (
    <Screen
      header={<AppBar title="Mises à jour" onBack={() => router.back()} />}
      footer={enabled ? (
        <IdnButton t={t} full loading={busy} onPress={ready ? confirmRestart : () => void check()}>
          {ready ? "Redémarrer et installer" : "Rechercher une mise à jour"}
        </IdnButton>
      ) : undefined}
    >
      <Card padded style={{ marginTop: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <IconTile icon="refresh" tone={ready ? "green" : "neutral"} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "600", color: t.ink }}>Identité Numérique</Text>
            <Text style={{ fontSize: 13, color: t.muted, marginTop: 2, fontFamily: t.mono }}>
              Version {Constants.expoConfig?.version ?? "inconnue"}
            </Text>
          </View>
          {ready ? <Badge tone="green" icon="check">Prête</Badge> : phase === "current" ? <Badge tone="neutral">À jour</Badge> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {busy ? <ActivityIndicator color={t.green} accessibilityLabel="Mise à jour en cours" /> : null}
          <Text accessibilityLiveRegion="polite" style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.ink2 }}>
            {message}
          </Text>
        </View>
      </Card>
      <ErrorNote>{error}</ErrorNote>
      {enabled ? (
        <Card style={{ marginTop: 16 }}>
          <DetailRow label="Mise à jour installée" value={installedUpdate()} />
          {Updates.channel ? <DetailRow label="Canal" value={Updates.channel} mono /> : null}
        </Card>
      ) : null}
      <Note>
        L’application recherche aussi les mises à jour à l’ouverture. Une mise à jour téléchargée s’applique au prochain démarrage. Certaines nouvelles versions nécessitent une installation depuis TestFlight ou le store.
      </Note>
    </Screen>
  )
}
