"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { LevelBadge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Note } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { setLastAccount } from "@/lib/citizen/last-account"

import { AuthScreen } from "../auth-screen"
import { clearOnboardingState } from "../../_hooks/use-onboarding-state"

/** Compte créé (apps/mobile/src/app/(auth)/signup/done.tsx). */
export function DoneStep() {
  const router = useRouter()
  const user = useQuery(api.profile.getCurrentUser)
  const pivot = user?.profile?.pivot
  const email = user?.email ?? ""
  const level = (user?.profile?.loa ?? 1) as 1 | 2 | 3

  React.useEffect(() => {
    if (email) setLastAccount({ email, firstName: pivot?.firstName, lastName: pivot?.lastName })
  }, [email, pivot?.firstName, pivot?.lastName])

  function finish(toKyc: boolean) {
    clearOnboardingState()
    router.replace(toKyc ? "/kyc/intro" : "/dashboard")
  }

  return (
    <AuthScreen
      contentClassName="flex flex-col"
      footer={
        <>
          <IdnButton full onClick={() => finish(false)}>
            Accéder à l’accueil
          </IdnButton>
          <IdnButton variant="ghost" full onClick={() => finish(true)}>
            Vérifier mon identité
          </IdnButton>
        </>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center pt-10 text-center md:pt-4">
        <IdnLottie name="success" size={128} label="Compte créé" />
        <h1 className="mt-4 text-[22px] font-semibold leading-7 text-idn-ink">
          {pivot?.firstName ? `Bienvenue, ${pivot.firstName}` : "Bienvenue"}
        </h1>
        <p className="mt-1.5 text-sm leading-5 text-idn-muted">Ton compte IDN est créé. Ton adresse souveraine est active :</p>
        {email ? (
          <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-[10px] bg-idn-surface-2 px-3 py-1.5">
            <Icon name="mail" size={16} className="shrink-0 text-idn-ink-2" />
            <span className="truncate font-mono text-[13px] text-idn-ink">{email}</span>
          </p>
        ) : null}
        <LevelBadge level={level} className="mt-3" />
        <Note center className="max-w-[320px]">
          Vérifie ton identité pour passer au Niveau 2 et accéder aux démarches en ligne.
        </Note>
      </div>
    </AuthScreen>
  )
}
