import * as React from "react"
import Link from "next/link"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"

export type BarAction = {
  icon: IconName
  label: string
  danger?: boolean
  href?: string
  onClick?: () => void
}

const iconBtn =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-idn-ink-2 outline-none transition-colors hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"

/**
 * Barre du haut des écrans de lecture (e-mail, courrier), façon Gmail :
 * retour à gauche, actions en icônes à droite.
 */
export function ActionBar({ back, actions, label }: { back: string; actions: BarAction[]; label: string }) {
  return (
    <div className="sticky top-0 z-20 flex min-h-[52px] items-center bg-idn-bg/95 px-1.5 backdrop-blur supports-[backdrop-filter]:bg-idn-bg/85 md:px-0 md:pt-4">
      <Link href={back} aria-label="Retour" className={cn(iconBtn, "text-idn-ink md:-ml-2")}>
        <Icon name="arrowL" size={22} />
      </Link>
      <span className="flex-1" />
      <nav aria-label={label} className="flex items-center gap-0.5 md:-mr-2">
        {actions.map((a) =>
          a.href ? (
            <Link key={a.label} href={a.href} aria-label={a.label} title={a.label} className={iconBtn}>
              <Icon name={a.icon} size={20} />
            </Link>
          ) : (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              aria-label={a.label}
              title={a.label}
              className={cn(iconBtn, a.danger && "hover:text-c-red-text")}
            >
              <Icon name={a.icon} size={20} />
            </button>
          )
        )}
      </nav>
    </div>
  )
}

/** Bouton pilule bordé du bas de la lecture (Répondre, Transférer). */
export function PillLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full border border-idn-muted-soft text-[15px] font-medium text-idn-ink outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring md:max-w-56"
    >
      <Icon name={icon} size={20} />
      {children}
    </Link>
  )
}
