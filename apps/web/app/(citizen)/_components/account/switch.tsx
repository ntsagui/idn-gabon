"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

/** Interrupteur de la charte (52 × 32), accessible comme un switch natif. */
export function IdnSwitch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full p-[3px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-45",
        checked ? "bg-idn-green" : "bg-[#8a8c80] dark:bg-idn-muted-soft"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-[26px] rounded-full bg-white transition-transform motion-reduce:transition-none",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  )
}
