"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

export function CopyButton({
  value,
  label,
  className,
  children,
}: {
  value: string
  /** Ce qui est copié, pour le libellé accessible. */
  label: string
  className?: string
  children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      className={className}
      aria-label={`Copier ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      }}
    >
      {children}
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      <span role="status" className="sr-only">
        {copied ? `${label} copié` : ""}
      </span>
    </button>
  )
}
