"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { BioStep } from "../_components/sign-up/bio-step"
import { DoneStep } from "../_components/sign-up/done-step"
import { IdentityStep } from "../_components/sign-up/identity-step"
import { IdnStep } from "../_components/sign-up/idn-step"
import { PinStep } from "../_components/sign-up/pin-step"
import { ProfileStep } from "../_components/sign-up/profile-step"

const STEPS = ["profile", "identity", "idn", "pin", "bio", "done"] as const
type Step = (typeof STEPS)[number]

function isStep(v: string | null): v is Step {
  return v !== null && (STEPS as readonly string[]).includes(v)
}

/**
 * Inscription (apps/mobile/src/app/(auth)/hub.tsx puis signup/*) en une seule
 * route : l'étape est portée par `?step=` (bienvenue et profil → identité →
 * adresse → PIN → biométrie → bienvenue). Une étape absente ou inconnue
 * ramène à la bienvenue.
 */
export default function SignUpPage() {
  return (
    <React.Suspense fallback={null}>
      <SignUpDispatcher />
    </React.Suspense>
  )
}

function SignUpDispatcher() {
  const router = useRouter()
  const params = useSearchParams()
  const raw = params.get("step")

  React.useEffect(() => {
    if (!isStep(raw)) router.replace("/sign-up?step=profile")
  }, [raw, router])

  if (!isStep(raw)) return null

  switch (raw) {
    case "profile":
      return <ProfileStep />
    case "identity":
      return <IdentityStep />
    case "idn":
      return <IdnStep />
    case "pin":
      return <PinStep />
    case "bio":
      return <BioStep />
    case "done":
      return <DoneStep />
  }
}
