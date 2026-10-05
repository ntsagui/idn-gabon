import React, { useState } from "react"
import { Alert, Modal, Platform, Pressable, View } from "react-native";
import { Text } from "@/design/text";
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import * as LocalAuth from "expo-local-authentication"
import { useIdnTheme } from "@/design/theme"
import { IdnButton } from "@/design/components/idn-button"
import { IdnInput } from "@/design/components/idn-input"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, ErrorNote, Note, Row, SectionTitle } from "@/design/components/list"
import { Keypad, PinDots } from "@/design/components/pin-pad"
import { maskNip } from "@/lib/nip-format"
import { BIOMETRIC, BIOMETRIC_TITLE } from "@/lib/biometric-label"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

import { biometricEnabledFor, deletePasskey, listPasskeys, passkeyErrorMessage, PasskeyUnavailableError, setBiometricForSession, type Passkey } from "@/lib/passkeys"

function fmtDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function PinChangeModal({
  visible,
  configured,
  onClose,
}: {
  visible: boolean
  configured: boolean
  onClose: () => void
}) {
  const t = useIdnTheme()
  const insets = useSafeAreaInsets()
  const createPin = useMutation(api.onboarding.createPin)
  const changePin = useMutation(api.onboarding.changePin)
  const [phase, setPhase] = useState<"check" | "new" | "confirm">("check")
  const [pin, setPin] = useState("")
  const [currentPin, setCurrentPin] = useState("")
  const [newPin, setNewPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setPhase(configured ? "check" : "new")
    setPin("")
    setCurrentPin("")
    setNewPin("")
    setError(null)
    setSubmitting(false)
  }

  function close() {
    reset()
    onClose()
  }

  async function complete(value: string) {
    setError(null)
    if (phase === "check") {
      setCurrentPin(value)
      setPhase("new")
      setPin("")
      return
    }
    if (phase === "new") {
      setNewPin(value)
      setPhase("confirm")
      setPin("")
      return
    }
    if (value !== newPin) {
      setError("Les deux codes sont différents.")
      setPhase("new")
      setPin("")
      setNewPin("")
      return
    }
    setSubmitting(true)
    try {
      if (configured) await changePin({ currentPin, newPin: value })
      else await createPin({ pin: value })
      close()
      Alert.alert("Code PIN modifié", "Ton nouveau code PIN est actif.")
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Modification impossible.",
      )
      setPin("")
      setSubmitting(false)
    }
  }

  function press(key: string) {
    if (!key || submitting) return
    if (key === "⌫") {
      setPin((value) => value.slice(0, -1))
      return
    }
    if (pin.length >= 6) return
    const value = pin + key
    setPin(value)
    if (value.length === 6) void complete(value)
  }

  const title =
    phase === "check"
      ? "Ton code PIN actuel"
      : phase === "new"
        ? "Ton nouveau code PIN"
        : "Confirme le nouveau code"
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={reset} onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 12) }}>
        <AppBar title={configured ? "Changer le code PIN" : "Créer un code PIN"} onBack={close} backIcon="close" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600", color: t.ink }}>{title}</Text>
          <Text style={{ marginTop: 6, fontSize: 14, color: t.muted, textAlign: "center" }}>6 chiffres. Évite ta date de naissance.</Text>
          <PinDots filled={pin.length} error={!!error} />
          <View style={{ alignSelf: "stretch" }}>
            <ErrorNote>{error}</ErrorNote>
          </View>
        </View>
        <Keypad
          onDigit={(d) => press(d)}
          onDelete={() => press("⌫")}
          disabled={submitting}
        />
      </View>
    </Modal>
  )
}

function NipChangeModal({
  visible,
  currentNip,
  onClose,
}: {
  visible: boolean
  currentNip?: string
  onClose: () => void
}) {
  const t = useIdnTheme()
  const insets = useSafeAreaInsets()
  const updateNip = useMutation(api.profile.updateNip)
  const [nip, setNip] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function close() {
    setNip("")
    setError(null)
    setSubmitting(false)
    onClose()
  }

  async function submit() {
    if (!/^[A-Za-z0-9]{14}$/.test(nip)) {
      setError("Le NIP doit contenir exactement 14 lettres ou chiffres.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateNip({ nip })
      close()
      Alert.alert(
        "NIP enregistré",
        "Ton numéro d’identification personnel est à jour.",
      )
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Mise à jour impossible.",
      )
      setSubmitting(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: t.bg, paddingBottom: Math.max(insets.bottom, 12) }}>
        <AppBar title="Numéro d’identification (NIP)" onBack={close} backIcon="close" />
        <View style={{ padding: 20, gap: 16 }}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: t.muted }}>
            {currentNip
              ? "Ton NIP figure sur ta carte d’identité. Corrige-le seulement s’il est erroné."
              : "Saisis le NIP de 14 caractères inscrit sur ta carte d’identité."}
          </Text>
          <IdnInput
            t={t}
            label="NIP"
            value={nip}
            onChangeText={(v) => setNip(v.replace(/\s+/g, "").toUpperCase())}
            placeholder={currentNip ?? "14 lettres ou chiffres"}
            autoCapitalize="characters"
            maxLength={14}
            mono
            error={error ?? undefined}
          />
          <IdnButton t={t} full onPress={submit} loading={submitting} disabled={nip.length !== 14}>Enregistrer</IdnButton>
        </View>
      </View>
    </Modal>
  )
}

export default function SettingsSecurity() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const user = useQuery(
    api.profile.getCurrentUser,
    isAuthenticated ? {} : "skip",
  )
  // « Changer le code PIN » depuis le Profil ouvre directement la saisie.
  const { action } = useLocalSearchParams<{ action?: string }>()
  const [pinOpen, setPinOpen] = useState(action === "pin")
  const [nipOpen, setNipOpen] = useState(false)
  const [faceUnlock, setFaceUnlock] = useState(false)
  const [passkeys, setPasskeys] = useState<Passkey[] | undefined>()
  const [pkError, setPkError] = useState<string | null>(null)
  const [pkUnavailable, setPkUnavailable] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadPasskeys = React.useCallback(async () => {
    try {
      setPasskeys(await listPasskeys())
      setPkError(null)
    } catch (caught) {
      setPasskeys([])
      setPkUnavailable(caught instanceof PasskeyUnavailableError)
      setPkError(
        caught instanceof Error ? caught.message : "Chargement impossible.",
      )
    }
  }, [])

  React.useEffect(() => {
    void biometricEnabledFor(user?.email).then(setFaceUnlock)
  }, [user?.email])

  React.useEffect(() => {
    if (isAuthenticated) void loadPasskeys()
  }, [isAuthenticated, loadPasskeys])

  async function toggleBiometrics(enabled: boolean) {
    if (!enabled) {
      await setBiometricForSession(false)
      setFaceUnlock(false)
      return
    }
    try {
      if (Platform.OS !== "web") {
        const [hardware, enrolled] = await Promise.all([
          LocalAuth.hasHardwareAsync(),
          LocalAuth.isEnrolledAsync(),
        ])
        if (!hardware || !enrolled) {
          Alert.alert(
            "Biométrie indisponible",
            "Configure Face ID, Touch ID ou la biométrie Android dans les réglages du téléphone.",
          )
          return
        }
      }
      const existing = passkeys?.some(
        (passkey) => passkey.name === "Biométrie de cet appareil",
      )
      if (!existing) {
        const result = await authClient.passkey.addPasskey({
          name: "Biométrie de cet appareil",
        })
        if (result?.error)
          throw new Error(passkeyErrorMessage(result.error, "Activation impossible."))
      }
      await setBiometricForSession(true)
      setFaceUnlock(true)
      await loadPasskeys()
    } catch (caught) {
      await setBiometricForSession(false)
      setFaceUnlock(false)
      Alert.alert(
        "Activation impossible",
        caught instanceof Error ? caught.message : "Réessaie plus tard.",
      )
    }
  }

  async function addSecurityKey() {
    if (adding) return
    setAdding(true)
    setPkError(null)
    try {
      const result = await authClient.passkey.addPasskey({
        name: `Clé de sécurité · ${fmtDate(Date.now())}`,
        authenticatorAttachment: "cross-platform",
      })
      if (result?.error)
        throw new Error(passkeyErrorMessage(result.error, "Ajout impossible."))
      await loadPasskeys()
    } catch (caught) {
      setPkError(caught instanceof Error ? caught.message : "Ajout impossible.")
    } finally {
      setAdding(false)
    }
  }

  function removePasskey(passkey: Passkey) {
    Alert.alert(
      "Supprimer cette clé ?",
      `${passkey.name || "Clé sans nom"} ne pourra plus servir à te connecter.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            setDeleting(passkey.id)
            try {
              await deletePasskey(passkey.id)
              await loadPasskeys()
            } catch (caught) {
              setPkError(
                caught instanceof Error
                  ? caught.message
                  : "Suppression impossible.",
              )
            } finally {
              setDeleting(null)
            }
          },
        },
      ],
    )
  }

  const pinConfigured = user?.profile?.pinConfigured ?? false
  const currentNip = user?.profile?.pivot?.nip
  const keySummary = pkError
    ? pkError
    : passkeys === undefined
      ? "Chargement…"
      : `${passkeys.length} clé${passkeys.length > 1 ? "s" : ""} enregistrée${passkeys.length > 1 ? "s" : ""}`

  return (
    <Screen header={<AppBar title="Sécurité" onBack={() => router.back()} />}>
      <SectionTitle>Identifiants</SectionTitle>
      <Card>
        <Row icon="lock" title={pinConfigured ? "Changer le code PIN" : "Créer un code PIN"} sub="6 chiffres pour te connecter et valider tes actions" chevron onPress={() => setPinOpen(true)} />
        <Row icon="pin" title="NIP" sub={currentNip ? maskNip(currentNip) : "Non renseigné"} mono={!!currentNip} chevron onPress={() => setNipOpen(true)} />
        <Row icon="keyRound" title="Code PIN oublié" sub="Réinitialisation par SMS" chevron onPress={() => router.push(user?.email ? (`/(auth)/forgot-pin?identifier=${encodeURIComponent(user.email)}` as never) : ("/(auth)/forgot-pin" as never))} />
      </Card>

      <SectionTitle>Biométrie</SectionTitle>
      {pkUnavailable ? (
        <Note style={{ marginTop: 0, marginBottom: 10 }}>{`${BIOMETRIC_TITLE} et les clés d’accès ne sont pas encore activés sur le service IDN. Connecte-toi avec ton code PIN en attendant.`}</Note>
      ) : null}
      <Card>
        <Row
          icon="scanFace"
          title={BIOMETRIC_TITLE}
          sub={faceUnlock ? `Déverrouillage par ${BIOMETRIC} activé sur cet appareil` : "Déverrouille l’app sans saisir ton PIN"}
          right={
            <Pressable
              onPress={() => void toggleBiometrics(!faceUnlock)}
              disabled={pkUnavailable}
              accessibilityRole="switch"
              accessibilityState={{ checked: faceUnlock, disabled: pkUnavailable }}
              accessibilityLabel={BIOMETRIC_TITLE}
              style={{ width: 52, height: 32, borderRadius: 9999, padding: 3, backgroundColor: faceUnlock ? t.green : t.border, justifyContent: "center", opacity: pkUnavailable ? 0.45 : 1 }}
            >
              <View style={{ width: 26, height: 26, borderRadius: 9999, backgroundColor: "#fff", alignSelf: faceUnlock ? "flex-end" : "flex-start" }} />
            </Pressable>
          }
        />
      </Card>

      <SectionTitle>Clés d’accès</SectionTitle>
      {pkUnavailable ? null : <Text style={{ fontSize: 13, lineHeight: 19, color: pkError ? t.redText : t.muted, marginBottom: 8 }}>{keySummary}</Text>}
      <Card>
        {(passkeys ?? []).map((pk) => (
          <Row
            key={pk.id}
            icon="keyRound"
            tone="green"
            title={pk.name || "Clé sans nom"}
            sub={`Ajoutée le ${fmtDate(pk.createdAt)}`}
            right={
              <Pressable onPress={() => removePasskey(pk)} disabled={deleting !== null} accessibilityRole="button" accessibilityLabel={`Supprimer ${pk.name || "la clé"}`} hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: t.redText }}>{deleting === pk.id ? "…" : "Supprimer"}</Text>
              </Pressable>
            }
          />
        ))}
        <Row icon="plus" title="Ajouter une clé de sécurité" sub={pkUnavailable ? "Pas encore disponible" : "Clé physique ou autre appareil"} chevron={!pkUnavailable} onPress={pkUnavailable ? undefined : addSecurityKey} disabled={adding} />
      </Card>
      <Note>Les clés d’accès (passkeys) remplacent le mot de passe : elles restent sur ton appareil et ne sont jamais envoyées à IDN.</Note>

      <PinChangeModal visible={pinOpen} configured={pinConfigured} onClose={() => setPinOpen(false)} />
      <NipChangeModal visible={nipOpen} currentNip={currentNip} onClose={() => setNipOpen(false)} />
    </Screen>
  )
}
