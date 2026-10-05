"use client"

import * as React from "react"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { IdnDialog, cleanError } from "@/app/_components/idn/dialog"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, Overline, SectionTitle } from "@/app/_components/idn/list"

import { ICV_THEMES, THEME_CATEGORIES, type CvThemeId, type ThemeCategory } from "../_content/themes"
import { CvChips } from "./cv-ui"

/**
 * Libellés français des thèmes (apps/mobile/src/components/cv/theme-picker.tsx).
 * Le web propose les 6 modèles A4 réellement dessinés ; les 6 autres
 * identifiants du backend restent des alias (voir cv-templates.tsx).
 */
const THEME_FR: Record<CvThemeId, { label: string; desc: string }> = {
  modern: { label: "Moderne", desc: "Colonne sombre et frise" },
  professional: { label: "Professionnel", desc: "Formel et sérieux" },
  classic: { label: "Classique", desc: "Intemporel" },
  minimalist: { label: "Minimal", desc: "Épuré et sobre" },
  creative: { label: "Créatif", desc: "Artistique" },
  elegant: { label: "Élégant", desc: "Raffiné" },
}

const CATEGORY_FR: Record<ThemeCategory, string> = {
  "Classique & Pro": "Classiques et professionnels",
  Moderne: "Modernes",
  Créatif: "Créatifs",
}

/** Alias historiques → modèle réellement rendu (même table que cv-templates.tsx). */
const ALIASES: Record<string, CvThemeId> = {
  startup: "creative",
  bold: "professional",
  tech: "modern",
  academic: "classic",
  executive: "modern",
  compact: "minimalist",
}

export function normalizeTheme(id: string | undefined | null): CvThemeId {
  if (!id) return "modern"
  if (id in THEME_FR) return id as CvThemeId
  return ALIASES[id] ?? "modern"
}

export function themeLabel(id: string | undefined | null): string {
  return THEME_FR[normalizeTheme(id)].label
}

export function themeDesc(id: CvThemeId): string {
  return THEME_FR[id].desc
}

export function categoryLabel(cat: ThemeCategory): string {
  return CATEGORY_FR[cat] ?? cat
}

/** Applique un thème au CV (`cv.profile.setTheme`). */
function useSetCvTheme(cvId: Id<"citizenCv">, activeTheme: CvThemeId) {
  const setTheme = useMutation(api.cv.profile.setTheme)
  const [pending, setPending] = React.useState<CvThemeId | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  async function pick(id: CvThemeId) {
    if (pending || id === activeTheme) return
    setPending(id)
    try {
      await setTheme({ cvId, theme: id })
    } catch (e) {
      setError(e instanceof Error && e.message ? cleanError(e.message) : "Réessaie dans un instant.")
    } finally {
      setPending(null)
    }
  }
  const errorDialog = (
    <IdnDialog open={!!error} onOpenChange={(o) => !o && setError(null)} title="Thème non appliqué" description={error ?? undefined}>
      <div className="mt-5 flex justify-end">
        <IdnButton size="sm" className="min-h-11" onClick={() => setError(null)}>
          OK
        </IdnButton>
      </div>
    </IdnDialog>
  )
  return { pending, pick, errorDialog }
}

/** Pastilles de thèmes (accueil iCV). */
export function ThemeChips({ cvId, activeTheme }: { cvId: Id<"citizenCv">; activeTheme: CvThemeId }) {
  const { pending, pick, errorDialog } = useSetCvTheme(cvId, activeTheme)
  return (
    <>
      <CvChips
        label="Thème du CV"
        items={ICV_THEMES.map((th) => ({ id: th.id, label: themeLabel(th.id), color: th.color }))}
        value={pending ?? activeTheme}
        onChange={pick}
        disabled={pending !== null}
      />
      {errorDialog}
    </>
  )
}

/** Liste complète des thèmes, par famille (Studio). */
export function ThemePicker({ cvId, activeTheme, galleryHref }: { cvId: Id<"citizenCv">; activeTheme: CvThemeId; galleryHref?: string }) {
  const { pending, pick, errorDialog } = useSetCvTheme(cvId, activeTheme)
  return (
    <div>
      <SectionTitle action={galleryHref ? "Galerie" : undefined} actionHref={galleryHref}>
        Thème
      </SectionTitle>
      {THEME_CATEGORIES.map((cat) => (
        <div key={cat} className="mt-2">
          <Overline className="mb-2">{categoryLabel(cat)}</Overline>
          <Card>
            <div role="radiogroup" aria-label={categoryLabel(cat)} className="divide-y divide-idn-border">
              {ICV_THEMES.filter((th) => th.category === cat).map((th) => {
                const sel = th.id === activeTheme
                return (
                  <button
                    key={th.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    aria-busy={pending === th.id || undefined}
                    disabled={pending !== null}
                    onClick={() => pick(th.id)}
                    className={cn(
                      "flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      pending && pending !== th.id && "opacity-50"
                    )}
                  >
                    <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ backgroundColor: th.color }} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("text-sm text-idn-ink", sel ? "font-semibold" : "font-medium")}>{themeLabel(th.id)}</span>
                      <span className="truncate text-[13px] text-idn-muted">{themeDesc(th.id)}</span>
                    </span>
                    {sel ? <Icon name="check" size={18} className="shrink-0 text-c-green-text" /> : null}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>
      ))}
      {errorDialog}
    </div>
  )
}
