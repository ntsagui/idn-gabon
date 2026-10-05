"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote, Overline } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { CvPreviewA4, type PreviewCv } from "../_components/cv-preview-a4"
import { categoryLabel, normalizeTheme, themeDesc, themeLabel } from "../_components/theme-picker"
import { ICV_THEMES, THEME_CATEGORIES, type CvThemeId } from "../_content/themes"

/** Galerie des thèmes (apps/mobile/src/app/icv/themes.tsx). */
export default function ICVThemes() {
  const params = useSearchParams()
  const cvId = params.get("cv") as Id<"citizenCv"> | null
  const router = useRouter()
  const cv = useQuery(api.cv.profile.get, cvId ? { cvId } : "skip")
  const setTheme = useMutation(api.cv.profile.setTheme)
  const [selected, setSelected] = React.useState<CvThemeId | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const gridRef = React.useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = React.useState(0)

  React.useEffect(() => {
    if (cv?.activeTheme) setSelected(normalizeTheme(cv.activeTheme))
  }, [cv?.activeTheme])

  React.useLayoutEffect(() => {
    const el = gridRef.current
    if (!el) return
    const update = () => {
      const cols = el.clientWidth >= 640 ? 3 : 2
      setThumb(Math.floor((el.clientWidth - 10 * (cols - 1)) / cols) - 18)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  async function apply() {
    if (!cvId || !selected || busy) return
    if (selected === normalizeTheme(cv?.activeTheme)) return router.push("/icv")
    setBusy(true)
    setError(null)
    try {
      await setTheme({ cvId, theme: selected })
      router.push("/icv")
    } catch (e) {
      setError(e instanceof Error && e.message ? cleanError(e.message) : "Réessaie dans un instant.")
      setBusy(false)
    }
  }

  return (
    <Screen
      width="wide"
      header={<AppBar title="Galerie des thèmes" back="/icv" backIcon="close" />}
      footer={
        <IdnButton full onClick={apply} loading={busy} disabled={!selected || !cvId}>
          {selected ? `Appliquer le thème ${themeLabel(selected)}` : "Choisis un thème"}
        </IdnButton>
      }
    >
      <p className="mt-4 text-sm leading-5 text-idn-muted">6 mises en page, réparties en 3 familles.</p>
      {!cvId ? <ErrorNote>Aucun CV sélectionné. Reviens à ton CV et réessaie.</ErrorNote> : null}
      <ErrorNote>{error}</ErrorNote>
      <div ref={gridRef}>
        {THEME_CATEGORIES.map((cat) => (
          <section key={cat} className="mt-5" aria-label={categoryLabel(cat)}>
            <Overline className="mb-2.5">{categoryLabel(cat)}</Overline>
            <div role="radiogroup" aria-label={categoryLabel(cat)} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {ICV_THEMES.filter((th) => th.category === cat).map((th) => {
                const sel = th.id === selected
                return (
                  <button
                    key={th.id}
                    type="button"
                    role="radio"
                    aria-checked={sel}
                    aria-label={`Thème ${themeLabel(th.id)}, ${themeDesc(th.id)}`}
                    onClick={() => setSelected(th.id)}
                    className={cn(
                      "flex min-w-0 flex-col rounded-[14px] p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      sel ? "border-2 border-idn-green bg-c-green-badge p-[7px]" : "border border-idn-border bg-idn-surface"
                    )}
                  >
                    {cv && thumb > 0 ? (
                      <CvPreviewA4 cv={cv as PreviewCv} themeId={th.id} targetWidth={thumb} label={`Aperçu du thème ${themeLabel(th.id)}`} className="rounded-md" />
                    ) : (
                      <span className="block aspect-[210/297] w-full rounded-md bg-idn-surface-2" />
                    )}
                    <span className="mt-2 flex items-center gap-1.5">
                      <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: th.color }} />
                      <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", sel ? "text-c-green-text" : "text-idn-ink")}>{themeLabel(th.id)}</span>
                      {sel ? <Icon name="check" size={16} className="shrink-0 text-c-green-text" /> : null}
                    </span>
                    <span className="mt-0.5 truncate text-xs text-idn-muted">{themeDesc(th.id)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </Screen>
  )
}
