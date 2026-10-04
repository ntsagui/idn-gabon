import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

/** Surface de contenu : bordure 1px, aucun relief par l'ombre. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  as: Tag = "section",
  headingLevel = 2,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
  as?: "section" | "div" | "aside"
  headingLevel?: 2 | 3
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  return (
    <Tag className={cn("rounded-xl border border-idn-border bg-idn-surface", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start gap-3 border-b border-idn-border-soft px-5 py-4">
          <div className="min-w-0 flex-1">
            {title && <Heading className="text-[15px] font-semibold text-idn-ink">{title}</Heading>}
            {description && <p className="mt-0.5 text-[13px] text-idn-muted">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(bodyClassName)}>{children}</div>
    </Tag>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-idn-surface-2 motion-reduce:animate-none", className)}
    />
  )
}

/** État vide utile : ce qui se passe, et quoi faire. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {Icon && (
        <span className="flex size-10 items-center justify-center rounded-full bg-idn-surface-2 text-idn-muted">
          <Icon aria-hidden className="size-5" />
        </span>
      )}
      <p className="mt-3 text-[15px] font-semibold text-idn-ink">{title}</p>
      {children && <div className="mt-1 max-w-[46ch] text-[13px] leading-relaxed text-idn-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Tuile de statistique : libellé mono, valeur 28/600 en chiffres tabulaires, contexte. */
export function StatTile({
  label,
  value,
  context,
  className,
}: {
  label: string
  value: React.ReactNode
  context?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("rounded-xl border border-idn-border bg-idn-surface px-5 py-4", className)}>
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">{label}</p>
      <p className="mt-2 text-[28px] font-semibold leading-none tabular-nums text-idn-ink">{value}</p>
      {context && <p className="mt-2 text-[13px] text-idn-muted">{context}</p>}
    </div>
  )
}

/** Paire libellé / valeur des fiches (données déclarées, détail d'acte…). */
export function Field({
  label,
  children,
  mono,
  className,
}: {
  label: string
  children: React.ReactNode
  mono?: boolean
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-xs text-idn-muted">{label}</dt>
      <dd className={cn("mt-0.5 break-words text-sm text-idn-ink", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  )
}
