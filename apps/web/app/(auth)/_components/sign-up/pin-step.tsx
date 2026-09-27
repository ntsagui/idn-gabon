"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useConvex, useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { PinPad } from "@repo/ui/components/pin-pad"

import { authClient } from "@/lib/auth-client"

import { idnSignup, onboardingHeader, pin, STEP_TOTAL } from "../../_content/fr"
import { WizardShell } from "../wizard-shell"
import {
  clearOnboardingState,
  getOnboardingHandle,
  getOnboardingPivot,
  getOnboardingProfile,
} from "../../_hooks/use-onboarding-state"

const FORBIDDEN_PINS = new Set([
  "000000",
  "111111",
  "222222",
  "333333",
  "444444",
  "555555",
  "666666",
  "777777",
  "888888",
  "999999",
  "123456",
  "654321",
  "012345",
  "543210",
])

function isWeakPin(value: string): boolean {
  return FORBIDDEN_PINS.has(value)
}

function pinMatchesDob(pin: string, dob?: string): boolean {
  if (!dob || pin.length !== 6) return false
  const [y, m, d] = dob.split("-")
  if (!y || !m || !d) return false
  const candidates = [
    `${d}${m}${y.slice(-2)}`,
    `${m}${d}${y.slice(-2)}`,
    `${y.slice(-2)}${m}${d}`,
    `${d}${m}${y.slice(-4)}`.slice(0, 6),
  ]
  return candidates.includes(pin)
}

function generateInternalPassword(): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-="
  const bytes = new Uint32Array(32)
  crypto.getRandomValues(bytes)
  let password = ""
  for (const byte of bytes) {
    password += alphabet[byte % alphabet.length]
  }
  return password
}

type CurrentUser = { email?: string } | null

/**
 * La présence d'une session ne suffit pas : pendant un changement de compte,
 * Convex peut encore exposer brièvement l'ancienne. On attend donc l'adresse
 * exacte que l'utilisateur vient de réserver.
 */
async function waitForConvexAuth(
  fetchMe: () => Promise<CurrentUser>,
  expectedEmail: string,
  timeoutMs = 5000,
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const me = await fetchMe()
      if (me?.email?.toLowerCase() === expectedEmail) return
    } catch {
      // Le provider peut être momentanément sans JWT pendant la bascule.
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  throw new Error("La nouvelle session ne s'est pas synchronisée. Réessayez.")
}

function convexErrorData(
  error: unknown,
): { code?: string; message?: string } | null {
  if (!(error instanceof ConvexError) || typeof error.data !== "object") {
    return null
  }
  return error.data as { code?: string; message?: string }
}

type Phase = "enter" | "confirm"

export function PinStep() {
  const router = useRouter()
  const convex = useConvex()
  const completeSignup = useMutation(api.onboarding.completeSignup)
  const abandonIncompleteSignup = useMutation(
    api.onboarding.abandonIncompleteSignup,
  )

  const onboarding = React.useMemo(
    () => ({
      profile: getOnboardingProfile(),
      pivot: getOnboardingPivot(),
      handle: getOnboardingHandle(),
    }),
    [],
  )

  const [phase, setPhase] = React.useState<Phase>("enter")
  const [first, setFirst] = React.useState("")
  const [second, setSecond] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [blockedByDuplicate, setBlockedByDuplicate] = React.useState(false)
  const submitInFlight = React.useRef(false)

  React.useEffect(() => {
    if (!onboarding.profile || !onboarding.pivot) {
      router.replace("/sign-up?step=profile")
    } else if (!onboarding.handle) {
      router.replace("/sign-up?step=idn")
    }
  }, [onboarding, router])

  const dob = onboarding.pivot?.dateOfBirth

  const ensureExpectedSession = async (handle: string) => {
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
            ? "Cette adresse existe déjà. Si votre inscription a été interrompue, contactez le support."
            : (result.error.message ?? idnSignup.errorGeneric),
        )
      }
    }

    await authClient.updateSession?.()
    await waitForConvexAuth(
      () => convex.query(api.profile.getCurrentUser, {}),
      expectedEmail,
    )
  }

  const handleEnterComplete = (entered: string) => {
    setError(null)
    if (isWeakPin(entered)) {
      setError(pin.validation.weakSequence)
      return
    }
    if (pinMatchesDob(entered, dob)) {
      setError(pin.validation.matchesDob)
      return
    }
    setPhase("confirm")
  }

  const submit = async (confirmation: string) => {
    if (submitInFlight.current) return
    setError(null)
    setBlockedByDuplicate(false)
    if (first !== confirmation) {
      setError(pin.validation.mismatch)
      return
    }
    const { profile, pivot, handle } = onboarding
    if (!profile || !pivot || !handle) {
      router.replace("/sign-up?step=profile")
      return
    }
    submitInFlight.current = true
    setSubmitting(true)
    try {
      await ensureExpectedSession(handle)
      await completeSignup({
        profileType: profile,
        pivot,
        handle,
        pin: first,
      })
      clearOnboardingState()
      toast.success(pin.successToast)
      router.push("/dashboard")
    } catch (err) {
      const data = convexErrorData(err)
      if (
        data?.code === "IDENTITY_ALREADY_VERIFIED" ||
        data?.code === "NIP_ALREADY_VERIFIED"
      ) {
        setError(
          data.code === "NIP_ALREADY_VERIFIED"
            ? idnSignup.errorNipVerified
            : idnSignup.errorIdentityVerified,
        )
        setBlockedByDuplicate(true)
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
      } else {
        setError(
          data?.message ??
            (err instanceof Error ? err.message : idnSignup.errorGeneric),
        )
      }
      submitInFlight.current = false
      setSubmitting(false)
    }
  }

  const isEnter = phase === "enter"
  const value = isEnter ? first : second
  const onChange = (v: string) => {
    setError(null)
    if (isEnter) setFirst(v)
    else setSecond(v)
  }
  const onComplete = isEnter ? handleEnterComplete : submit
  const onPrimary = () => {
    if (isEnter) handleEnterComplete(first)
    else void submit(second)
  }
  const backToEnter = () => {
    setPhase("enter")
    setSecond("")
    setError(null)
  }

  return (
    <WizardShell
      step={pin.step}
      total={STEP_TOTAL}
      title={isEnter ? pin.enterTitle : pin.confirmTitle}
      sub={isEnter ? pin.enterSub : pin.confirmSub}
      backHref={isEnter ? "/sign-up?step=idn" : undefined}
      onBack={isEnter ? undefined : backToEnter}
      backLabel={
        isEnter ? onboardingHeader.backToIdn : onboardingHeader.backToEnter
      }
      footer={
        <Button
          type="button"
          size="lg"
          disabled={submitting || value.length !== 6}
          onClick={onPrimary}
          className="h-14 w-full text-base"
        >
          {submitting ? "…" : isEnter ? pin.primary : pin.primaryConfirm}
        </Button>
      }
    >
      <div className="flex flex-1 flex-col">
        <PinPad
          length={6}
          value={value}
          onChange={onChange}
          onComplete={onComplete}
          hasError={Boolean(error)}
          ariaLabel={isEnter ? pin.enterTitle : pin.confirmTitle}
          numpadAriaLabel={pin.numpadAria}
          backspaceAriaLabel={pin.backspaceAria}
          digitAriaLabel={pin.digitAria}
          dotsAriaLabel={pin.dotsAria}
          autoFocus
          disabled={submitting}
          resetKey={phase}
        />

        <div id="pin-error" aria-live="polite" className="mt-3 min-h-[1rem]">
          {error && (
            <div className="space-y-2 text-center">
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
              {blockedByDuplicate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/sign-up?step=identity")}
                >
                  {idnSignup.backToIdentity}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </WizardShell>
  )
}
