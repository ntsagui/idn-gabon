"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { authClient } from "@/lib/auth-client"
import {
  BIOMETRIC,
  BIOMETRIC_TITLE,
  isServerFailure,
  listPasskeys,
  passkeyErrorMessage,
  PasskeyUnavailableError,
  setBiometricForSession,
} from "@/lib/citizen/passkeys"

import { SignupScreen } from "../auth-screen"

/** null : vérification en cours ; "device" : pas de WebAuthn ; "service" : clés non activées côté serveur. */
type Availability = null | "ok" | "device" | "service"

/**
 * Activation de la biométrie (apps/mobile/src/app/(auth)/signup/bio.tsx).
 * Dans le navigateur elle passe par une clé d'accès WebAuthn. Avant de
 * proposer l'activation, on vérifie que le service des clés répond : sinon
 * l'écran l'annonce au lieu d'offrir un bouton voué à l'échec.
 */
export function BioStep() {
  const router = useRouter()
  const nextHref = "/sign-up?step=done"
  const [availability, setAvailability] = React.useState<Availability>(null)
  const [activating, setActivating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!("PublicKeyCredential" in window)) {
      setAvailability("device")
      return
    }
    let cancelled = false
    listPasskeys()
      .then(() => !cancelled && setAvailability("ok"))
      .catch((err) => !cancelled && setAvailability(err instanceof PasskeyUnavailableError ? "service" : "ok"))
    return () => {
      cancelled = true
    }
  }, [])

  async function activate() {
    setActivating(true)
    setError(null)
    try {
      const res = await authClient.passkey.addPasskey({ name: BIOMETRIC_TITLE })
      if (res?.error) {
        if (isServerFailure(res.error)) setAvailability("service")
        setError(passkeyErrorMessage(res.error, "Impossible de créer la clé d’accès. Réessaie ou continue avec ton PIN."))
        setActivating(false)
        return
      }
      await setBiometricForSession(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l’activation.")
      setActivating(false)
      return
    }
    router.replace(nextHref)
  }

  const available = availability === "ok"
  const title = availability === null ? `Active ${BIOMETRIC}` : available ? `Active ${BIOMETRIC}` : "Biométrie indisponible"
  const lead =
    availability === "service"
      ? passkeyErrorMessage({ status: 500 }, "")
      : availability === "device"
        ? `Aucun capteur biométrique n’est configuré sur cet appareil. Tu pourras activer ${BIOMETRIC} plus tard dans Profil.`
        : "Déverrouille l’app et connecte-toi sans saisir ton PIN. Une clé d’accès (passkey) est créée et reste sur cet appareil."

  const content = (
    <div className="flex flex-1 flex-col items-center justify-center pt-8 text-center md:pt-4">
      <IdnLottie name="biometric" size={128} loop label="Reconnaissance biométrique" />
      <h2 className="mt-4 text-[22px] font-semibold leading-7 text-idn-ink">{title}</h2>
      <p aria-live="polite" className="mt-1.5 max-w-[320px] text-sm leading-5 text-idn-muted">
        {availability === null ? "Vérification de la disponibilité…" : lead}
      </p>
      <div className="self-stretch text-left">
        <ErrorNote>{availability === "service" ? null : error}</ErrorNote>
      </div>
    </div>
  )
  const footer = (
    <>
      {available ? (
        <IdnButton full onClick={() => void activate()} loading={activating} leadIcon={<Icon name="scanFace" size={18} />}>
          {`Activer ${BIOMETRIC}`}
        </IdnButton>
      ) : null}
      <IdnButton variant="ghost" full onClick={() => router.replace(nextHref)} disabled={activating || availability === null}>
        {available ? "Plus tard" : "Continuer"}
      </IdnButton>
    </>
  )

  return (
    <SignupScreen step={3} footer={footer} onBack={() => router.replace(nextHref)} contentClassName="flex flex-col">
      {content}
    </SignupScreen>
  )
}
