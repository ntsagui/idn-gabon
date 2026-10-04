import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

type Crumb = { label: string; href?: string }

/**
 * En-tête de page : kicker mono, titre 24/600, description courte, actions
 * à droite, fil d'Ariane sur les pages de détail. Bordure basse, sans effet.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  kicker: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  breadcrumb?: Crumb[]
  className?: string
}) {
  return (
    <header className={cn("border-b border-idn-border bg-idn-bg px-5 py-5 md:px-8", className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-[13px] text-idn-muted">
            {breadcrumb.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {index > 0 && <ChevronRightIcon aria-hidden className="size-3.5" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-sm hover:text-idn-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-idn-ink-2">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            {kicker}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-[-0.01em] text-idn-ink">
            {title}
          </h1>
          {description && <p className="mt-1 max-w-[72ch] text-sm text-idn-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}
