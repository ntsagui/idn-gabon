"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { useTheme } from "next-themes"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { cleanError } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Card, ErrorNote, Note } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

type ThemePreference = "auto" | "light" | "dark"

const OPTIONS: { id: ThemePreference; label: string; sub: string }[] = [
  { id: "auto", label: "Système", sub: "Suit automatiquement le réglage de ton appareil" },
  { id: "light", label: "Clair", sub: "Fond clair en permanence" },
  { id: "dark", label: "Sombre", sub: "Fond sombre en permanence" },
]

/** `next-themes` dit « system », le compte IDN (et le mobile) « auto ». */
const toNext = (p: ThemePreference) => (p === "auto" ? "system" : p)
const fromNext = (t: string | undefined): ThemePreference => (t === "light" || t === "dark" ? t : "auto")

/** Apparence : transposition de apps/mobile/src/app/settings/appearance.tsx. */
export default function AppearancePage() {
  const { theme, setTheme } = useTheme()
  const update = useMutation(api.preferences.updateMyPreferences)
  const [mounted, setMounted] = React.useState(false)
  const [updating, setUpdating] = React.useState<ThemePreference | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => setMounted(true), [])
  const preference = fromNext(theme)

  async function choose(next: ThemePreference) {
    if (next === preference) return
    const previous = preference
    setUpdating(next)
    setError(null)
    setTheme(toNext(next))
    try {
      await update({ theme: next })
    } catch (caught) {
      setTheme(toNext(previous))
      setError(caught instanceof Error ? cleanError(caught.message) : "Mise à jour impossible.")
    } finally {
      setUpdating(null)
    }
  }

  return (
    <Screen header={<AppBar title="Apparence" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted" id="theme-label">
        Choisis le thème de l’application.
      </p>
      <Card className="mt-4">
        <div role="radiogroup" aria-labelledby="theme-label" className="divide-y divide-idn-border">
          {OPTIONS.map((option) => {
            const selected = mounted && option.id === preference
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-busy={updating === option.id || undefined}
                disabled={updating !== null || !mounted}
                onClick={() => void choose(option.id)}
                className="-mx-1 flex min-h-14 w-[calc(100%+8px)] items-center gap-3 rounded-[10px] px-1 py-2.5 text-left outline-none transition-colors hover:bg-idn-surface-2/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium leading-[19px] text-idn-ink">{option.label}</span>
                  <span className="text-[13px] leading-[18px] text-idn-muted">{option.sub}</span>
                </span>
                {selected ? (
                  <Icon name="checkCir" size={22} className="shrink-0 text-c-green-text" />
                ) : (
                  <span aria-hidden className="size-[22px] shrink-0 rounded-full border-[1.5px] border-idn-muted" />
                )}
              </button>
            )
          })}
        </div>
      </Card>
      <Note>Ton choix est enregistré sur ton compte et retrouvé à ta prochaine connexion.</Note>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  )
}
