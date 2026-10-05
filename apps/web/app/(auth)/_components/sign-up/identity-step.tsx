"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cn } from "@repo/ui/lib/utils"

import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, ScreenTitle } from "@/app/_components/idn/list"

import { SignupScreen } from "../auth-screen"
import { getOnboardingPivot, getOnboardingProfile, setOnboardingPivot } from "../../_hooks/use-onboarding-state"

const GENDERS: { v: "M" | "F"; label: string }[] = [
  { v: "M", label: "Masculin" },
  { v: "F", label: "Féminin" },
]

/**
 * Nationalités proposées. Le mobile saisit un texte libre (« Gabonaise ») ;
 * le web garde le code ISO, que le backend sait interpréter (préfixe
 * téléphonique de la récupération du PIN, cf. `lib/phone.ts`).
 */
const NATIONALITIES: { value: string; label: string }[] = [
  { value: "GA", label: "Gabonaise" },
  { value: "CG", label: "Congolaise (Brazzaville)" },
  { value: "CD", label: "Congolaise (RDC)" },
  { value: "CM", label: "Camerounaise" },
  { value: "GQ", label: "Équato-guinéenne" },
  { value: "ST", label: "Santoméenne" },
  { value: "FR", label: "Française" },
  { value: "SN", label: "Sénégalaise" },
  { value: "CI", label: "Ivoirienne" },
  { value: "ML", label: "Malienne" },
  { value: "BJ", label: "Béninoise" },
  { value: "TG", label: "Togolaise" },
  { value: "BF", label: "Burkinabé" },
  { value: "NG", label: "Nigériane" },
  { value: "MA", label: "Marocaine" },
  { value: "CN", label: "Chinoise" },
  { value: "US", label: "Américaine" },
  { value: "GB", label: "Britannique" },
  { value: "JP", label: "Japonaise" },
]

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Identité pivot (apps/mobile/src/app/(auth)/signup/pivot.tsx). */
export function IdentityStep() {
  const router = useRouter()
  const [ready, setReady] = React.useState(false)
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [dob, setDob] = React.useState("")
  const [gender, setGender] = React.useState<"M" | "F">("F")
  const [nat, setNat] = React.useState("")
  const [birthPlace, setBirthPlace] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const profile = getOnboardingProfile()
    if (!profile) {
      router.replace("/sign-up?step=profile")
      return
    }
    const saved = getOnboardingPivot()
    if (saved) {
      setFirstName(saved.firstName)
      setLastName(saved.lastName)
      setDob(saved.dateOfBirth)
      if (saved.gender === "M" || saved.gender === "F") setGender(saved.gender)
      setBirthPlace(saved.birthPlace)
      setNat(saved.nationality)
      if (saved.phone) setPhone(saved.phone)
    } else if (profile === "citizen") {
      setNat("GA")
    }
    setReady(true)
  }, [router])

  const dobValid = isIsoDate(dob) && dob <= todayIso()
  const canSubmit = !!(firstName.trim() && lastName.trim() && dobValid && birthPlace.trim() && nat.trim())

  function next(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit) {
      setError("Tous les champs sont obligatoires.")
      return
    }
    setError(null)
    setOnboardingPivot({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dob,
      gender,
      birthPlace: birthPlace.trim(),
      nationality: nat.trim(),
      phone: phone.trim() || undefined,
    })
    router.push("/sign-up?step=idn")
  }

  if (!ready) return null

  return (
    <SignupScreen
      step={0}
      back="/sign-up?step=profile"
      footer={
        <IdnButton type="submit" form="signup-identity" full disabled={!canSubmit}>
          Continuer
        </IdnButton>
      }
    >
      <ScreenTitle
        title="Ton identité"
        lead="Telle qu’elle figure sur tes documents officiels. Tu la feras vérifier ensuite pour passer au Niveau 2."
      />
      <form id="signup-identity" onSubmit={next} className="mt-2">
        <IdnInput label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Awa" autoCapitalize="words" autoComplete="given-name" autoFocus required />
        <IdnInput label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mboumba" autoCapitalize="words" autoComplete="family-name" required />
        <IdnInput label="Date de naissance" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={todayIso()} autoComplete="bday" required />
        <fieldset className="mt-4">
          <legend className="mb-1.5 text-sm font-semibold text-idn-ink">Sexe</legend>
          <div className="flex gap-2">
            {GENDERS.map((g) => {
              const sel = g.v === gender
              return (
                <label
                  key={g.v}
                  className={cn(
                    "flex h-[50px] flex-1 cursor-pointer items-center justify-center rounded-[10px] text-[15px] text-idn-ink focus-within:ring-2 focus-within:ring-ring",
                    sel ? "border-2 border-idn-green bg-c-green-badge font-semibold" : "border border-idn-muted bg-idn-surface"
                  )}
                >
                  <input type="radio" name="gender" value={g.v} checked={sel} onChange={() => setGender(g.v)} className="sr-only" />
                  {g.label}
                </label>
              )
            })}
          </div>
        </fieldset>
        <IdnInput label="Lieu de naissance" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} placeholder="Libreville" autoCapitalize="words" required />
        <div className="mt-4">
          <label htmlFor="signup-nationality" className="mb-1.5 block text-sm font-semibold text-idn-ink">
            Nationalité
          </label>
          <div className="relative">
            <select
              id="signup-nationality"
              value={nat}
              onChange={(e) => setNat(e.target.value)}
              required
              className="h-[50px] w-full appearance-none rounded-[10px] border border-[#8a8c80] bg-idn-surface px-3.5 pr-10 text-base text-idn-ink outline-none focus:border-2 focus:border-idn-green focus:px-[13px] dark:border-idn-muted-soft"
            >
              <option value="" disabled>
                Choisis ta nationalité
              </option>
              {NATIONALITIES.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
            <Icon name="chevDn" size={18} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-idn-muted" />
          </div>
        </div>
        <IdnInput
          label="Téléphone (facultatif)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+241 77 12 34 56"
          type="tel"
          autoComplete="tel"
          hint="Il sert à récupérer ton code PIN par SMS."
        />
      </form>
      <ErrorNote>{error}</ErrorNote>
    </SignupScreen>
  )
}
