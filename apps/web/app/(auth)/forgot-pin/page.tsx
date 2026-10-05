"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAction, useMutation } from "convex/react"
import { ConvexError } from "convex/values"

import { api } from "@repo/backend/convex/_generated/api"

import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { OtpInput } from "@/app/_components/idn/otp-input"
import { Keypad, PinDots } from "@/app/_components/idn/pin"
import { normalizeIdnIdentifier } from "@/lib/citizen/idn-identifier"

import { AuthAppBar, AuthScreen } from "../_components/auth-screen"
import { Spinner } from "../_components/pin-login"

type Phase = "request" | "code" | "admin-code" | "new-pin" | "confirm" | "done"

export default function ForgotPinPage() {
  return (
    <React.Suspense fallback={null}>
      <ForgotPin />
    </React.Suspense>
  )
}

function resetErrorMessage(err: unknown): string {
  const data = err instanceof ConvexError && typeof err.data === "object" ? (err.data as { code?: string; message?: string }) : null
  if (data?.code === "SAME_PIN") return "Choisis un code PIN différent de l’ancien."
  if (data?.code === "INVALID_RESET_TOKEN") return "Cette demande a expiré. Recommence la récupération."
  if (data?.message) return data.message
  return err instanceof Error ? cleanError(err.message) : "Réinitialisation impossible. Réessaie."
}

/**
 * Code PIN oublié (apps/mobile/src/app/(auth)/forgot-pin.tsx) : adresse →
 * code SMS → nouveau PIN → confirmation → succès. Le web garde en plus la
 * voie du code provisoire remis par un agent habilité (`verifyAdminCode`).
 */
function ForgotPin() {
  const router = useRouter()
  const params = useSearchParams()
  const requestReset = useAction(api.pinRecovery.requestReset)
  const verifyCode = useAction(api.pinRecovery.verifyCode)
  const verifyAdminCode = useMutation(api.pinRecovery.verifyAdminCode)
  const resetPin = useMutation(api.pinRecovery.resetPin)

  const [phase, setPhase] = React.useState<Phase>("request")
  const [identifier, setIdentifier] = React.useState(params.get("identifier") ?? "")
  const [requestId, setRequestId] = React.useState("")
  const [resetToken, setResetToken] = React.useState("")
  const [code, setCode] = React.useState("")
  const [newPin, setNewPin] = React.useState("")
  const [confirmPin, setConfirmPin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const live = React.useRef({ newPin: "", confirmPin: "" })
  live.current = { newPin, confirmPin }

  const normalizedEmail = normalizeIdnIdentifier(identifier)?.email ?? null

  function returnToLogin() {
    const next = new URLSearchParams(params.toString())
    next.delete("identifier")
    if (normalizedEmail) next.set("identifier", normalizedEmail)
    const qs = next.toString()
    router.replace(qs ? `/sign-in?${qs}` : "/sign-in")
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
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

  // Voie de secours : un agent habilité a remis un code depuis la console.
  // Aucun envoi n'est déclenché, le code existe déjà.
  function startAdminCode() {
    if (!normalizedEmail) {
      setError("Saisis une adresse IDN valide.")
      return
    }
    setCode("")
    setError(null)
    setPhase("admin-code")
  }

  async function checkCode(value: string) {
    if (value.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (phase === "admin-code") {
        const result = await verifyAdminCode({ identifier: normalizedEmail ?? "", code: value })
        if (!result.verified || !result.requestId || !result.resetToken) {
          setCode("")
          setError("Code incorrect, expiré ou déjà utilisé. Demande un nouveau code à l’agent.")
          return
        }
        setRequestId(result.requestId)
        setResetToken(result.resetToken)
      } else {
        const result = await verifyCode({ requestId, code: value })
        if (!result.verified || !result.resetToken) {
          setCode("")
          setError("Code incorrect ou expiré. Recommence si nécessaire.")
          return
        }
        setResetToken(result.resetToken)
      }
      setNewPin("")
      setConfirmPin("")
      setPhase("new-pin")
    } catch {
      setCode("")
      setError(
        phase === "admin-code"
          ? "Code incorrect, expiré ou déjà utilisé. Demande un nouveau code à l’agent."
          : "Code incorrect ou expiré. Recommence si nécessaire."
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function savePin(first: string, second: string) {
    if (first.length !== 6 || second.length !== 6 || submitting) return
    if (first !== second) {
      setConfirmPin("")
      setError("Les deux codes sont différents.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await resetPin({ requestId, resetToken, newPin: first })
      setResetToken("")
      setPhase("done")
    } catch (caught) {
      setConfirmPin("")
      setError(resetErrorMessage(caught))
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

  function digit(k: string) {
    if (submitting) return
    setError(null)
    const cur = live.current
    if (phase === "new-pin" && cur.newPin.length < 6) {
      const next = cur.newPin + k
      live.current.newPin = next
      setNewPin(next)
      if (next.length === 6) setTimeout(() => setPhase("confirm"), 150)
    } else if (phase === "confirm" && cur.confirmPin.length < 6) {
      const next = cur.confirmPin + k
      live.current.confirmPin = next
      setConfirmPin(next)
      if (next.length === 6) void savePin(cur.newPin, next)
    }
  }

  const title = {
    request: "Récupérer ton code PIN",
    code: "Saisis le code reçu",
    "admin-code": "Code remis par un agent",
    "new-pin": "Choisis un nouveau PIN",
    confirm: "Confirme le nouveau PIN",
    done: "Code PIN modifié",
  }[phase]
  const subtitle = {
    request: "Si un numéro de mobile vérifié est associé à ton compte, tu recevras un code par SMS.",
    code: "Envoyé par SMS au numéro associé à ton compte. Il reste valable quelques minutes.",
    "admin-code": "Saisis le code à 6 chiffres que l’agent habilité t’a remis. Il est valable 15 minutes, pour trois essais au plus.",
    "new-pin": "6 chiffres. Évite ta date de naissance.",
    confirm: "6 chiffres. Évite ta date de naissance.",
    done: "Toutes tes anciennes sessions ont été fermées. Tu peux te reconnecter.",
  }[phase]

  const isPinPhase = phase === "new-pin" || phase === "confirm"
  const isCodePhase = phase === "code" || phase === "admin-code"

  return (
    <AuthScreen
      header={<AuthAppBar title="Code PIN oublié" onBack={phase === "request" || phase === "done" ? returnToLogin : restart} />}
      contentClassName={isPinPhase ? "flex flex-col" : undefined}
      footer={
        phase === "request" ? (
          <>
            <IdnButton type="submit" form="forgot-pin-request" full disabled={!normalizedEmail} loading={submitting}>
              Recevoir le code par SMS
            </IdnButton>
            <IdnButton variant="ghost" full onClick={startAdminCode} disabled={!normalizedEmail || submitting}>
              J’ai déjà un code provisoire
            </IdnButton>
          </>
        ) : phase === "done" ? (
          <IdnButton full onClick={returnToLogin}>
            Retour à la connexion
          </IdnButton>
        ) : undefined
      }
    >
      {phase === "done" ? (
        <div className="mt-10 flex justify-center md:mt-2">
          <IdnLottie name="success" size={128} label="Code PIN modifié" />
        </div>
      ) : null}
      <div className={isPinPhase ? "flex flex-1 flex-col items-center justify-center pt-6" : undefined}>
        <ScreenTitle title={title} lead={subtitle} center={isPinPhase || phase === "done"} />
        {phase === "request" ? (
          <form id="forgot-pin-request" onSubmit={sendCode} className="mt-6">
            <IdnInput
              label="Adresse IDN"
              value={identifier}
              onChange={(e) => {
                setError(null)
                setIdentifier(e.target.value.toLowerCase().trim())
              }}
              placeholder="prenom.nom@idn.ga"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              mono
              autoFocus={!identifier}
            />
          </form>
        ) : null}
        {isCodePhase ? (
          <div className="mt-6">
            <OtpInput
              value={code}
              onChange={(v) => {
                setError(null)
                setCode(v)
                if (v.length === 6) void checkCode(v)
              }}
              label={phase === "admin-code" ? "Code provisoire" : "Code reçu par SMS"}
              autoFocus
              error={!!error}
              disabled={submitting}
            />
            {submitting ? <Spinner label="Vérification du code" className="mt-3 flex justify-center" /> : null}
            {phase === "code" ? (
              <div className="mt-5 flex flex-col items-center gap-1 text-center">
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={submitting}
                  className="rounded-[6px] text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
                >
                  Renvoyer le code
                </button>
                <p className="mt-2 text-[13px] text-idn-muted">Rien reçu ? Ton compte peut demander une vérification supplémentaire.</p>
                <a
                  href="mailto:support@identite.ga?subject=Configuration%20du%20PIN"
                  className="rounded-[6px] text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Contacter le support
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
        {isPinPhase ? (
          submitting ? (
            <Spinner label="Enregistrement du nouveau code PIN" className="mt-7 inline-flex" />
          ) : (
            <PinDots filled={phase === "new-pin" ? newPin.length : confirmPin.length} error={!!error} />
          )
        ) : null}
        <div className="self-stretch">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
      {isPinPhase ? (
        <div className="pb-3">
          <Keypad
            onDigit={digit}
            onDelete={() => (phase === "new-pin" ? setNewPin((v) => v.slice(0, -1)) : setConfirmPin((v) => v.slice(0, -1)))}
            disabled={submitting}
          />
        </div>
      ) : null}
    </AuthScreen>
  )
}
