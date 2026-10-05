"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ErrorNote, IconTile, ScreenTitle } from "@/app/_components/idn/list"
import { HANDLE_REGEX } from "@/lib/citizen/idn-identifier"

import { SignupScreen } from "../auth-screen"
import { Spinner } from "../pin-login"
import {
  getOnboardingHandle,
  getOnboardingPivot,
  getOnboardingProfile,
  setOnboardingHandle,
  type OnboardingPivot,
} from "../../_hooks/use-onboarding-state"

type Suggestion = { handle: string; format: string; available: boolean }

/** Choix de l'adresse souveraine (apps/mobile/src/app/(auth)/signup/idn.tsx). */
export function IdnStep() {
  const router = useRouter()
  const [pivot, setPivot] = React.useState<OnboardingPivot | null>(null)
  const [handle, setHandle] = React.useState("")
  const [acceptTerms, setAcceptTerms] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const p = getOnboardingProfile()
    const pv = getOnboardingPivot()
    if (!p || !pv) {
      router.replace("/sign-up?step=profile")
      return
    }
    setPivot(pv)
    const saved = getOnboardingHandle()
    if (saved) setHandle(saved)
  }, [router])

  const suggestions: Suggestion[] | undefined = useQuery(
    api.onboarding.suggestIdnHandles,
    pivot ? { firstName: pivot.firstName, lastName: pivot.lastName, dateOfBirth: pivot.dateOfBirth } : "skip"
  )

  React.useEffect(() => {
    if (!suggestions || suggestions.length === 0 || handle) return
    const first = suggestions.find((s) => s.available) ?? suggestions[0]
    if (first) setHandle(first.handle)
  }, [suggestions, handle])

  const handleNormalized = handle.trim().toLowerCase()
  const handleValid = handleNormalized.length >= 3 && handleNormalized.length <= 32 && HANDLE_REGEX.test(handleNormalized)
  const availability = useQuery(api.onboarding.checkIdnHandleAvailability, handleValid ? { handle: handleNormalized } : "skip")

  const status = React.useMemo(() => {
    if (!handle) return { ok: false, neutral: true, label: "Choisis une adresse" }
    if (!handleValid) return { ok: false, neutral: false, label: "Caractères autorisés : lettres minuscules, chiffres, points, tirets." }
    if (!availability) return { ok: false, neutral: true, label: "Vérification…" }
    if (availability.available) return { ok: true, neutral: false, label: "Disponible" }
    return { ok: false, neutral: false, label: "Déjà attribuée à un autre compte" }
  }, [handle, handleValid, availability])

  function reserve() {
    if (!pivot || !status.ok) return
    if (!acceptTerms) {
      setError("Accepte les conditions d’utilisation pour continuer.")
      return
    }
    setError(null)
    setOnboardingHandle(handleNormalized)
    router.push("/sign-up?step=pin")
  }

  if (!pivot) return null

  const visibleSuggestions = suggestions ? suggestions.slice(0, 4) : []
  const customIsSuggestion = visibleSuggestions.some((s) => s.handle === handleNormalized)
  const customId = "signup-handle-custom"

  return (
    <SignupScreen
      step={1}
      back="/sign-up?step=identity"
      footer={
        <IdnButton full onClick={reserve} disabled={!status.ok}>
          {status.ok ? `Valider ${handleNormalized}@idn.ga` : "Valider cette adresse"}
        </IdnButton>
      }
    >
      <ScreenTitle
        title="Choisis ton adresse souveraine"
        lead="Ton adresse @idn.ga est ton identifiant officiel et l’adresse de ton iBoîte. Elle ne pourra plus être modifiée."
      />
      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold text-idn-ink">Propositions</legend>
        {suggestions === undefined ? (
          <Spinner label="Chargement des propositions" className="my-4 flex justify-center" />
        ) : (
          <div className="flex flex-col gap-2">
            {visibleSuggestions.map((s) => {
              const sel = s.handle === handleNormalized
              return (
                <label
                  key={s.handle}
                  className={cn(
                    "flex items-center gap-3 rounded-[14px] border p-3 focus-within:ring-2 focus-within:ring-ring",
                    sel ? "border-idn-green bg-c-green-badge" : s.available ? "border-idn-border bg-idn-surface" : "border-idn-border bg-idn-surface-2",
                    s.available ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                >
                  <input
                    type="radio"
                    name="handle"
                    value={s.handle}
                    checked={sel}
                    disabled={!s.available}
                    onChange={() => setHandle(s.handle)}
                    aria-label={`${s.handle}@idn.ga, ${s.available ? "disponible" : "déjà attribuée"}`}
                    className="sr-only"
                  />
                  <IconTile icon="mail" tone={s.available ? "green" : "neutral"} />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <span className="max-w-full truncate font-mono text-sm text-idn-ink">{s.handle}@idn.ga</span>
                    <Badge tone={s.available ? "green" : "neutral"} icon={s.available ? "check" : "close"} className="px-2 py-px">
                      {s.available ? "Disponible" : "Déjà attribuée"}
                    </Badge>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px]",
                      s.available ? "border-solid" : "border-dashed",
                      sel ? "border-idn-green" : "border-idn-muted"
                    )}
                  >
                    {sel ? <span className="size-2.5 rounded-full bg-idn-green" /> : null}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </fieldset>

      <label htmlFor={customId} className="mb-1.5 mt-6 block text-sm font-semibold text-idn-ink">
        Ou choisis la tienne
      </label>
      <div
        className={cn(
          "flex h-[50px] items-center rounded-[10px] border-2 bg-idn-surface px-[13px] focus-within:ring-2 focus-within:ring-ring",
          handle && !customIsSuggestion
            ? status.ok
              ? "border-idn-green"
              : status.neutral
                ? "border-idn-muted"
                : "border-c-red-text"
            : "border-idn-border"
        )}
      >
        <input
          id={customId}
          value={customIsSuggestion ? "" : handle}
          onChange={(e) => {
            setError(null)
            setHandle(e.target.value.toLowerCase().trim())
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="prenom.nom"
          aria-describedby={`${customId}-status`}
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-base text-idn-ink outline-none placeholder:text-idn-muted"
        />
        <span aria-hidden className="font-mono text-base text-idn-muted">
          @idn.ga
        </span>
      </div>
      {handle && !customIsSuggestion ? (
        <p
          id={`${customId}-status`}
          aria-live="polite"
          className={cn("mt-1.5 text-[13px]", status.neutral ? "text-idn-muted" : status.ok ? "text-c-green-text" : "text-c-red-text")}
        >
          {status.label}
        </p>
      ) : (
        <p id={`${customId}-status`} className="mt-1.5 text-[13px] text-idn-muted">
          Lettres minuscules, chiffres, points et tirets.
        </p>
      )}

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-[13px] leading-[19px] text-idn-ink-2">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-idn-green"
          checked={acceptTerms}
          onChange={(e) => {
            setError(null)
            setAcceptTerms(e.target.checked)
          }}
          aria-required="true"
        />
        <span>
          J’accepte les{" "}
          <Link href="/legal" target="_blank" rel="noopener noreferrer" className="font-semibold text-c-green-text underline-offset-2 hover:underline">
            conditions d’utilisation et la politique de confidentialité
          </Link>
          .
        </span>
      </label>
      <ErrorNote>{error}</ErrorNote>
    </SignupScreen>
  )
}
