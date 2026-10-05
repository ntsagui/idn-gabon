import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "./icons"

export type BadgeTone = "green" | "blue" | "yellow" | "red" | "neutral" | "onGreen"

const BADGE: Record<BadgeTone, string> = {
  green: "bg-c-green-badge text-c-green-text",
  blue: "bg-c-blue-badge text-c-blue-text",
  yellow: "bg-c-yellow-badge text-c-yellow-text",
  red: "bg-c-red-badge text-c-red-text",
  neutral: "bg-c-neutral-badge text-idn-ink-2",
  onGreen: "bg-white text-idn-green",
}

/** Pastille de statut : 12/600, 3×10, rayon pilule, icône 13 px facultative. */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: BadgeTone
  icon?: IconName
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-[5px] whitespace-nowrap rounded-full px-2.5 py-[3px] text-xs font-semibold",
        BADGE[tone],
        className
      )}
    >
      {icon ? <Icon name={icon} size={13} strokeWidth={2} /> : null}
      {children}
    </span>
  )
}

export const LEVELS = {
  1: { label: "Niveau 1 · Faible", tone: "neutral" },
  2: { label: "Niveau 2 · Substantiel", tone: "blue" },
  3: { label: "Niveau 3 · Élevé", tone: "green" },
} as const

/** Niveau de garantie (LoA), libellé identique au mobile. */
export function LevelBadge({
  level,
  onGreen,
  short,
  className,
}: {
  level: 1 | 2 | 3
  onGreen?: boolean
  short?: boolean
  className?: string
}) {
  const meta = LEVELS[level]
  return (
    <Badge tone={onGreen ? "onGreen" : meta.tone} icon="shield" className={className}>
      {short ? `Niveau ${level}` : meta.label}
    </Badge>
  )
}
