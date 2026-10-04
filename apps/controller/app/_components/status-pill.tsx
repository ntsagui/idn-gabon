import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { kycStatus, type KycStatus } from "../_content/fr"

export type Tone = "blue" | "yellow" | "green" | "red" | "neutral"

/** Couleurs des statuts de la charte, contrastes ≥ 4.5:1 en clair et en sombre. */
const TONES: Record<Tone, string> = {
  blue: "bg-idn-blue-soft text-idn-blue dark:bg-[#10243A] dark:text-idn-blue-on-dark",
  yellow: "bg-idn-yellow-soft text-[#6B5400] dark:bg-[#3A2E14] dark:text-[#F2C94C]",
  green: "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
  red: "bg-[#FBE9E7] text-[#B3261E] dark:bg-[#3A1E1E] dark:text-[#FF8A80]",
  neutral: "bg-idn-surface-2 text-idn-muted",
}

/** Pastille de statut : la couleur ne porte jamais seule l'information (libellé toujours écrit). */
export function StatusPill({
  tone,
  children,
  size = "sm",
  className,
}: {
  tone: Tone
  children: React.ReactNode
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "md" ? "h-[30px] px-3 text-[13px]" : "h-6 px-2.5 text-xs",
        TONES[tone],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

const KYC_TONE: Record<KycStatus, Tone> = {
  pending: "neutral",
  submitted: "neutral",
  under_review: "blue",
  complement_required: "yellow",
  approved: "green",
  rejected: "red",
  expired: "neutral",
}

export function KycStatusPill({ status, size }: { status: KycStatus; size?: "sm" | "md" }) {
  return (
    <StatusPill tone={KYC_TONE[status]} size={size}>
      {kycStatus[status]}
    </StatusPill>
  )
}
