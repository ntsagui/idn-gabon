"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, Note, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { OtpInput } from "@/app/_components/idn/otp-input"
import { authClient } from "@/lib/auth-client"

import { AuthAppBar, AuthScreen } from "../_components/auth-screen"
import { PasswordStrength } from "../_components/password-strength"
import { getOnboardingEmail } from "../_hooks/use-onboarding-state"

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={null}>
      <ResetPassword />
    </React.Suspense>
  )
}

/** Nouveau mot de passe : code reçu par e-mail (ou remis par un agent), puis mot de passe ×2. */
function ResetPassword() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = React.useState<string | null>(null)
  const [otp, setOtp] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const userInputs = React.useMemo(() => (email ? [email] : []), [email])

  React.useEffect(() => {
    const e = getOnboardingEmail()
    if (!e) {
      router.replace("/forgot-password")
      return
    }
    setEmail(e)
  }, [router])

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    if (!email) return
    if (otp.length !== 6) {
      setError("Code incorrect ou expiré.")
      return
    }
    if (password.length < 12) {
      setError("Mot de passe trop court (12 caractères au moins).")
      return
    }
    if (password !== confirm) {
      setError("Les deux mots de passe sont différents.")
      return
    }
    setSubmitting(true)
    try {
      const result = await authClient.emailOtp.resetPassword({ email, otp, password })
      if (result?.error) {
        const message = String(result.error.message ?? "").toLowerCase()
        setError(message.includes("invalid") || message.includes("expired") ? "Code incorrect ou expiré." : "Réinitialisation impossible. Réessaie.")
        setSubmitting(false)
        return
      }
      setDone(true)
    } catch {
      setError("Réinitialisation impossible. Réessaie.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!email) return null

  if (done) {
    return (
      <AuthScreen
        header={<AuthAppBar title="Nouveau mot de passe" />}
        footer={
          <IdnButton full href="/sign-in">
            Retour à la connexion
          </IdnButton>
        }
      >
        <div className="mt-10 flex justify-center md:mt-2">
          <IdnLottie name="success" size={128} label="Mot de passe modifié" />
        </div>
        <ScreenTitle center title="Mot de passe modifié" lead="Tu peux maintenant te connecter avec ton nouveau mot de passe." />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      header={<AuthAppBar title="Nouveau mot de passe" back="/forgot-password" />}
      footer={
        <IdnButton type="submit" form="reset-password" full loading={submitting}>
          Réinitialiser
        </IdnButton>
      }
    >
      <ScreenTitle
        title="Choisis un nouveau mot de passe"
        lead="Saisis le code reçu ou remis par un agent habilité, puis choisis un nouveau mot de passe."
      />
      {params.get("sent") ? <Note>Code envoyé à {email}. Vérifie ta boîte de réception.</Note> : null}
      <form id="reset-password" onSubmit={submit} className="mt-2">
        <OtpInput
          value={otp}
          onChange={(v) => {
            setError(null)
            setOtp(v)
          }}
          label="Code à 6 chiffres"
          autoFocus
          error={!!error && otp.length !== 6}
        />
        <IdnInput
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setError(null)
            setPassword(e.target.value)
          }}
          aria-describedby="rp-password-strength"
          required
        />
        <PasswordStrength id="rp-password-strength" password={password} userInputs={userInputs} className="mt-2" />
        <IdnInput
          label="Confirmation"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setError(null)
            setConfirm(e.target.value)
          }}
          required
        />
      </form>
      <ErrorNote>{error}</ErrorNote>
    </AuthScreen>
  )
}
