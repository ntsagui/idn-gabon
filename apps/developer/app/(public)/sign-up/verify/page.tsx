"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@repo/ui/components/button"

import { authClient } from "@/lib/auth-client"

import { OtpInput } from "../../../_components/otp-input"
import { Notice } from "../../../_components/ui"
import { AuthFrame, inlineLink } from "../../_components/auth-frame"
import { clearPendingEmail, readPendingEmail } from "../pending-email"

const RESEND_COOLDOWN = 60

export default function VerifyEmailPage() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN)

  useEffect(() => {
    const pending = readPendingEmail()
    if (!pending) {
      router.replace("/sign-up")
      return
    }
    setEmail(pending)
  }, [router])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  const verify = useCallback(
    async (otp: string) => {
      if (!email || verifying) return
      setVerifying(true)
      setError(null)
      try {
        const result = await authClient.emailOtp.verifyEmail({ email, otp })
        if (result?.error) {
          setError("Code incorrect ou expiré. Vérifiez le dernier e-mail reçu.")
          setCode("")
          return
        }
        clearPendingEmail()
        toast.success("Adresse e-mail vérifiée.")
        router.push("/applications")
      } catch {
        setError("Vérification impossible. Réessayez.")
      } finally {
        setVerifying(false)
      }
    },
    [email, router, verifying],
  )

  useEffect(() => {
    if (code.length === 6) void verify(code)
  }, [code, verify])

  const resend = async () => {
    if (!email || cooldown > 0) return
    setError(null)
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      })
      if (result?.error) {
        setError("Trop de demandes. Patientez avant de redemander un code.")
        return
      }
      toast.success("Un nouveau code vous a été envoyé.")
      setCooldown(RESEND_COOLDOWN)
    } catch {
      setError("Envoi impossible. Réessayez dans un instant.")
    }
  }

  return (
    <AuthFrame
      kicker="Vérification de l'adresse"
      title="Saisissez le code reçu"
      description={
        email ? (
          <>
            Un code à 6 chiffres a été envoyé à <strong className="font-medium text-idn-ink">{email}</strong>.
            Il est valable 15 minutes.
          </>
        ) : (
          "Un code à 6 chiffres vous a été envoyé par e-mail."
        )
      }
      footer={
        <>
          Mauvaise adresse ?{" "}
          <Link href="/sign-up" className={inlineLink}>
            Recommencer l&apos;inscription
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {error ? (
          <Notice tone="danger">
            <span role="alert">{error}</span>
          </Notice>
        ) : null}
        <OtpInput
          value={code}
          onChange={setCode}
          autoFocus
          disabled={verifying || !email}
          ariaLabel="Code de vérification à 6 chiffres"
          hasError={Boolean(error)}
        />
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={code.length !== 6 || verifying}
          onClick={() => void verify(code)}
        >
          {verifying ? "Vérification…" : "Vérifier"}
        </Button>
        <p className="text-center text-sm text-idn-muted" aria-live="polite">
          {cooldown > 0 ? (
            <>Nouveau code possible dans {cooldown} s</>
          ) : (
            <button type="button" onClick={() => void resend()} className={inlineLink}>
              Renvoyer un code
            </button>
          )}
        </p>
      </div>
    </AuthFrame>
  )
}
