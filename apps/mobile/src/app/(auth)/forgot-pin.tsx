import React, { useState } from "react"
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { Text } from "@/design/text";
import { useLocalSearchParams, useRouter, type Href } from "expo-router"
import { useAction, useMutation } from "convex/react"

import { api } from "@/lib/api"
import { IdnButton } from "@/design/components/idn-button"
import { IdnInput } from "@/design/components/idn-input"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { ErrorNote, ScreenTitle } from "@/design/components/list"
import { IdnLottie } from "@/design/components/lottie"
import { OtpInput } from "@/design/components/otp-input"
import { Keypad, PinDots } from "@/design/components/pin-pad"
import { useIdnTheme } from "@/design/theme"

const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const IDN_DOMAIN = "@idn.ga"

type Phase = "request" | "code" | "new-pin" | "confirm" | "done"

export default function ForgotPin() {
  const t = useIdnTheme()
  const router = useRouter()
  const params = useLocalSearchParams<{ identifier?: string | string[] }>()
  const initialIdentifier = Array.isArray(params.identifier)
    ? (params.identifier[0] ?? "")
    : (params.identifier ?? "")
  const requestReset = useAction(api.pinRecovery.requestReset)
  const verifyCode = useAction(api.pinRecovery.verifyCode)
  const resetPin = useMutation(api.pinRecovery.resetPin)

  const [phase, setPhase] = useState<Phase>("request")
  const [identifier, setIdentifier] = useState(initialIdentifier)
  const [requestId, setRequestId] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [code, setCode] = useState("")
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const normalizedEmail = normalizeIdnIdentifier(identifier)

  function returnToLogin() {
    const target = normalizedEmail
      ? `/(auth)/login?identifier=${encodeURIComponent(normalizedEmail)}`
      : "/(auth)/login"
    router.replace(target as Href)
  }

  async function sendCode() {
    if (!normalizedEmail || submitting) {
      setError("Saisis une adresse IDN valide.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestReset({ identifier: normalizedEmail })
      setRequestId(result.requestId)
      setCode("")
      setPhase("code")
    } catch {
      setError("Envoi impossible pour le moment. Réessaie.")
    } finally {
      setSubmitting(false)
    }
  }

  async function checkCode() {
    if (code.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await verifyCode({ requestId, code })
      if (!result.verified || !result.resetToken) {
        setCode("")
        setError("Code incorrect ou expiré. Recommence si nécessaire.")
        return
      }
      setResetToken(result.resetToken)
      setPhase("new-pin")
    } catch {
      setCode("")
      setError("Code incorrect ou expiré. Recommence si nécessaire.")
    } finally {
      setSubmitting(false)
    }
  }

  async function savePin() {
    if (newPin.length !== 6 || confirmPin.length !== 6 || submitting) return
    if (newPin !== confirmPin) {
      setConfirmPin("")
      setError("Les deux codes sont différents.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await resetPin({ requestId, resetToken, newPin })
      setResetToken("")
      setPhase("done")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Réinitialisation impossible. Réessaie.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    setPhase("request")
    setRequestId("")
    setResetToken("")
    setCode("")
    setNewPin("")
    setConfirmPin("")
    setError(null)
  }

  const title =
    phase === "request"
      ? "Récupérer ton code PIN"
      : phase === "code"
        ? "Saisis le code reçu"
        : phase === "new-pin"
          ? "Choisis un nouveau PIN"
          : phase === "confirm"
            ? "Confirme le nouveau PIN"
            : "Code PIN modifié"
  const subtitle =
    phase === "request"
      ? "Si un numéro de mobile vérifié est associé à ton compte, tu recevras un code par SMS."
      : phase === "code"
        ? "Envoyé par SMS au numéro associé à ton compte. Il reste valable quelques minutes."
        : phase === "done"
          ? "Toutes tes anciennes sessions ont été fermées. Tu peux te reconnecter."
          : "6 chiffres. Évite ta date de naissance."

  function digit(k: string) {
    if (submitting) return
    setError(null)
    if (phase === "new-pin" && newPin.length < 6) {
      const next = newPin + k
      setNewPin(next)
      if (next.length === 6) setTimeout(() => setPhase("confirm"), 150)
    } else if (phase === "confirm" && confirmPin.length < 6) {
      setConfirmPin(confirmPin + k)
    }
  }

  React.useEffect(() => {
    if (phase === "code" && code.length === 6) void checkCode()
    if (phase === "confirm" && confirmPin.length === 6) void savePin()
    // checkCode/savePin lisent l'état courant : on ne relance qu'au 6e chiffre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, confirmPin, phase])

  const isPinPhase = phase === "new-pin" || phase === "confirm"

  return (
    <Screen
      keyboard={!isPinPhase}
      scroll={!isPinPhase}
      header={
        <AppBar
          title="Code PIN oublié"
          onBack={phase === "request" || phase === "done" ? returnToLogin : restart}
        />
      }
      footer={
        phase === "request" ? (
          <IdnButton t={t} full onPress={sendCode} disabled={!normalizedEmail} loading={submitting}>
            Recevoir le code par SMS
          </IdnButton>
        ) : phase === "done" ? (
          <IdnButton t={t} full onPress={returnToLogin}>Retour à la connexion</IdnButton>
        ) : undefined
      }
    >
      {phase === "done" ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <IdnLottie name="success" size={128} label="Code PIN modifié" />
        </View>
      ) : null}
      <View style={isPinPhase ? { flex: 1, justifyContent: "center", alignItems: "center" } : undefined}>
        <ScreenTitle title={title} lead={subtitle} center={isPinPhase || phase === "done"} />
        {phase === "request" ? (
          <View style={{ marginTop: 24 }}>
            <IdnInput
              t={t}
              label="Adresse IDN"
              value={identifier}
              onChangeText={(v) => setIdentifier(v.toLowerCase().trim())}
              placeholder="prenom.nom@idn.ga"
              type="email"
              mono
              autoFocus={!identifier}
            />
          </View>
        ) : null}
        {phase === "code" ? (
          <View style={{ marginTop: 24 }}>
            <OtpInput value={code} onChange={(v) => { setError(null); setCode(v) }} autoFocus error={!!error} />
            {submitting ? <ActivityIndicator color={t.green} style={{ marginTop: 12 }} /> : null}
            <View style={{ alignItems: "center", gap: 4, marginTop: 20 }}>
              <Pressable onPress={sendCode} disabled={submitting} accessibilityRole="button" hitSlop={8}>
                <Text style={{ color: t.greenText, fontSize: 14, fontWeight: "600" }}>Renvoyer le code</Text>
              </Pressable>
              <Text style={{ color: t.muted, fontSize: 13, textAlign: "center", marginTop: 8 }}>
                Rien reçu ? Ton compte peut demander une vérification supplémentaire.
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL("mailto:support@identite.ga?subject=Configuration%20du%20PIN")}
                hitSlop={8}
              >
                <Text style={{ color: t.greenText, fontSize: 14, fontWeight: "600" }}>Contacter le support</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {isPinPhase ? (
          submitting ? (
            <ActivityIndicator color={t.green} style={{ marginTop: 28 }} />
          ) : (
            <PinDots filled={phase === "new-pin" ? newPin.length : confirmPin.length} error={!!error} />
          )
        ) : null}
        <View style={{ alignSelf: "stretch" }}>
          <ErrorNote>{error}</ErrorNote>
        </View>
      </View>
      {isPinPhase ? (
        <View style={{ marginHorizontal: -20, paddingBottom: 12 }}>
          <Keypad
            onDigit={digit}
            onDelete={() => (phase === "new-pin" ? setNewPin((v) => v.slice(0, -1)) : setConfirmPin((v) => v.slice(0, -1)))}
            disabled={submitting}
          />
        </View>
      ) : null}
    </Screen>
  )
}

function normalizeIdnIdentifier(input: string): string | null {
  const raw = input.trim().toLowerCase()
  const handle = raw.endsWith(IDN_DOMAIN)
    ? raw.slice(0, -IDN_DOMAIN.length)
    : raw
  if (handle.length < 3 || handle.length > 32 || !HANDLE_REGEX.test(handle))
    return null
  return `${handle}${IDN_DOMAIN}`
}
