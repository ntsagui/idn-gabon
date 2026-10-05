"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

/**
 * Code à 6 chiffres en cases. Un seul champ réel (transparent, posé sur les
 * cases) porte la saisie : clavier, collage et remplissage automatique du code
 * SMS (`autocomplete="one-time-code"`) fonctionnent.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus,
  error,
  label = "Code à 6 chiffres",
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
  autoFocus?: boolean
  error?: boolean
  label?: string
  disabled?: boolean
}) {
  const id = React.useId()
  const [focused, setFocused] = React.useState(false)
  return (
    <div className="mt-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-idn-ink">
        {label}
      </label>
      <div className="relative flex gap-2">
        {Array.from({ length }, (_, i) => {
          const ch = value[i]
          const active = focused && i === Math.min(value.length, length - 1)
          return (
            <span
              key={i}
              aria-hidden
              className={cn(
                "flex h-[52px] flex-1 items-center justify-center rounded-[10px] bg-idn-surface text-[22px] font-semibold text-idn-ink",
                active || error ? "border-2" : "border",
                error ? "border-c-red-text" : active || ch ? "border-idn-green" : "border-idn-muted"
              )}
            >
              {ch ?? ""}
            </span>
          )
        })}
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          maxLength={length}
          disabled={disabled}
          aria-invalid={error || undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 h-full w-full cursor-text rounded-[10px] bg-transparent text-transparent caret-transparent outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>
      <p aria-live="polite" className="mt-2 text-center text-[13px] text-idn-muted">
        {value.length} chiffre{value.length > 1 ? "s" : ""} sur {length}
      </p>
    </div>
  )
}
