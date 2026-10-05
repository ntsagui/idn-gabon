import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

const WIDTHS = {
  /** Écrans de liste et parcours (profil, KYC, réglages) : colonne lisible. */
  narrow: "md:max-w-[720px]",
  /** Écrans à deux colonnes (accueil, iCarte). */
  wide: "md:max-w-[1080px]",
  /** Messagerie, éditeur : toute la largeur disponible. */
  full: "md:max-w-none",
} as const

/**
 * Squelette d'écran (`Screen` du mobile) : barre du haut, bandeau (stepper),
 * contenu avec marges de 20 px, pied d'actions. Sur téléphone le pied reste
 * collé en bas (au-dessus de la barre d'onglets) ; sur grand écran il suit le
 * contenu.
 */
export function Screen({
  header,
  subHeader,
  footer,
  children,
  width = "narrow",
  className,
  contentClassName,
}: {
  header?: React.ReactNode
  subHeader?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  width?: keyof typeof WIDTHS
  className?: string
  contentClassName?: string
}) {
  return (
    <div className={cn("mx-auto flex w-full flex-1 flex-col md:px-8", WIDTHS[width], className)}>
      {header}
      {subHeader ? <div className="px-5 md:px-0">{subHeader}</div> : null}
      <div className={cn("flex-1 px-5 pb-6 md:px-0 md:pb-10", contentClassName)}>{children}</div>
      {footer ? (
        <div
          className={cn(
            "sticky bottom-[var(--tabbar-h,0px)] z-10 flex flex-col gap-2 border-t border-idn-border bg-idn-bg px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3",
            "md:static md:mb-10 md:border-t-0 md:bg-transparent md:px-0 md:pb-0 md:pt-0"
          )}
        >
          {footer}
        </div>
      ) : null}
    </div>
  )
}

/** État centré (succès, attente, vide) : animation, titre, texte. */
export function CenterState({
  visual,
  title,
  children,
  className,
}: {
  visual?: React.ReactNode
  title: React.ReactNode
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center px-2 pt-10 text-center", className)}>
      {visual}
      <h2 className="mt-4 text-[22px] font-semibold leading-7 text-idn-ink">{title}</h2>
      {children ? <div className="mt-2 max-w-md text-sm leading-5 text-idn-muted">{children}</div> : null}
    </div>
  )
}
