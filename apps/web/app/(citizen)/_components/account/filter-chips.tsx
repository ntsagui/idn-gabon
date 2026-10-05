"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

/**
 * Pastilles de filtre (Tout, Non lues…) du mobile : pilule bordée, verte
 * quand elle est choisie. Défilement horizontal sans barre sur petit écran.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  label: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("-mx-5 flex gap-1.5 overflow-x-auto px-5 py-3 [scrollbar-width:none] md:mx-0 md:px-0", className)}
    >
      {options.map((o) => {
        const sel = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={sel}
            onClick={() => onChange(o.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              sel
                ? "border-idn-green bg-c-green-badge font-semibold text-c-green-text"
                : "border-idn-border bg-idn-surface font-medium text-idn-ink-2 hover:bg-idn-surface-2"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
