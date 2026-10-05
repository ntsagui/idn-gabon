import * as React from "react"
import Link from "next/link"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "./icons"

export type RowTone = "green" | "blue" | "yellow" | "red" | "neutral"

export const TONE_CLASSES: Record<RowTone, string> = {
  green: "bg-c-green-badge text-c-green-text",
  blue: "bg-c-blue-badge text-c-blue-text",
  yellow: "bg-c-yellow-badge text-c-yellow-text",
  red: "bg-c-red-badge text-c-red-text",
  neutral: "bg-idn-surface-2 text-idn-ink-2",
}

/** Carte bordée (`.card` du mobile) : rayon 14, padding horizontal 14, séparateurs entre lignes. */
export function Card({
  children,
  className,
  padded,
  as: As = "div",
}: {
  children: React.ReactNode
  className?: string
  padded?: boolean
  as?: "div" | "ul" | "section"
}) {
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <As
      className={cn(
        "rounded-[14px] border border-idn-border bg-idn-surface px-3.5",
        padded ? "py-3.5" : "divide-y divide-idn-border",
        className
      )}
    >
      {padded ? children : items}
    </As>
  )
}

/** Tuile d'icône 36 px, rayon 10, fond teinté. */
export function IconTile({
  icon,
  tone = "neutral",
  size = 36,
  className,
}: {
  icon: IconName
  tone?: RowTone
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-[10px]", TONE_CLASSES[tone], className)}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={size >= 40 ? 22 : 18} />
    </span>
  )
}

type RowProps = {
  icon?: IconName
  tone?: RowTone
  title: React.ReactNode
  sub?: React.ReactNode
  right?: React.ReactNode
  href?: string
  onClick?: () => void
  chevron?: boolean
  unread?: boolean
  mono?: boolean
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

/**
 * Ligne de liste (`.row` du mobile) : icône 36, titre 14/500, sous-titre 13,
 * chevron. L'élément de droite reste hors de la zone cliquable : une action
 * secondaire (Révoquer, Déconnecter) est atteignable seule (RGAA 7.1).
 */
export function Row({
  icon,
  tone = "neutral",
  title,
  sub,
  right,
  href,
  onClick,
  chevron,
  unread,
  mono,
  ariaLabel,
  disabled,
  className,
}: RowProps) {
  const main = (
    <>
      {icon ? <IconTile icon={icon} tone={tone} /> : null}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <span className="flex items-center gap-1.5">
          {unread ? (
            <span className="size-2 shrink-0 rounded-full bg-idn-blue">
              <span className="sr-only">Non lu</span>
            </span>
          ) : null}
          <span className={cn("min-w-0 flex-1 text-sm leading-[19px] text-idn-ink", unread ? "font-semibold" : "font-medium")}>
            {title}
          </span>
        </span>
        {sub ? (
          <span className={cn("text-[13px] leading-[18px] text-idn-muted", mono && "font-mono")}>{sub}</span>
        ) : null}
      </span>
    </>
  )
  const chevronEl = chevron ? <Icon name="arrow" size={18} className="shrink-0 text-idn-muted" /> : null
  const base = "flex min-h-14 items-center gap-3 py-2.5"
  if (!href && !onClick) {
    return (
      <div className={cn(base, className)}>
        {main}
        {right}
        {chevronEl}
      </div>
    )
  }
  const interactive = cn(
    base,
    "-mx-1 min-w-0 flex-1 rounded-[10px] px-1 outline-none transition-colors hover:bg-idn-surface-2/60 focus-visible:ring-2 focus-visible:ring-ring",
    disabled && "pointer-events-none opacity-50"
  )
  const inner = (
    <>
      {main}
      {!right ? chevronEl : null}
    </>
  )
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {href ? (
        <Link href={href} aria-label={ariaLabel} className={interactive} aria-disabled={disabled || undefined}>
          {inner}
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} className={interactive}>
          {inner}
        </button>
      )}
      {right}
      {right ? chevronEl : null}
    </div>
  )
}

/** Action textuelle de droite d'une ligne (Révoquer, Déconnecter). */
export function RowAction({
  children,
  onClick,
  ariaLabel,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  ariaLabel?: string
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        "shrink-0 rounded-md px-1.5 py-1 text-[13px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        danger ? "text-c-red-text" : "text-c-green-text"
      )}
    >
      {children}
    </button>
  )
}

/** Titre de section (16/600) avec action facultative à droite. */
export function SectionTitle({
  children,
  action,
  actionHref,
  onAction,
  className,
  level = 2,
}: {
  children: React.ReactNode
  action?: string
  actionHref?: string
  onAction?: () => void
  className?: string
  level?: 2 | 3
}) {
  const H = level === 2 ? "h2" : "h3"
  const actionCls =
    "rounded-md text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className={cn("mb-2.5 mt-6 flex items-center justify-between gap-3", className)}>
      <H className="text-base font-semibold text-idn-ink">{children}</H>
      {action ? (
        actionHref ? (
          <Link href={actionHref} className={actionCls}>
            {action}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className={actionCls}>
            {action}
          </button>
        )
      ) : null}
    </div>
  )
}

/** Sur-titre mono capitales (11/500, interlettrage 1,3). */
export function Overline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-idn-muted", className)}>
      {children}
    </p>
  )
}

/** Titre d'écran (22/600) et texte d'accompagnement. */
export function ScreenTitle({
  title,
  lead,
  center,
  className,
  as: As = "h2",
}: {
  title: React.ReactNode
  lead?: React.ReactNode
  center?: boolean
  className?: string
  as?: "h1" | "h2"
}) {
  return (
    <div className={cn("mt-4", center && "text-center", className)}>
      <As className="text-[22px] font-semibold leading-7 tracking-[-0.01em] text-idn-ink">{title}</As>
      {lead ? <p className="mt-1 text-sm leading-5 text-idn-muted">{lead}</p> : null}
    </div>
  )
}

/** Note de bas de section (13, atténuée). */
export function Note({ children, center, className }: { children: React.ReactNode; center?: boolean; className?: string }) {
  return <p className={cn("mt-4 text-[13px] leading-[19px] text-idn-muted", center && "text-center", className)}>{children}</p>
}

/** Message d'erreur annoncé aux lecteurs d'écran. */
export function ErrorNote({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div role="alert" className={cn("mt-3.5 flex gap-2 rounded-[10px] bg-c-red-badge p-3 text-c-red-text", className)}>
      <Icon name="alert" size={18} className="mt-px shrink-0" />
      <p className="flex-1 text-[13px] leading-[19px]">{children}</p>
    </div>
  )
}

/** Encadré d'information teinté (complément demandé, avertissement…). */
export function Callout({
  tone = "yellow",
  icon,
  title,
  children,
  className,
}: {
  tone?: RowTone
  icon?: IconName
  title?: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mt-4 flex gap-3 rounded-[14px] p-3.5", TONE_CLASSES[tone], className)}>
      {icon ? <Icon name={icon} size={20} className="mt-px shrink-0" /> : null}
      <div className="min-w-0 flex-1 text-idn-ink">
        {title ? <p className="text-sm font-semibold">{title}</p> : null}
        {children ? <div className="mt-0.5 text-[13px] leading-[19px] text-idn-ink-2">{children}</div> : null}
      </div>
    </div>
  )
}

/** Ligne libellé / valeur d'une fiche de détail. */
export function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 py-2.5">
      <dt className="text-[13px] text-idn-muted">{label}</dt>
      <dd className={cn("min-w-0 text-right text-sm text-idn-ink", mono ? "break-all font-mono font-medium" : "font-semibold")}>
        {value}
      </dd>
    </div>
  )
}

/** Avatar rond : photo ou initiales sur fond vert. */
export function Avatar({
  photoUrl,
  initials,
  size = 44,
  className,
}: {
  photoUrl?: string | null
  initials: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-idn-green font-semibold text-white", className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
      aria-hidden
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        initials
      )}
    </span>
  )
}
