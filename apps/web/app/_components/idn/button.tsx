import * as React from "react"
import Link from "next/link"

import { cn } from "@repo/ui/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "quiet" | "danger" | "dangerGhost"
type Size = "sm" | "md" | "lg"

const VARIANTS: Record<Variant, string> = {
  primary: "border-idn-green bg-idn-green text-white hover:bg-idn-green-dark hover:border-idn-green-dark",
  secondary: "border-idn-border bg-idn-surface text-idn-ink hover:bg-idn-surface-2",
  ghost: "border-idn-border bg-transparent text-idn-ink hover:bg-idn-surface-2",
  quiet: "border-transparent bg-transparent text-idn-ink-2 hover:bg-idn-surface-2",
  danger: "border-[#b3261e] bg-[#b3261e] text-white hover:bg-[#8f1e18] hover:border-[#8f1e18]",
  dangerGhost: "border-idn-border bg-transparent text-c-red-text hover:bg-c-red-badge",
}

const SIZES: Record<Size, string> = {
  sm: "min-h-10 rounded-[10px] px-3.5 text-sm",
  md: "min-h-[50px] rounded-[14px] px-5 text-[15px]",
  lg: "min-h-[52px] rounded-[14px] px-5 text-base",
}

type Common = {
  children: React.ReactNode
  variant?: Variant
  size?: Size
  full?: boolean
  loading?: boolean
  leadIcon?: React.ReactNode
  className?: string
}

/**
 * Bouton de la charte (`IdnButton` du mobile) : 50 px, rayon 14, libellé 15/600.
 * `href` le rend comme lien de navigation.
 */
export function IdnButton(
  props: Common &
    (
      | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">)
      | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">)
    )
) {
  const { children, variant = "primary", size = "md", full, loading, leadIcon, className, ...rest } = props
  const secondaryMd = variant === "secondary" && size === "md" ? "min-h-11 text-sm" : ""
  const cls = cn(
    "inline-flex items-center justify-center gap-2 border font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    SIZES[size],
    secondaryMd,
    VARIANTS[variant],
    full && "w-full",
    className
  )
  const content = (
    <>
      {loading ? (
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
      ) : leadIcon ? (
        <span aria-hidden className="inline-flex">{leadIcon}</span>
      ) : null}
      <span className="text-center">{children}</span>
    </>
  )
  if (rest.href !== undefined) {
    const { href, ...linkRest } = rest as { href: string } & Omit<React.ComponentProps<typeof Link>, "href">
    return (
      <Link href={href} className={cls} {...linkRest}>
        {content}
      </Link>
    )
  }
  const { type = "button", disabled, ...btnRest } = rest as React.ButtonHTMLAttributes<HTMLButtonElement>
  return (
    <button type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...btnRest}>
      {content}
    </button>
  )
}
