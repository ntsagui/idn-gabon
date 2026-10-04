"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "./icons"

/** Transition de la charte : ≤ 250 ms, sortie douce, coupée si mouvement réduit. */
export const EASE =
  "transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"

export function Kicker({
  children,
  className,
  as: Tag = "p",
}: {
  children: ReactNode
  className?: string
  as?: "p" | "span" | "h2" | "h3" | "div"
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted",
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export type Crumb = { label: string; href?: string }

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  crumbs,
  children,
}: {
  kicker?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  crumbs?: Crumb[]
  children?: ReactNode
}) {
  return (
    <header className="border-b border-idn-border bg-idn-surface">
      <div className="mx-auto w-full max-w-[1200px] px-6 pb-5 pt-6 lg:px-8">
        {crumbs && crumbs.length > 0 ? (
          <nav aria-label="Fil d'Ariane" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-idn-muted">
              {crumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
                  {index > 0 ? <Icon name="chevronRight" size={14} /> : null}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="rounded-sm hover:text-idn-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
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
        ) : null}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            {kicker ? <Kicker>{kicker}</Kicker> : null}
            <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-[-0.01em] text-idn-ink">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-[68ch] text-sm leading-6 text-idn-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  )
}

/** Conteneur de contenu des pages connectées. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1200px] px-6 py-6 lg:px-8", className)}>
      {children}
    </div>
  )
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section
      id={id}
      aria-labelledby={id && title ? `${id}-title` : undefined}
      className={cn(
        "rounded-[14px] border border-idn-border bg-idn-surface",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-idn-border-soft px-5 py-4">
          <div className="min-w-0">
            <h2
              id={id ? `${id}-title` : undefined}
              className="text-[15px] font-semibold leading-6 text-idn-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-[13px] leading-5 text-idn-muted">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  )
}

export function StatTile({
  label,
  value,
  context,
}: {
  label: string
  value: ReactNode
  context?: ReactNode
}) {
  return (
    <div className="rounded-[14px] border border-idn-border bg-idn-surface px-5 py-4">
      <Kicker>{label}</Kicker>
      <p className="mt-2 text-[28px] font-semibold leading-8 tracking-[-0.01em] tabular-nums text-idn-ink">
        {value}
      </p>
      {context ? (
        <p className="mt-1 text-[13px] leading-5 text-idn-muted">{context}</p>
      ) : null}
    </div>
  )
}

export type PillTone = "info" | "attention" | "success" | "danger" | "neutral"

const PILL_TONES: Record<PillTone, string> = {
  info: "bg-idn-blue-soft text-idn-blue dark:bg-[#10243A] dark:text-idn-blue-on-dark",
  attention: "bg-idn-yellow-soft text-[#6B5400] dark:bg-[#2E2709] dark:text-[#F2D35B]",
  success: "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
  danger: "bg-[#FBE9E7] text-[#B3261E] dark:bg-[#3A1614] dark:text-[#F2857E]",
  neutral: "bg-idn-surface-2 text-idn-muted",
}

const DOT_TONES: Record<PillTone, string> = {
  info: "bg-idn-blue",
  attention: "bg-idn-yellow",
  success: "bg-idn-green",
  danger: "bg-[#B3261E]",
  neutral: "bg-idn-muted-soft",
}

/** Pastille de statut de la charte (point 7 px + libellé). */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: PillTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-xs font-medium",
        PILL_TONES[tone],
        className,
      )}
    >
      <span aria-hidden className={cn("size-[7px] rounded-full", DOT_TONES[tone])} />
      {children}
    </span>
  )
}

/** Libellé neutre d'environnement (Sandbox / Production). */
export function EnvTag({ env }: { env: "sandbox" | "production" }) {
  return (
    <span className="inline-flex h-6 items-center rounded-md border border-idn-border px-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-ink-2">
      {env === "production" ? "Production" : "Sandbox"}
    </span>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-idn-surface-2 px-1.5 font-mono text-[11px] font-medium tabular-nums text-idn-muted",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[14px] border border-dashed border-idn-border bg-idn-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span className="grid size-10 place-items-center rounded-[10px] bg-idn-surface-2 text-idn-muted">
        <Icon name={icon} size={20} />
      </span>
      <h2 className="mt-3 text-[15px] font-semibold text-idn-ink">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-[52ch] text-[13px] leading-5 text-idn-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-idn-surface-2 motion-reduce:animate-none",
        className,
      )}
    />
  )
}

/** Bloc de chargement accessible (annonce polie + squelettes). */
export function LoadingBlock({ rows = 3, label = "Chargement…" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  )
}

/** Note d'information (bleu) ou d'attention (jaune), sans dégradé. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "attention" | "danger"
  title?: string
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: "border-idn-blue/25 bg-idn-blue-soft/60 dark:bg-[#10243A]",
    attention: "border-idn-yellow/50 bg-idn-yellow-soft/70 dark:bg-[#2E2709]",
    danger: "border-[#B3261E]/30 bg-[#FBE9E7] dark:bg-[#3A1614]",
  }
  const icons = { info: "info", attention: "alert", danger: "alert" } as const
  const iconTones = {
    info: "text-idn-blue dark:text-idn-blue-on-dark",
    attention: "text-[#6B5400] dark:text-[#F2D35B]",
    danger: "text-[#B3261E] dark:text-[#F2857E]",
  }
  return (
    <div className={cn("flex gap-3 rounded-[10px] border px-4 py-3", tones[tone], className)}>
      <Icon name={icons[tone]} size={18} className={cn("mt-0.5 shrink-0", iconTones[tone])} />
      <div className="min-w-0 text-[13px] leading-5 text-idn-ink-2">
        {title ? <p className="font-semibold text-idn-ink">{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[13px] text-idn-ink-2", className)}>{children}</span>
}
