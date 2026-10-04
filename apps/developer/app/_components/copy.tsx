"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { Icon } from "./icons"

async function writeClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    return false
  }
}

export function CopyButton({
  value,
  label = "Copier",
  className,
  size = "icon-sm",
}: {
  value: string
  label?: string
  className?: string
  size?: "icon-sm" | "sm"
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const onCopy = async () => {
    if (await writeClipboard(value)) {
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    } else {
      toast.error("Copie impossible : sélectionnez la valeur et copiez-la manuellement.")
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={onCopy}
      aria-label={size === "icon-sm" ? (copied ? "Copié" : label) : undefined}
      className={cn("shrink-0 bg-idn-surface", className)}
    >
      <Icon name={copied ? "check" : "copy"} size={15} className={copied ? "text-idn-green" : undefined} />
      {size === "sm" ? (copied ? "Copié" : label) : null}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copié dans le presse-papiers" : ""}
      </span>
    </Button>
  )
}

/** Valeur technique en Plex Mono avec bouton de copie. */
export function CopyField({
  label,
  value,
  hint,
  id,
}: {
  label: string
  value: string
  hint?: string
  id?: string
}) {
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-[13px] font-medium text-idn-ink">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <code
          aria-labelledby={id}
          className="block min-w-0 flex-1 truncate rounded-[10px] border border-idn-border bg-idn-surface-2 px-3 py-2 font-mono text-[13px] text-idn-ink"
          title={value}
        >
          {value}
        </code>
        <CopyButton value={value} label={`Copier ${label.toLowerCase()}`} />
      </div>
      {hint ? <p className="text-xs text-idn-muted">{hint}</p> : null}
    </div>
  )
}
