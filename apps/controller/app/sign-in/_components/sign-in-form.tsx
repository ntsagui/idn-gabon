"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"

import { OtpInput } from "./otp-input"

/**
 * Les comptes sont partagés avec le portail citoyen, dont le parcours de
 * récupération (code par e-mail ou code provisoire remis par un
 * administrateur) sert aussi aux agents.
 */
const FORGOT_PASSWORD_URL = "https://identite.ga/forgot-password"

const MESSAGES = {
  invalid: "Adresse e-mail ou mot de passe incorrect.",
  notVerified: "Vérifiez votre adresse e-mail avant de vous connecter.",
  generic: "Connexion impossible pour le moment. Réessayez.",
}

export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [errors, setErrors] = React.useState<{ email?: string; password?: string }>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [twoFactor, setTwoFactor] = React.useState(false)
  const [code, setCode] = React.useState("")

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const next: typeof errors = {}
    if (!/.+@.+\..+/.test(email.trim())) next.email = "Saisissez une adresse e-mail valide, par exemple prenom.nom@idn.ga."
    if (!password) next.password = "Saisissez votre mot de passe."
    setErrors(next)
    if (next.email || next.password) return

    setSubmitting(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result?.error) {
        const errorCode = result.error.code as string | undefined
        toast.error(
          errorCode === "INVALID_EMAIL_OR_PASSWORD"
            ? MESSAGES.invalid
            : errorCode === "EMAIL_NOT_VERIFIED"
              ? MESSAGES.notVerified
              : MESSAGES.generic,
        )
        setSubmitting(false)
        return
      }
      if ((result?.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
        setTwoFactor(true)
        setSubmitting(false)
        return
      }
      router.replace(redirectTo)
    } catch {
      toast.error(MESSAGES.generic)
      setSubmitting(false)
    }
  }

  const onVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (code.length !== 6) return
    setSubmitting(true)
    try {
      const tf = (authClient as { twoFactor?: { verifyTotp: (a: { code: string }) => Promise<{ error?: unknown }> } })
        .twoFactor
      const result = await tf?.verifyTotp({ code })
      if (!tf || result?.error) {
        toast.error("Code incorrect ou expiré.")
        setSubmitting(false)
        return
      }
      router.replace(redirectTo)
    } catch {
      toast.error(MESSAGES.generic)
      setSubmitting(false)
    }
  }

  if (twoFactor) {
    return (
      <form onSubmit={onVerifyCode} className="mt-8 space-y-5" noValidate>
        <div>
          <h1 className="text-[22px] font-semibold text-idn-ink">Double authentification</h1>
          <p className="mt-1 text-sm text-idn-muted">
            Saisissez le code à 6 chiffres affiché par votre application d&apos;authentification.
          </p>
        </div>
        <OtpInput value={code} onChange={setCode} length={6} autoFocus ariaLabel="Code à 6 chiffres" />
        <Button type="submit" size="lg" className="w-full" disabled={submitting || code.length !== 6}>
          {submitting ? "Vérification…" : "Vérifier le code"}
        </Button>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <h1 className="text-[22px] font-semibold text-idn-ink">Connexion agent</h1>
        <p className="mt-1 text-sm text-idn-muted">Utilisez les identifiants de votre compte contrôleur.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="signin-email">Adresse e-mail</Label>
        <Input
          id="signin-email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signin-email-error" : undefined}
          className="h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {errors.email && (
          <p id="signin-email-error" className="text-[13px] text-destructive">
            {errors.email}
          </p>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="signin-password">Mot de passe</Label>
          <a
            href={FORGOT_PASSWORD_URL}
            className="rounded-sm text-[13px] font-medium text-idn-green-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-idn-green-on-dark"
          >
            Mot de passe oublié ?
          </a>
        </div>
        <Input
          id="signin-password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "signin-password-error" : undefined}
          className="h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {errors.password && (
          <p id="signin-password-error" className="text-[13px] text-destructive">
            {errors.password}
          </p>
        )}
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </form>
  )
}
