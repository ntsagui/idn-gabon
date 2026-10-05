"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { IdnMark } from "@repo/ui/components/idn-mark"
import { cn } from "@repo/ui/lib/utils"

import { IdnButton } from "@/app/_components/idn/button"
import { type IconName } from "@/app/_components/idn/icons"
import { IconTile } from "@/app/_components/idn/list"

import { AuthScreen } from "../auth-screen"
import { getOnboardingProfile, setOnboardingProfile, type OnboardingProfile } from "../../_hooks/use-onboarding-state"

/** apps/mobile/src/data/profils.ts — les développeurs s'inscrivent sur leur portail. */
const PROFILS: { id: OnboardingProfile; label: string; sub: string; icon: IconName }[] = [
  { id: "citizen", label: "Citoyen gabonais", sub: "CNI ou acte de naissance", icon: "idCard" },
  { id: "resident", label: "Résident", sub: "Carte de séjour et passeport", icon: "home" },
  { id: "visitor", label: "Visiteur", sub: "Passeport et visa", icon: "plane" },
]

/** Bienvenue et choix du profil (apps/mobile/src/app/(auth)/hub.tsx). */
export function ProfileStep() {
  const router = useRouter()
  const [profile, setProfile] = React.useState<OnboardingProfile>("citizen")

  React.useEffect(() => {
    const saved = getOnboardingProfile()
    if (saved && saved !== "developer") setProfile(saved)
  }, [])

  function createAccount() {
    setOnboardingProfile(profile)
    router.push("/sign-up?step=identity")
  }

  return (
    <AuthScreen
      footer={
        <>
          <IdnButton full onClick={createAccount}>
            Créer mon compte
          </IdnButton>
          <IdnButton variant="ghost" full href="/sign-in">
            J’ai déjà un compte
          </IdnButton>
        </>
      }
    >
      <div className="mt-5 flex items-center gap-3 md:hidden">
        <IdnMark size={40} />
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-idn-muted">République gabonaise</p>
          <p className="text-[15px] font-semibold text-idn-ink">Identité Numérique</p>
        </div>
      </div>
      <h1 className="mt-8 text-[28px] md:mt-0 font-semibold leading-[33px] tracking-[-0.02em] text-idn-ink">
        Ton identité, reconnue par l’État, <span className="text-c-green-text">dans ta poche.</span>
      </h1>
      <p className="mt-3 text-[15px] leading-[22px] text-idn-ink-2">
        Un seul compte pour te connecter aux services publics, présenter ta carte et recevoir tes courriers officiels.
      </p>

      <fieldset className="mt-7">
        <legend className="mb-2 text-sm font-semibold text-idn-ink">Choisis ton profil</legend>
        <div className="flex flex-col gap-2">
          {PROFILS.map((p) => {
            const sel = p.id === profile
            return (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[14px] border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
                  sel ? "border-idn-green bg-c-green-badge" : "border-idn-border bg-idn-surface hover:bg-idn-surface-2"
                )}
              >
                <input
                  type="radio"
                  name="profile"
                  value={p.id}
                  checked={sel}
                  onChange={() => setProfile(p.id)}
                  className="sr-only"
                />
                <IconTile icon={p.icon} tone={sel ? "green" : "neutral"} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-idn-ink">{p.label}</span>
                  <span className="mt-0.5 block text-[13px] text-idn-muted">{p.sub}</span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                    sel ? "border-idn-green" : "border-idn-muted"
                  )}
                >
                  {sel ? <span className="size-2.5 rounded-full bg-idn-green" /> : null}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
    </AuthScreen>
  )
}
