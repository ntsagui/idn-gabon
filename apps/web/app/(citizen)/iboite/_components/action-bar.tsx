import * as React from "react"
import Link from "next/link"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"

export type BarAction = {
  icon: IconName
  label: string
  primary?: boolean
  danger?: boolean
  href?: string
  onClick?: () => void
}

/**
 * Barre d’actions du bas des écrans de lecture (e-mail, courrier) : icône et
 * libellé, action principale en vert, suppression en rouge.
 */
export function ActionBar({ actions, label }: { actions: BarAction[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-5 -my-1 flex md:mx-0 md:my-0 md:gap-2 md:rounded-[14px] md:border md:border-idn-border md:bg-idn-surface md:p-1">
      {actions.map((a) => {
        const cls = cn(
          "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[10px] px-1 py-1.5 text-[11px] font-medium outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
          a.primary ? "text-c-green-text" : a.danger ? "text-c-red-text" : "text-idn-ink-2"
        )
        const inner = (
          <>
            <Icon name={a.icon} size={18} />
            <span className="max-w-full truncate">{a.label}</span>
          </>
        )
        return a.href ? (
          <Link key={a.label} href={a.href} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={a.label} type="button" onClick={a.onClick} className={cls}>
            {inner}
          </button>
        )
      })}
    </nav>
  )
}
