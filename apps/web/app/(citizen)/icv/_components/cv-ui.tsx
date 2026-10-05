"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

/**
 * Briques locales au module iCV (apps/mobile/src/components/cv/cv-ui.tsx) :
 * champ multiligne, choix radio, pastilles de filtre.
 */

/** Écran d'attente : barre d'application + animation `loader`. */
export function CvLoading({ title, back = "/icv" }: { title: string; back?: string }) {
  return (
    <Screen header={<AppBar title={title} back={back} />}>
      <div className="flex justify-center py-16">
        <IdnLottie name="loader" size={72} loop label="Chargement" />
      </div>
    </Screen>
  )
}

const FIELD =
  "w-full rounded-[10px] border border-[#8a8c80] bg-idn-surface px-3.5 text-base text-idn-ink outline-none transition-colors placeholder:text-idn-muted focus:border-2 focus:border-idn-green focus:px-[13px] disabled:opacity-50 dark:border-idn-muted-soft"

/** Champ de saisie de la charte (`.field`), en une ou plusieurs lignes. */
export function CvField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  minHeight = 112,
  type = "text",
  inputMode,
  autoComplete,
  disabled,
  maxLength,
  autoFocus,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  multiline?: boolean
  minHeight?: number
  type?: "text" | "email" | "tel" | "url"
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  autoComplete?: string
  disabled?: boolean
  maxLength?: number
  autoFocus?: boolean
  className?: string
}) {
  const id = React.useId()
  const hintId = hint ? `${id}-hint` : undefined
  return (
    <div className={cn("mt-4", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-idn-ink">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          disabled={disabled}
          aria-describedby={hintId}
          className={cn(FIELD, "block resize-y py-3 leading-6")}
          style={{ minHeight }}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          disabled={disabled}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-describedby={hintId}
          className={cn(FIELD, "h-[50px]")}
        />
      )}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] leading-[18px] text-idn-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

/** Ligne de choix exclusif (bouton radio) à placer dans un groupe `role="radiogroup"`. */
export function ChoiceRow({
  label,
  sub,
  selected,
  onSelect,
  disabled,
}: {
  label: string
  sub?: string
  selected: boolean
  onSelect: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className="-mx-1 flex min-h-[52px] w-[calc(100%+8px)] items-center gap-3 rounded-[10px] px-1 py-2.5 text-left outline-none transition-colors hover:bg-idn-surface-2/60 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45"
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-idn-green" : "border-idn-muted"
        )}
      >
        {selected ? <span className="size-2.5 rounded-full bg-idn-green" /> : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-sm text-idn-ink", selected ? "font-semibold" : "font-medium")}>{label}</span>
        {sub ? <span className="text-[13px] text-idn-muted">{sub}</span> : null}
      </span>
      {selected ? <Icon name="check" size={18} className="shrink-0 text-c-green-text" /> : null}
    </button>
  )
}

/** Pastilles de sélection, défilement horizontal sur téléphone ou retour à la ligne. */
export function CvChips<T extends string>({
  items,
  value,
  onChange,
  label,
  wrap,
  disabled,
}: {
  items: { id: T; label: string; color?: string }[]
  value: T | null
  onChange: (v: T) => void
  label: string
  wrap?: boolean
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex gap-2", wrap ? "flex-wrap" : "-mx-5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0")}
    >
      {items.map((it) => {
        const sel = it.id === value
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={sel}
            disabled={disabled}
            onClick={() => onChange(it.id)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              sel ? "border-idn-green bg-c-green-badge font-semibold text-c-green-text" : "border-idn-border bg-idn-surface font-medium text-idn-ink",
              disabled && !sel && "opacity-50"
            )}
          >
            {it.color ? <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: it.color }} /> : null}
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

/** « 1 expérience », « 3 expériences », « aucune expérience ». */
export function plural(n: number, one: string, many: string, none: string): string {
  if (n === 0) return none
  return `${n} ${n > 1 ? many : one}`
}

/** Message d'erreur des outils IA (quota quotidien ou échec). */
export function aiErrorMessage(e: unknown): string {
  const msg = (e as Error)?.message ?? ""
  return msg.includes("cvAi") || msg.includes("RATE_LIMIT")
    ? "Tu as atteint ton quota quotidien d’outils IA (10 par jour). Réessaie demain."
    : "L’outil IA a échoué. Réessaie dans un instant."
}
