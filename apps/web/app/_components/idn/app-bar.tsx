"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "./icons"

/**
 * Barre d'application (`AppBar` du mobile) : 52 px, titre centré 17/600,
 * bouton retour à gauche. Au-delà de `md`, elle devient l'en-tête de page :
 * titre 22/600 aligné à gauche, retour en lien discret.
 */
export function AppBar({
  title,
  back,
  backIcon = "arrowL",
  right,
  border = true,
  headingLevel = 1,
  className,
}: {
  title?: React.ReactNode
  /** 2 quand un autre volet visible porte le titre principal de la page (iBoîte : liste + lecture). */
  headingLevel?: 1 | 2
  /** Cible du bouton retour ; `"history"` revient à la page précédente. */
  back?: string | "history"
  backIcon?: "arrowL" | "close"
  right?: React.ReactNode
  border?: boolean
  className?: string
}) {
  const label = backIcon === "close" ? "Fermer" : "Retour"
  const Heading = headingLevel === 1 ? "h1" : "h2"
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex min-h-[52px] items-center gap-2 bg-idn-bg/95 px-3 py-1 backdrop-blur supports-[backdrop-filter]:bg-idn-bg/85",
        "md:static md:min-h-0 md:bg-transparent md:px-0 md:pb-2 md:pt-8 md:backdrop-blur-none",
        border && "border-b border-idn-border md:border-b-0",
        className
      )}
    >
      <div className={cn("w-10 shrink-0 md:w-auto", !back && "md:hidden")}>
        {back ? <BackButton target={back} icon={backIcon} label={label} /> : null}
      </div>
      <Heading className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.01em] text-idn-ink md:text-left md:text-[26px] md:leading-8">
        {title}
      </Heading>
      <div className="flex min-w-10 shrink-0 items-center justify-end gap-2">{right}</div>
    </header>
  )
}

function BackButton({ target, icon, label }: { target: string; icon: "arrowL" | "close"; label: string }) {
  const router = useRouter()
  const cls =
    "inline-flex size-10 items-center justify-center rounded-full text-idn-ink outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring md:-ml-2"
  if (target === "history") {
    return (
      <button type="button" onClick={() => router.back()} aria-label={label} className={cls}>
        <Icon name={icon} size={22} />
      </button>
    )
  }
  return (
    <Link href={target} aria-label={label} className={cls}>
      <Icon name={icon} size={22} />
    </Link>
  )
}

/** Bouton icône rond 40 px, bordé sauf en mode `plain`, pastille rouge facultative. */
export function IconButton({
  icon,
  label,
  href,
  onClick,
  plain,
  badge,
  size = 40,
  className,
}: {
  icon: IconName
  label: string
  href?: string
  onClick?: () => void
  plain?: boolean
  badge?: boolean
  size?: number
  className?: string
}) {
  const cls = cn(
    "relative inline-flex shrink-0 items-center justify-center rounded-full border text-idn-ink outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
    plain ? "border-transparent bg-transparent" : "border-idn-border bg-idn-surface",
    className
  )
  const inner = (
    <>
      <Icon name={icon} size={20} />
      {badge ? (
        <span aria-hidden className="absolute right-[9px] top-2 size-2 rounded-full border-[1.5px] border-idn-surface bg-[#b3261e]" />
      ) : null}
    </>
  )
  const style = { width: size, height: size }
  return href ? (
    <Link href={href} aria-label={label} className={cls} style={style}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={cls} style={style}>
      {inner}
    </button>
  )
}
