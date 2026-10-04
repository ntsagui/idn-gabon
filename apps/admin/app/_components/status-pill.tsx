import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

/**
 * Pastille de statut de la charte v2 : bleu = information / en revue,
 * jaune = attention, vert = approuvé / actif, rouge = refusé / erreur,
 * neutre = brouillon. Le point reprend la couleur du texte ; le libellé porte
 * toujours le sens, jamais la couleur seule.
 */
export type Tone = "blue" | "yellow" | "green" | "red" | "neutral"

const TONE: Record<Tone, string> = {
  blue: "bg-idn-blue-soft text-idn-blue dark:bg-[#10243A] dark:text-idn-blue-on-dark",
  yellow: "bg-idn-yellow-soft text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]",
  green:
    "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
  red: "bg-[#FBE9E7] text-[#B3261E] dark:bg-[#3A1513] dark:text-[#F2A49E]",
  neutral: "bg-idn-surface-2 text-idn-muted",
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
