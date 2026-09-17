"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LockIcon, MailIcon, QrCodeIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@repo/ui/components/button"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { authClient } from "@/lib/auth-client"

import { signIn } from "../_content/sign-in"
import { safeRedirectTo } from "../_lib/redirect"
import { OtpInput } from "./otp-input"

/**
 * L'app contrôleur n'a pas de route `/forgot-password` : les comptes sont
 * partagés avec le portail citoyen, dont le parcours de récupération (code
 * par email ou code provisoire remis par un administrateur) sert aussi ici.
 * Même origine que `PUBLIC_SITE_URL` dans `apps/developer/lib/seo.ts`.
 */
const FORGOT_PASSWORD_URL = "https://identite.ga/forgot-password"

/**
 * Formulaire de connexion — copie 1:1 de
 * `apps/web/app/(auth)/sign-in/page.tsx`. La page d'accueil contrôleur
 * délègue à ce composant quand la session n'existe pas.
 *
 * Le redirect par défaut est "/" (sur controleur.identite.ga, "/" rend
 * directement le dashboard quand on est connecté). Pas de page séparée.
 */
export function SignInForm({ notice }: { notice?: string } = {}) {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = safeRedirectTo(params.get("redirect_to"), "/")

  const [twoFactorRequired, setTwoFactorRequired] = React.useState(false)
  const [twoFactorCode, setTwoFactorCode] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [emailError, setEmailError] = React.useState<string | null>(null)
  const [passwordError, setPasswordError] = React.useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    let valid = true
    if (!email.trim() || !/.+@.+\..+/.test(email)) {
      setEmailError("Adresse email invalide.")
      valid = false
    } else {
      setEmailError(null)
    }
    if (!password) {
      setPasswordError("Mot de passe requis.")
      valid = false
    } else {
      setPasswordError(null)
    }
    if (!valid) return

    setSubmitting(true)
    try {
      const result = await authClient.signIn.email({
        email: email.trim(),
        password,
      })
      if (result?.error) {
        const code = result.error.code as string | undefined
        toast.error(
          code === "INVALID_EMAIL_OR_PASSWORD"
            ? signIn.errorInvalid
            : code === "EMAIL_NOT_VERIFIED"
              ? signIn.errorEmailNotVerified
              : (result.error.message ?? signIn.errorGeneric),
        )
        setSubmitting(false)
        return
      }
      const data = result?.data as
        | { twoFactorRedirect?: boolean }
        | null
        | undefined
      if (data?.twoFactorRedirect) {
        setTwoFactorRequired(true)
        setSubmitting(false)
        return
      }
      router.push(redirectTo)
      router.refresh()
    } catch {
      toast.error(signIn.errorGeneric)
      setSubmitting(false)
    }
  }

  const onSubmit2FA = async () => {
    if (twoFactorCode.length !== 6) return
    setSubmitting(true)
    try {
      const tf = (
        authClient as unknown as {
          twoFactor?: {
            verifyTotp: (a: { code: string }) => Promise<{ error?: unknown }>
          }
        }
      ).twoFactor
      const result = await tf?.verifyTotp({ code: twoFactorCode })
      if (result?.error) {
        toast.error(signIn.errorInvalid)
        setSubmitting(false)
        return
      }
      router.push(redirectTo)
      router.refresh()
    } catch {
      toast.error(signIn.errorGeneric)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center px-6 py-10 sm:py-16">
      {!twoFactorRequired ? (
        <>
          <div className="flex flex-col items-center text-center">
            <IdnMark size={56} />
            <h1 className="mt-5 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-[28px]">
              {signIn.title}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{signIn.sub}</p>
          </div>

          {notice && (
            <div
              role="alert"
              className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {notice}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="signin-email">{signIn.emailLabel}</Label>
              <div className="relative">
                <MailIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="signin-email"
                  type="email"
                  autoComplete="email"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(emailError)}
                  aria-describedby={
                    emailError ? "signin-email-error" : undefined
                  }
                  className="h-12 pl-10 text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {emailError && (
                <p
                  id="signin-email-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="signin-password">{signIn.passwordLabel}</Label>
              <div className="relative">
                <LockIcon
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="signin-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-required="true"
                  aria-invalid={Boolean(passwordError)}
                  aria-describedby={
                    passwordError ? "signin-password-error" : undefined
                  }
                  className="h-12 pl-10 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {passwordError && (
                <p
                  id="signin-password-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {passwordError}
                </p>
              )}
              <div className="flex justify-end pt-1">
                <a
                  href={FORGOT_PASSWORD_URL}
                  className="text-[13px] font-medium text-idn-green hover:underline dark:text-idn-green-on-dark"
                >
                  {signIn.forgotLink}
                </a>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="h-12 w-full text-base"
            >
              {submitting ? signIn.primarySubmitting : signIn.primary}
            </Button>
          </form>

          <div className="mt-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground">
              {signIn.qrLabel}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled
            title={signIn.qrTooltip}
            className="mt-6 h-12 w-full text-base"
          >
            <QrCodeIcon aria-hidden="true" />
            {signIn.qrCta}
          </Button>
        </>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col items-center text-center">
            <IdnMark size={48} />
            <h1 className="mt-4 text-[22px] font-semibold text-foreground">
              {signIn.twoFactorLabel}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {signIn.twoFactorHint}
            </p>
          </div>
          <OtpInput
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            length={6}
            autoFocus
            ariaLabel={signIn.twoFactorLabel}
          />
          <Button
            type="button"
            size="lg"
            disabled={submitting || twoFactorCode.length !== 6}
            onClick={onSubmit2FA}
            className="h-12 w-full text-base"
          >
            {submitting ? "…" : signIn.twoFactorPrimary}
          </Button>
        </div>
      )}
    </div>
  )
}
