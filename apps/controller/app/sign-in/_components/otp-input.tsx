"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

type OtpInputProps = {
  value: string
  onChange: (value: string) => void
  length?: number
  autoFocus?: boolean
  disabled?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
  variant?: "default" | "pin"
  hasError?: boolean
  className?: string
}

/**
 * Saisie OTP / PIN — port de `apps/web/app/(auth)/_components/otp-input.tsx`.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  variant = "default",
  hasError = false,
  className,
}: OtpInputProps) {
  const inputs = React.useRef<(HTMLInputElement | null)[]>([])

  const digits = React.useMemo(() => {
    const arr: string[] = Array.from({ length }, () => "")
    for (let i = 0; i < Math.min(length, value.length); i++) {
      arr[i] = value[i] ?? ""
    }
    return arr
  }, [value, length])

  const focus = (idx: number) => {
    if (idx < 0 || idx >= length) return
    inputs.current[idx]?.focus()
    inputs.current[idx]?.select()
  }

  const setAt = (idx: number, char: string) => {
    const next = digits.slice()
    next[idx] = char
    onChange(next.join("").slice(0, length))
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={hasError || undefined}
      className={cn(
        "flex justify-between gap-2",
        disabled && "opacity-60",
        className,
      )}
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el
          }}
          type={variant === "pin" ? "password" : "text"}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Chiffre ${i + 1}`}
          value={d}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, "").slice(-1)
            if (!char) return
            setAt(i, char)
            focus(i + 1)
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (d) {
                setAt(i, "")
              } else {
                focus(i - 1)
                setAt(Math.max(i - 1, 0), "")
              }
              e.preventDefault()
            } else if (e.key === "ArrowLeft") {
              focus(i - 1)
              e.preventDefault()
            } else if (e.key === "ArrowRight") {
              focus(i + 1)
              e.preventDefault()
            }
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData
              .getData("text")
              .replace(/\D/g, "")
              .slice(0, length)
            if (!pasted) return
            onChange(pasted.padEnd(length, "").slice(0, length))
            focus(Math.min(pasted.length, length - 1))
            e.preventDefault()
          }}
          className={cn(
            "h-14 w-12 rounded-md border text-center font-mono text-xl font-semibold tabular-nums transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
            hasError
              ? "border-destructive text-destructive"
              : d
                ? "border-idn-green text-idn-green"
                : "border-border text-foreground",
          )}
        />
      ))}
    </div>
  )
}
