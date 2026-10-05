"use client"

import * as React from "react"
import Link from "next/link"

import { ErrorNote } from "@/app/_components/idn/list"
import { Keypad, PinDots } from "@/app/_components/idn/pin"
import { BIOMETRIC } from "@/lib/citizen/passkeys"

export type PinLoginLink = { label: string; onClick?: () => void; href?: string }

/** Indicateur d'attente (ActivityIndicator du mobile). */
export function Spinner({ label, className }: { label: string; className?: string }) {
  return (
    <span role="status" className={className}>
      <span aria-hidden className="inline-block size-6 animate-spin rounded-full border-[2.5px] border-idn-green border-r-transparent motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/**
 * Connexion par PIN (apps/mobile/src/components/auth/pin-login.tsx) : avatar
 * à initiales, PIN 6 chiffres (pavé + clavier physique), biométrie facultative,
 * liens sous le pavé.
 */
export function PinLogin({
  initials,
  title,
  subtitle,
  onComplete,
  busy,
  error,
  onClearError,
  onFaceId,
  links,
  children,
}: {
  initials: string
  title: string
  subtitle: React.ReactNode
  /** Appelé quand les 6 chiffres sont saisis ; le champ est vidé ensuite. */
  onComplete: (pin: string) => Promise<void> | void
  busy?: boolean
  error?: string | null
  onClearError?: () => void
  onFaceId?: () => void
  links?: PinLoginLink[]
  children?: React.ReactNode
}) {
  const [pin, setPin] = React.useState("")
  const pinRef = React.useRef("")
  pinRef.current = pin

  React.useEffect(() => {
    if (error) setPin("")
  }, [error])

  function digit(d: string) {
    const cur = pinRef.current
    if (busy || cur.length >= 6) return
    onClearError?.()
    const next = cur + d
    pinRef.current = next
    setPin(next)
    if (next.length === 6) {
      void Promise.resolve(onComplete(next)).finally(() => setPin(""))
    }
  }

  const linkCls =
    "rounded-[6px] text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center pt-6 md:pt-2">
        <span
          aria-hidden
          className="inline-flex size-16 items-center justify-center rounded-full bg-idn-green text-[22px] font-semibold text-white"
        >
          {initials}
        </span>
        <h1 className="mt-4 text-center text-[22px] font-semibold leading-7 text-idn-ink">{title}</h1>
        <p className="mt-1 text-center text-sm text-idn-muted">{subtitle}</p>
        {busy ? (
          <Spinner label="Connexion en cours" className="mt-7 inline-flex h-3.5 items-center" />
        ) : (
          <PinDots filled={pin.length} error={!!error} />
        )}
        <div className="self-stretch">
          <ErrorNote>{error}</ErrorNote>
        </div>
        {children}
      </div>
      <Keypad
        onDigit={digit}
        onDelete={() => setPin((v) => v.slice(0, -1))}
        disabled={busy}
        leftAction={onFaceId ? { icon: "scanFace", label: `Se connecter avec ${BIOMETRIC}`, onClick: onFaceId } : undefined}
      />
      {links?.length ? (
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pb-2 pt-4">
          {links.map((l) =>
            l.href ? (
              <Link key={l.label} href={l.href} className={linkCls}>
                {l.label}
              </Link>
            ) : (
              <button key={l.label} type="button" onClick={l.onClick} className={linkCls}>
                {l.label}
              </button>
            )
          )}
        </div>
      ) : null}
    </div>
  )
}
