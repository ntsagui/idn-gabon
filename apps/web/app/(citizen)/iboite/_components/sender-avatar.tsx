import { BadgeCheck } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

import { Icon } from "@/app/_components/idn/icons"

// Fonds des initiales : tous lisibles avec un texte blanc (≥ 4,5:1).
const AVATAR_COLORS = ["#2563ac", "#b45309", "#7c3aed", "#be185d", "#0f766e", "#4d7c0f", "#9a3412"]

function colorOf(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/** Avatar rond 40 px d’un expéditeur : administration (pastille verte), sinon initiale sur couleur stable. */
export function SenderAvatar({ name, admin, className }: { name: string; admin?: boolean; className?: string }) {
  const base = "inline-flex size-10 shrink-0 items-center justify-center rounded-full"
  if (admin) {
    return (
      <span aria-hidden className={cn(base, "bg-c-green-badge text-c-green-text", className)}>
        <Icon name="landmark" size={20} />
      </span>
    )
  }
  const initial = name.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toLocaleUpperCase("fr") ?? "?"
  return (
    <span aria-hidden className={cn(base, "text-lg font-medium text-white", className)} style={{ background: colorOf(name) }}>
      {initial}
    </span>
  )
}

/** Avatar d’un courrier : jaune si une réponse est attendue, bleu sinon. */
export function LetterAvatar({ actionRequired, className }: { actionRequired: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
        actionRequired ? "bg-c-yellow-badge text-c-yellow-text" : "bg-c-blue-badge text-c-blue-text",
        className
      )}
    >
      <Icon name="scrollText" size={20} />
    </span>
  )
}

/** Badge « administration vérifiée » accolé au nom de l’expéditeur. */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <span className="inline-flex shrink-0">
      <BadgeCheck aria-hidden size={size} strokeWidth={2} className="fill-c-green-text text-idn-surface" />
      <span className="sr-only">(administration vérifiée)</span>
    </span>
  )
}
