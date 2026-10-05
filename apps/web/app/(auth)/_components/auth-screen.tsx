"use client"

import * as React from "react"
import Link from "next/link"

import { cn } from "@repo/ui/lib/utils"

import { Icon } from "@/app/_components/idn/icons"
import { Screen } from "@/app/_components/idn/screen"
import { Stepper } from "@/app/_components/idn/stepper"
import { BIOMETRIC_TITLE } from "@/lib/citizen/passkeys"

/**
 * Barre du haut des écrans d'accès : même rendu que `AppBar`, avec un retour
 * qui peut aussi revenir à une phase précédente de l'écran (`onBack`), comme
 * le `onBack` du mobile.
 */
export function AuthAppBar({
  title,
  back,
  onBack,
  border = true,
}: {
  title?: React.ReactNode
  back?: string
  onBack?: () => void
  border?: boolean
}) {
  const cls =
    "inline-flex size-10 items-center justify-center rounded-full text-idn-ink outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring md:-ml-2"
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex min-h-[52px] items-center gap-2 bg-idn-bg/95 px-3 py-1 backdrop-blur supports-[backdrop-filter]:bg-idn-bg/85",
        "md:static md:min-h-0 md:bg-transparent md:px-0 md:pb-2 md:backdrop-blur-none",
        border && "border-b border-idn-border md:border-b-0"
      )}
    >
      <div className="w-10 shrink-0 md:w-auto">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Retour" className={cls}>
            <Icon name="arrowL" size={22} />
          </button>
        ) : back ? (
          <Link href={back} aria-label="Retour" className={cls}>
            <Icon name="arrowL" size={22} />
          </Link>
        ) : null}
      </div>
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold tracking-[-0.01em] text-idn-ink md:text-left md:text-[24px] md:leading-8">
          {title}
        </h1>
      ) : (
        <div className="flex-1" />
      )}
      <div className="w-10 shrink-0 md:hidden" />
    </header>
  )
}

/**
 * Gabarit des écrans d'accès : plein écran sur téléphone (pied d'actions
 * collé en bas), carte centrée de 440 px sur grand écran.
 */
export function AuthScreen({
  header,
  subHeader,
  footer,
  children,
  contentClassName,
}: {
  header?: React.ReactNode
  subHeader?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
  contentClassName?: string
}) {
  return (
    <Screen
      header={header}
      subHeader={subHeader}
      footer={footer}
      className="md:max-w-[440px] md:flex-none md:px-0"
      contentClassName={cn("md:pb-6", contentClassName)}
    >
      {children}
    </Screen>
  )
}

/**
 * Étapes réelles de l'inscription (apps/mobile/src/components/auth/signup-screen.tsx) :
 * l'adresse @idn.ga doit être réservée avant le PIN, car c'est le PIN qui ouvre le compte.
 */
export const SIGNUP_STEPS = ["Identité", "Adresse", "PIN", BIOMETRIC_TITLE]

/** Gabarit commun des étapes d'inscription (barre « Créer mon compte » + stepper). */
export function SignupScreen({
  step,
  children,
  footer,
  back,
  onBack,
  contentClassName,
}: {
  step: number
  children: React.ReactNode
  footer?: React.ReactNode
  back?: string
  onBack?: () => void
  contentClassName?: string
}) {
  return (
    <AuthScreen
      header={<AuthAppBar title="Créer mon compte" back={back} onBack={onBack} />}
      subHeader={<Stepper steps={SIGNUP_STEPS} current={step} />}
      footer={footer}
      contentClassName={contentClassName}
    >
      {children}
    </AuthScreen>
  )
}
