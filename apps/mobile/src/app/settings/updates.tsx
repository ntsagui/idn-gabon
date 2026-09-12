import React, { useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useRouter } from "expo-router"
import Constants from "expo-constants"
import * as Updates from "expo-updates"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { NLargeHeader } from "@/components/chrome/large-header"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { prepareAppUpdate } from "@/lib/app-updates"

type Phase =
  | "idle"
  | "checking"
  | "downloading"
  | "current"
  | "ready"
  | "restarting"

export default function SettingsUpdates() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
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
      "Installer la mise à jour ?",
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
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NLargeHeader t={t} title="Mises à jour" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={{
          padding: 22,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <View
          style={{
            backgroundColor: t.surface,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 20,
            gap: 16,
          }}
        >
          <Text style={{ color: t.ink, fontSize: 18, fontWeight: "700" }}>
            Identité Numérique
          </Text>
          <Text style={{ color: t.muted, fontSize: 14 }}>
            Version {Constants.expoConfig?.version ?? "1.0.0"}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: t.ink2, fontSize: 16, lineHeight: 24 }}
          >
            {message}
          </Text>
          {busy ? (
            <ActivityIndicator
              color={idnTokens.green}
              accessibilityLabel="Mise à jour en cours"
            />
          ) : null}
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{
                color: t.dark ? "#FFB4AB" : idnTokens.danger,
                fontSize: 15,
                lineHeight: 22,
              }}
            >
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !enabled || busy, busy }}
            disabled={!enabled || busy}
            onPress={ready ? confirmRestart : () => void check()}
            style={{
              backgroundColor: idnTokens.green,
              opacity: !enabled || busy ? 0.5 : 1,
              padding: 16,
              borderRadius: 10,
              minHeight: 48,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              {ready ? "Redémarrer et installer" : "Rechercher une mise à jour"}
            </Text>
          </Pressable>
        </View>
        <Text
          style={{
            color: t.muted,
            fontSize: 14,
            lineHeight: 22,
            marginTop: 18,
          }}
        >
          L’application recherche aussi les mises à jour à l’ouverture. Une mise
          à jour téléchargée s’applique au prochain démarrage. Certaines
          nouvelles versions nécessitent une installation depuis TestFlight ou
          le store.
        </Text>
      </ScrollView>
    </View>
  )
}
