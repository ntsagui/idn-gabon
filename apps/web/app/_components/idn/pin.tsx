"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "./icons"

/** Points de saisie du PIN : 14 px, remplis en vert, rouges en erreur. */
export function PinDots({ filled, length = 6, error }: { filled: number; length?: number; error?: boolean }) {
  return (
    <div className="mt-7 flex justify-center gap-4" role="status" aria-live="polite">
      <span className="sr-only">
        {filled} chiffre{filled > 1 ? "s" : ""} saisi{filled > 1 ? "s" : ""} sur {length}
      </span>
      {Array.from({ length }, (_, i) => {
        const on = i < filled
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "size-3.5 rounded-full border-[1.5px]",
              error ? "border-c-red-text" : on ? "border-idn-green" : "border-idn-muted",
              on && (error ? "bg-c-red-text" : "bg-idn-green")
            )}
          />
        )
      })}
    </div>
  )
}

type KeypadProps = {
  onDigit: (d: string) => void
  onDelete: () => void
  /** Action facultative en bas à gauche (clé d'accès sur l'écran de connexion). */
  leftAction?: { icon: IconName; label: string; onClick: () => void }
  disabled?: boolean
  /** Saisie au clavier physique (chiffres, Retour arrière) tant que le pavé est affiché. */
  captureKeyboard?: boolean
}

/** Clavier numérique : 3 colonnes, touches pilule 64 px. */
export function Keypad({ onDigit, onDelete, leftAction, disabled, captureKeyboard = true }: KeypadProps) {
  const digit = React.useRef(onDigit)
  const del = React.useRef(onDelete)
  digit.current = onDigit
  del.current = onDelete

  React.useEffect(() => {
    if (!captureKeyboard || disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        digit.current(e.key)
      } else if (e.key === "Backspace") {
        e.preventDefault()
        del.current()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [captureKeyboard, disabled])

  const cells = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "left", "0", "del"]
  const keyCls =
    "flex h-16 w-full items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
  return (
    <div className="mx-auto mt-8 grid w-full max-w-[320px] grid-cols-3 gap-x-6 gap-y-3" role="group" aria-label="Clavier numérique">
      {cells.map((c) =>
        c === "left" ? (
          leftAction ? (
            <button key={c} type="button" disabled={disabled} onClick={leftAction.onClick} aria-label={leftAction.label} className={cn(keyCls, "text-c-green-text hover:bg-idn-surface-2")}>
              <Icon name={leftAction.icon} size={26} />
            </button>
          ) : (
            <span key={c} aria-hidden />
          )
        ) : c === "del" ? (
          <button key={c} type="button" disabled={disabled} onClick={onDelete} aria-label="Effacer le dernier chiffre" className={cn(keyCls, "text-idn-muted hover:bg-idn-surface-2")}>
            <Icon name="delete" size={24} />
          </button>
        ) : (
          <button
            key={c}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(c)}
            className={cn(keyCls, "border border-idn-border bg-idn-surface text-[26px] font-medium text-idn-ink hover:bg-idn-surface-2 active:bg-idn-surface-2")}
          >
            {c}
          </button>
        )
      )}
    </div>
  )
}

/**
 * Saisie complète d'un PIN (points + pavé). Appelle `onComplete` au 6e chiffre ;
 * le parent vide `value` en cas d'erreur.
 */
export function PinEntry({
  value,
  onChange,
  onComplete,
  length = 6,
  error,
  disabled,
  leftAction,
}: {
  value: string
  onChange: (v: string) => void
  onComplete?: (v: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
  leftAction?: KeypadProps["leftAction"]
}) {
  const valueRef = React.useRef(value)
  valueRef.current = value
  return (
    <>
      <PinDots filled={value.length} length={length} error={error} />
      <Keypad
        disabled={disabled}
        leftAction={leftAction}
        onDigit={(d) => {
          const cur = valueRef.current
          if (cur.length >= length) return
          const next = cur + d
          valueRef.current = next
          onChange(next)
          if (next.length === length) onComplete?.(next)
        }}
        onDelete={() => {
          const next = valueRef.current.slice(0, -1)
          valueRef.current = next
          onChange(next)
        }}
      />
    </>
  )
}
