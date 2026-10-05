"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConvex, useMutation } from "convex/react"
import { ConvexError } from "convex/values"

import { api } from "@repo/backend/convex/_generated/api"

import { ErrorNote } from "@/app/_components/idn/list"
import { Keypad, PinDots } from "@/app/_components/idn/pin"
import { authClient } from "@/lib/auth-client"

import { SignupScreen } from "../auth-screen"
import { Spinner } from "../pin-login"
import {
  getOnboardingHandle,
  getOnboardingPivot,
  getOnboardingProfile,
  type OnboardingPivot,
  type OnboardingProfile,
} from "../../_hooks/use-onboarding-state"

/**
 * Suites trop évidentes, refusées avant la confirmation. Le mobile se contente
 * du conseil « Évite ta date de naissance » ; le web garde ce contrôle.
 */
const FORBIDDEN_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "012345", "543210",
])

function pinMatchesDob(pin: string, dob?: string): boolean {
  if (!dob || pin.length !== 6) return false
  const [y, m, d] = dob.split("-")
  if (!y || !m || !d) return false
  return [`${d}${m}${y.slice(-2)}`, `${m}${d}${y.slice(-2)}`, `${y.slice(-2)}${m}${d}`, `${d}${m}${y.slice(-4)}`.slice(0, 6)].includes(pin)
}

function generateInternalPassword(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-="
  const bytes = new Uint32Array(32)
  crypto.getRandomValues(bytes)
  let password = ""
  for (const byte of bytes) password += alphabet[byte % alphabet.length]
  return password
}

type CurrentUser = { email?: string } | null

/** Attend l'utilisateur exact pour ne jamais finaliser sous une ancienne session. */
async function waitForConvexAuth(fetchMe: () => Promise<CurrentUser>, expectedEmail: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const me = await fetchMe()
      if (me?.email?.toLowerCase() === expectedEmail) return
    } catch {
      // Le JWT peut être momentanément absent pendant le changement de compte.
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  throw new Error("La nouvelle session ne s’est pas synchronisée. Réessaie.")
}

function convexErrorData(error: unknown): { code?: string; message?: string } | null {
  if (!(error instanceof ConvexError) || typeof error.data !== "object") return null
  return error.data as { code?: string; message?: string }
}

type SignupContext = { profile: OnboardingProfile; pivot: OnboardingPivot; handle: string }

/** Création du PIN et du compte (apps/mobile/src/app/(auth)/signup/pin.tsx). */
export function PinStep() {
  const router = useRouter()
  const convex = useConvex()
  const completeSignup = useMutation(api.onboarding.completeSignup)
  const abandonIncompleteSignup = useMutation(api.onboarding.abandonIncompleteSignup)
  const [signupContext, setSignupContext] = React.useState<SignupContext | null>(null)
  const [pin, setPin] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [phase, setPhase] = React.useState<"enter" | "confirm">("enter")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const submitInFlight = React.useRef(false)
  // Le pavé et le clavier physique peuvent enchaîner deux chiffres avant le rendu.
  const live = React.useRef({ pin: "", confirm: "", phase: "enter" as "enter" | "confirm" })
  live.current = { pin, confirm, phase }

  React.useEffect(() => {
    const profile = getOnboardingProfile()
    const pivot = getOnboardingPivot()
    const handle = getOnboardingHandle()
    if (!profile || !pivot) {
      router.replace("/sign-up?step=profile")
      return
    }
    if (!handle) {
      router.replace("/sign-up?step=idn")
      return
    }
    setSignupContext({ profile, pivot, handle })
  }, [router])

  async function ensureExpectedSession(handle: string): Promise<void> {
    const expectedEmail = `${handle}@idn.ga`
    const currentSession = await authClient.getSession()
    const currentEmail = currentSession?.data?.user?.email?.toLowerCase()

    if (currentEmail && currentEmail !== expectedEmail) {
      await authClient.signOut()
    }

    if (currentEmail !== expectedEmail) {
      const result = await authClient.signUp.email({
        email: expectedEmail,
        password: generateInternalPassword(),
        name: handle,
      })
      if (result?.error) {
        const code = result.error.code as string | undefined
        throw new Error(
          code === "USER_ALREADY_EXISTS"
            ? "Cette adresse existe déjà. Si ton inscription a été interrompue, contacte le support."
            : (result.error.message ?? "Impossible de créer le compte. Réessaie.")
        )
      }
    }

    await authClient.updateSession?.()
    await waitForConvexAuth(() => convex.query(api.profile.getCurrentUser, {}), expectedEmail)
  }

  function digit(k: string) {
    if (submitting) return
    setError(null)
    const cur = live.current
    if (cur.phase === "enter") {
      if (cur.pin.length >= 6) return
      const next = cur.pin + k
      live.current.pin = next
      setPin(next)
      if (next.length === 6) {
        if (FORBIDDEN_PINS.has(next)) {
          setError("Suite trop évidente (par exemple 123456 ou 000000). Choisis un autre code.")
          setPin("")
          return
        }
        if (pinMatchesDob(next, signupContext?.pivot.dateOfBirth)) {
          setError("Ton code PIN ne peut pas être ta date de naissance.")
          setPin("")
          return
        }
        setTimeout(() => setPhase("confirm"), 150)
      }
    } else {
      if (cur.confirm.length >= 6) return
      const next = cur.confirm + k
      live.current.confirm = next
      setConfirm(next)
      if (next.length === 6) void submit(cur.pin, next)
    }
  }

  function erase() {
    if (submitting) return
    if (live.current.phase === "enter") setPin((v) => v.slice(0, -1))
    else setConfirm((v) => v.slice(0, -1))
  }

  async function submit(originalPin: string, confirmPin: string) {
    if (submitInFlight.current) return
    if (originalPin !== confirmPin) {
      setError("Les deux codes sont différents. Recommence.")
      setPin("")
      setConfirm("")
      setPhase("enter")
      return
    }
    if (!/^\d{6}$/.test(originalPin)) {
      setError("Le PIN doit faire exactement 6 chiffres.")
      return
    }
    if (!signupContext) {
      setError("Les informations d’inscription sont incomplètes. Recommence.")
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    try {
      await ensureExpectedSession(signupContext.handle)
      await completeSignup({
        profileType: signupContext.profile,
        pivot: signupContext.pivot,
        handle: signupContext.handle,
        pin: originalPin,
      })
      router.replace("/sign-up?step=bio")
    } catch (err) {
      const data = convexErrorData(err)
      if (data?.code === "NIP_ALREADY_VERIFIED") {
        setError("Ce NIP est déjà rattaché à une identité vérifiée. Vérifie ta saisie ou contacte le support.")
      } else if (data?.code === "IDENTITY_ALREADY_VERIFIED") {
        setError("Une identité vérifiée correspond déjà à ces informations. Vérifie ta saisie ou contacte le support.")
      } else {
        setError(data?.message ?? (err instanceof Error ? err.message : "Erreur lors de l’enregistrement du PIN."))
      }
      if (data?.code === "NIP_ALREADY_VERIFIED" || data?.code === "IDENTITY_ALREADY_VERIFIED") {
        // Le refus est définitif pour cet état civil : le compte ouvert par
        // `ensureExpectedSession` resterait sans profil ni PIN et confisquerait
        // l'adresse choisie. On le supprime et on ferme la session, pour qu'une
        // nouvelle tentative (après correction de l'identité) reparte de zéro.
        try {
          await abandonIncompleteSignup({})
          await authClient.signOut()
        } catch {
          // Nettoyage de courtoisie : un échec ici ne change rien au refus.
        }
      }
      setPin("")
      setConfirm("")
      setPhase("enter")
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  if (!signupContext) return null

  return (
    <SignupScreen
      step={2}
      contentClassName="flex flex-col"
      {...(phase === "confirm" && !submitting
        ? {
            onBack: () => {
              setPhase("enter")
              setConfirm("")
              setError(null)
            },
          }
        : { back: "/sign-up?step=idn" })}
    >
      <div className="flex flex-1 flex-col items-center justify-center pb-2 pt-8 md:pt-6">
        <h2 aria-live="polite" className="text-center text-xl font-semibold text-idn-ink">
          {submitting ? "Création de ton compte…" : phase === "enter" ? "Crée ton code PIN" : "Confirme ton code PIN"}
        </h2>
        <p className="mt-1.5 max-w-[320px] text-center text-sm leading-5 text-idn-muted">
          {phase === "enter" ? "6 chiffres pour déverrouiller ton identité. Évite ta date de naissance." : "Saisis le même code une seconde fois."}
        </p>
        {submitting ? (
          <Spinner label="Création de ton compte" className="mt-7 inline-flex" />
        ) : (
          <PinDots filled={phase === "enter" ? pin.length : confirm.length} error={!!error} />
        )}
        <div className="self-stretch">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
      <div className="pb-3">
        <Keypad onDigit={digit} onDelete={erase} disabled={submitting} />
      </div>
    </SignupScreen>
  )
}
