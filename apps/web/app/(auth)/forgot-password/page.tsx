"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, Note, ScreenTitle } from "@/app/_components/idn/list"
import { authClient } from "@/lib/auth-client"

import { AuthAppBar, AuthScreen } from "../_components/auth-screen"
import { setOnboardingEmail } from "../_hooks/use-onboarding-state"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Mot de passe oublié — comptes à mot de passe (créés par un organisme puis
 * récupérés). Envoie un code à 6 chiffres par e-mail, ou passe directement à
 * la saisie d'un code provisoire déjà remis par un agent.
 */
export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const valid = EMAIL_REGEX.test(email.trim())

  async function send(e?: React.FormEvent) {
    e?.preventDefault()
    if (!valid) {
      setError("Saisis une adresse e-mail valide.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "forget-password" })
      if (result?.error) {
        setError("Envoi impossible pour le moment. Réessaie.")
        setSubmitting(false)
        return
      }
      setOnboardingEmail(email.trim())
      router.push("/reset-password?sent=1")
    } catch {
      setError("Envoi impossible pour le moment. Réessaie.")
      setSubmitting(false)
    }
  }

  // Voie de secours : l'agent a déjà remis un code. Pas d'envoi, qui
  // remplacerait le code provisoire tout juste généré.
  function goToExistingCode() {
    if (!valid) {
      setError("Saisis une adresse e-mail valide.")
      return
    }
    setOnboardingEmail(email.trim())
    router.push("/reset-password")
  }

  return (
    <AuthScreen
      header={<AuthAppBar title="Mot de passe oublié" back="/sign-in" />}
      footer={
        <>
          <IdnButton type="submit" form="forgot-password" full disabled={!valid} loading={submitting}>
            Recevoir un code
          </IdnButton>
          <IdnButton variant="ghost" full onClick={goToExistingCode} disabled={!valid || submitting}>
            J’ai déjà un code provisoire
          </IdnButton>
        </>
      }
    >
      <ScreenTitle
        title="Réinitialiser ton mot de passe"
        lead="Saisis l’adresse e-mail associée à ton compte. Tu recevras un code à 6 chiffres pour choisir un nouveau mot de passe."
      />
      <form id="forgot-password" onSubmit={send} className="mt-6">
        <IdnInput
          label="Adresse e-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setError(null)
            setEmail(e.target.value)
          }}
          autoFocus
          required
        />
      </form>
      <ErrorNote>{error}</ErrorNote>
      <Note>Si un agent habilité t’a remis un code provisoire, choisis « J’ai déjà un code provisoire ».</Note>
    </AuthScreen>
  )
}
