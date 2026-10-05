"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label?: React.ReactNode
  hint?: React.ReactNode
  error?: React.ReactNode
  leadIcon?: React.ReactNode
  suffix?: React.ReactNode
  mono?: boolean
  className?: string
  inputClassName?: string
}

/** Champ de la charte (`IdnInput` du mobile) : 50 px, rayon 10, focus vert 2 px, erreur rouge. */
export const IdnInput = React.forwardRef<HTMLInputElement, Props>(function IdnInput(
  { label, hint, error, leadIcon, suffix, mono, className, inputClassName, id, ...rest },
  ref
) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const hintId = `${inputId}-hint`
  const describedBy = error || hint ? hintId : undefined
  return (
    <div className={cn("mt-4", className)}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-idn-ink">
          {label}
        </label>
      ) : null}
      <div
        className={cn(
          "flex min-h-[50px] items-center gap-2.5 rounded-[10px] border bg-idn-surface px-3.5 transition-colors",
          "focus-within:border-2 focus-within:border-idn-green focus-within:px-[13px]",
          error ? "border-2 border-c-red-text px-[13px]" : "border-[#8a8c80] dark:border-idn-muted-soft"
        )}
      >
        {leadIcon ? <span aria-hidden className="inline-flex text-idn-muted">{leadIcon}</span> : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-12 min-w-0 flex-1 bg-transparent text-base text-idn-ink outline-none placeholder:text-idn-muted",
            mono && "font-mono",
            inputClassName
          )}
          {...rest}
        />
        {suffix ? <span className="shrink-0 text-[15px] text-idn-muted">{suffix}</span> : null}
      </div>
      {error ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-c-red-text">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-[13px] text-idn-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
})
