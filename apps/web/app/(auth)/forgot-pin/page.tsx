"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAction, useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Card } from "@repo/ui/components/card"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { forgotPin } from "../_content/fr"
import { OtpInput } from "../_components/otp-input"

const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const IDN_DOMAIN = "@idn.ga"

type Phase = "request" | "code" | "admin-code" | "new-pin" | "done"

export default function ForgotPinPage() {
  return (
    <React.Suspense fallback={null}>
      <ForgotPinPageInner />
    </React.Suspense>
  )
}

function ForgotPinPageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const requestReset = useAction(api.pinRecovery.requestReset)
  const verifyCode = useAction(api.pinRecovery.verifyCode)
  const verifyAdminCode = useMutation(api.pinRecovery.verifyAdminCode)
  const resetPin = useMutation(api.pinRecovery.resetPin)

  const [phase, setPhase] = React.useState<Phase>("request")
  const [identifier, setIdentifier] = React.useState(
    params.get("identifier") ?? "",
  )
  const [requestId, setRequestId] = React.useState("")
  const [resetToken, setResetToken] = React.useState("")
  const [code, setCode] = React.useState("")
  const [newPin, setNewPin] = React.useState("")
  const [confirmPin, setConfirmPin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const normalizedEmail = normalizeIdnIdentifier(identifier)
  const signInHref = buildSignInHref(params, normalizedEmail ?? identifier)

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!normalizedEmail || submitting) {
      setError("Saisissez un identifiant IDN valide.")
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
      setError(forgotPin.genericError)
    } finally {
      setSubmitting(false)
    }
  }

  const submitCode = async () => {
    if (code.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await verifyCode({ requestId, code })
      if (!result.verified || !result.resetToken) {
        setError(forgotPin.codeError)
        setCode("")
        return
      }
      setResetToken(result.resetToken)
      setPhase("new-pin")
    } catch {
      setError(forgotPin.codeError)
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  // Voie de secours : un agent habilité a remis un code au titulaire depuis
  // la console. Aucun envoi n'est déclenché — le code existe déjà.
  const startAdminCode = () => {
    if (!normalizedEmail || submitting) {
      setError("Saisissez un identifiant IDN valide.")
      return
    }
    setCode("")
    setError(null)
    setPhase("admin-code")
  }

  const submitAdminCode = async () => {
    if (!normalizedEmail || code.length !== 6 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await verifyAdminCode({
        identifier: normalizedEmail,
        code,
      })
      if (!result.verified || !result.requestId || !result.resetToken) {
        setError(forgotPin.adminCodeError)
        setCode("")
        return
      }
      setRequestId(result.requestId)
      setResetToken(result.resetToken)
      setPhase("new-pin")
    } catch {
      setError(forgotPin.adminCodeError)
      setCode("")
    } finally {
      setSubmitting(false)
    }
  }

  const submitNewPin = async () => {
    if (newPin.length !== 6 || confirmPin.length !== 6 || submitting) return
    if (newPin !== confirmPin) {
      setError(forgotPin.mismatch)
      setConfirmPin("")
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
        caught instanceof Error ? caught.message : forgotPin.genericError,
      )
    } finally {
      setSubmitting(false)
    }
  }

  const restart = () => {
    setPhase("request")
    setRequestId("")
    setResetToken("")
    setCode("")
    setNewPin("")
    setConfirmPin("")
    setError(null)
  }

  return (
    <div className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-6 py-10">
      <Card className="p-7">
        {phase === "request" ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              {forgotPin.title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {forgotPin.requestSub}
            </p>
            <form onSubmit={submitRequest} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="forgot-pin-identifier">
                  {forgotPin.identifierLabel}
                </Label>
                <Input
                  id="forgot-pin-identifier"
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value.toLowerCase())
                    setError(null)
                  }}
                  autoComplete="username"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="prenom.nom"
                  autoFocus
                  className="h-12"
                />
                <p className="text-xs text-muted-foreground">
                  {forgotPin.identifierHint}
                </p>
              </div>
              <Button
                type="submit"
                size="lg"
                disabled={submitting || !normalizedEmail}
                className="w-full"
              >
                {submitting ? forgotPin.sending : forgotPin.requestPrimary}
              </Button>

              <div className="flex items-center gap-3" aria-hidden>
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  ou
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-1.5">
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={submitting || !normalizedEmail}
                  onClick={startAdminCode}
                  className="w-full"
                >
                  {forgotPin.existingCode}
                </Button>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {forgotPin.existingCodeHint}
                </p>
              </div>
            </form>
          </>
        ) : null}

        {phase === "admin-code" ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              {forgotPin.adminCodeTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {forgotPin.adminCodeSub}
            </p>
            <div className="mt-6 space-y-5">
              <OtpInput
                value={code}
                onChange={(value) => {
                  setCode(value)
                  setError(null)
                }}
                length={6}
                autoFocus
                disabled={submitting}
                hasError={Boolean(error)}
                ariaLabel={forgotPin.adminCodeLabel}
              />
              <Button
                type="button"
                size="lg"
                disabled={submitting || code.length !== 6}
                onClick={() => void submitAdminCode()}
                className="w-full"
              >
                {submitting ? forgotPin.verifying : forgotPin.verifyPrimary}
              </Button>
              <button
                type="button"
                onClick={restart}
                className="w-full text-center text-xs text-muted-foreground hover:underline"
              >
                {forgotPin.restart}
              </button>
            </div>
          </>
        ) : null}

        {phase === "code" ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              {forgotPin.codeTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {forgotPin.codeSub}
            </p>
            <div className="mt-6 space-y-5">
              <OtpInput
                value={code}
                onChange={(value) => {
                  setCode(value)
                  setError(null)
                }}
                length={6}
                autoFocus
                disabled={submitting}
                hasError={Boolean(error)}
                ariaLabel={forgotPin.codeLabel}
              />
              <Button
                type="button"
                size="lg"
                disabled={submitting || code.length !== 6}
                onClick={() => void submitCode()}
                className="w-full"
              >
                {submitting ? forgotPin.verifying : forgotPin.verifyPrimary}
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                {forgotPin.codeHelp}{" "}
                <Link
                  href="/contact"
                  className="font-medium text-idn-green hover:underline dark:text-idn-green-on-dark"
                >
                  {forgotPin.supportLink}
                </Link>
              </p>
              <button
                type="button"
                onClick={restart}
                className="w-full text-center text-xs text-muted-foreground hover:underline"
              >
                {forgotPin.restart}
              </button>
            </div>
          </>
        ) : null}

        {phase === "new-pin" ? (
          <>
            <h1 className="text-xl font-semibold text-foreground">
              {forgotPin.newTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {forgotPin.newSub}
            </p>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label>{forgotPin.newLabel}</Label>
                <OtpInput
                  value={newPin}
                  onChange={(value) => {
                    setNewPin(value)
                    setError(null)
                  }}
                  length={6}
                  variant="pin"
                  autoFocus
                  disabled={submitting}
                  ariaLabel={forgotPin.newLabel}
                />
              </div>
              <div className="space-y-2">
                <Label>{forgotPin.confirmLabel}</Label>
                <OtpInput
                  value={confirmPin}
                  onChange={(value) => {
                    setConfirmPin(value)
                    setError(null)
                  }}
                  length={6}
                  variant="pin"
                  disabled={submitting}
                  hasError={Boolean(error)}
                  ariaLabel={forgotPin.confirmLabel}
                />
              </div>
              <Button
                type="button"
                size="lg"
                disabled={
                  submitting || newPin.length !== 6 || confirmPin.length !== 6
                }
                onClick={() => void submitNewPin()}
                className="w-full"
              >
                {submitting ? forgotPin.resetting : forgotPin.resetPrimary}
              </Button>
            </div>
          </>
        ) : null}

        {phase === "done" ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">
              {forgotPin.successTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {forgotPin.successSub}
            </p>
            <Button
              type="button"
              size="lg"
              onClick={() => router.push(signInHref)}
              className="mt-6 w-full"
            >
              {forgotPin.backToSignIn}
            </Button>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-center text-xs text-destructive">
            {error}
          </p>
        ) : null}

        {phase === "request" ? (
          <Link
            href={signInHref}
            className="mt-4 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← {forgotPin.backToSignIn}
          </Link>
        ) : null}
      </Card>
    </div>
  )
}

function normalizeIdnIdentifier(input: string): string | null {
  const raw = input.trim().toLowerCase()
  const handle = raw.endsWith(IDN_DOMAIN)
    ? raw.slice(0, -IDN_DOMAIN.length)
    : raw
  if (handle.length < 3 || handle.length > 32 || !HANDLE_REGEX.test(handle)) {
    return null
  }
  return `${handle}${IDN_DOMAIN}`
}

function buildSignInHref(params: URLSearchParams, identifier: string): string {
  const next = new URLSearchParams(params.toString())
  if (identifier) next.set("identifier", identifier)
  const query = next.toString()
  return query ? `/sign-in?${query}` : "/sign-in"
}
