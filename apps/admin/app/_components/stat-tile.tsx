import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

/**
 * Tuile de statistique : libellé mono, valeur 28/600 en chiffres tabulaires,
 * contexte en dessous. Pas de barre colorée décorative. Une tuile sans
 * donnée réelle n'est pas affichée : c'est à la page de ne pas la rendre.
 */
export function StatTile({
  label,
  value,
  context,
  href,
}: {
  label: string
  value: ReactNode
  context?: ReactNode
  href?: string
}) {
  const body = (
    <>
      <p className="adm-kicker">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-9 tracking-[-0.02em] text-idn-ink tabular-nums">
        {value}
      </p>
      {context ? (
        <p className="mt-1 text-[13px] text-idn-muted">{context}</p>
      ) : null}
    </>
  )
  const cls = "adm-panel block min-h-[124px] p-5"
  if (!href) return <div className={cls}>{body}</div>
  return (
    <Link
      href={href}
      className={cn(
        cls,
        "outline-none transition-colors duration-200 hover:border-idn-muted-soft focus-visible:ring-2 focus-visible:ring-idn-green",
      )}
    >
      {body}
    </Link>
  )
}
