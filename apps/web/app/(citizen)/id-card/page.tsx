"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { QRCodeSVG } from "qrcode.react"

import { api } from "@repo/backend/convex/_generated/api"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"

import { AppBar } from "@/app/_components/idn/app-bar"
import { LevelBadge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { frDate } from "@/lib/citizen/display"
import { initialsOf } from "@/lib/citizen/last-account"
import { formatNip, maskNip } from "@/lib/citizen/nip-format"

// On renouvelle un peu avant l'expiration pour qu'un code affiché soit toujours valide.
const REFRESH_PADDING_MS = 2_000
const TOKEN_TTL_S = 30

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#BFDCC9]">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-white">{value || "—"}</dd>
    </div>
  )
}

/** Ma carte d'identité et QR de présentation : transposition de apps/mobile/src/app/id-card.tsx. */
export default function IdCardPage() {
  const user = useQuery(api.profile.getCurrentUser)
  const mintToken = useMutation(api.presentation.mintToken)
  const [token, setToken] = React.useState<string | null>(null)
  const [expiresAt, setExpiresAt] = React.useState(0)
  const [remainingMs, setRemainingMs] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const [showNip, setShowNip] = React.useState(false)
  const [minting, setMinting] = React.useState(false)
  const inFlight = React.useRef(false)

  const refresh = React.useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setError(null)
    setMinting(true)
    try {
      const r = await mintToken({})
      setToken(r.token)
      setExpiresAt(r.expiresAt)
      setRemainingMs(r.expiresAt - Date.now())
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data
      setError(data?.message ?? (err instanceof Error ? cleanError(err.message) : "Impossible de générer le code."))
      setToken(null)
      setExpiresAt(0)
    } finally {
      inFlight.current = false
      setMinting(false)
    }
  }, [mintToken])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!expiresAt) return
    const id = setInterval(() => {
      const left = expiresAt - Date.now()
      setRemainingMs(left)
      if (left <= REFRESH_PADDING_MS) void refresh()
    }, 250)
    return () => clearInterval(id)
  }, [expiresAt, refresh])

  const profile = user?.profile
  const pivot = profile?.pivot
  const loa = (profile?.loa ?? 1) as 1 | 2 | 3
  const nip = pivot?.nip
  const secondsLeft = Math.max(0, Math.ceil((remainingMs - REFRESH_PADDING_MS) / 1000))
  const progress = Math.min(1, Math.max(0, secondsLeft / (TOKEN_TTL_S - REFRESH_PADDING_MS / 1000)))
  // Empreinte courte du jeton, lisible à voix haute si le QR ne passe pas.
  const shortCode = token ? token.slice(-8).toUpperCase().replace(/[^A-Z0-9]/g, "7") : "········"

  return (
    <Screen header={<AppBar title="Ma carte d’identité" back="/dashboard" />}>
      <div className="md:grid md:grid-cols-2 md:items-start md:gap-4">
        <section aria-label="Carte d’identité numérique" className="mt-4 rounded-[20px] bg-idn-green p-[18px]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#D9EADF]">République gabonaise</p>
            <IdnFlagBars width={42} height={3} />
          </div>
          <p className="mt-1 text-[15px] font-semibold text-white">Carte d’identité numérique</p>
          <div className="mt-4 flex gap-3.5">
            <div className="flex h-[92px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-[#E3F0E7]">
              {profile?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photoUrl} alt="Photo d’identité" className="size-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-[#0A5C2C]" aria-hidden>
                  {initialsOf(pivot?.firstName, pivot?.lastName)}
                </span>
              )}
            </div>
            <dl className="min-w-0 flex-1">
              <Field label="Nom" value={pivot?.lastName.toUpperCase() ?? ""} />
              <Field label="Prénom" value={pivot?.firstName ?? ""} />
              <Field label={pivot?.gender === "F" ? "Née le" : "Né le"} value={pivot ? `${frDate(pivot.dateOfBirth)} à ${pivot.birthPlace}` : ""} />
            </dl>
          </div>
          <div className="my-3 h-px bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] tracking-[0.12em] text-[#BFDCC9]">NIP</p>
              {nip ? (
                <p className="mt-0.5 font-mono text-base font-medium tracking-[0.1em] text-white">{showNip ? formatNip(nip) : maskNip(nip)}</p>
              ) : (
                <p className="mt-0.5 text-sm text-white">Attribué après la vérification d’identité</p>
              )}
            </div>
            {nip ? (
              <button
                type="button"
                onClick={() => setShowNip((v) => !v)}
                aria-label={showNip ? "Masquer le NIP" : "Afficher le NIP"}
                aria-pressed={showNip}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/35 text-white outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
              >
                <Icon name={showNip ? "eyeOff" : "eye"} size={18} />
              </button>
            ) : null}
          </div>
          <LevelBadge level={loa} onGreen className="mt-3" />
        </section>

        <section aria-label="QR de présentation" className="mt-3 flex flex-col items-center rounded-[20px] border border-idn-border bg-idn-surface p-5 md:mt-4">
          <div
            role="img"
            aria-label="QR code de présentation de ton identité, renouvelé toutes les 30 secondes"
            className="flex size-[200px] items-center justify-center rounded-[14px] border border-[#E6E4DD] bg-white p-3"
          >
            {token ? (
              <QRCodeSVG value={token} size={176} fgColor="#16170F" bgColor="#FFFFFF" level="M" />
            ) : (
              <Icon name="qr" size={48} className="text-[#C9C7BF]" />
            )}
          </div>
          <p className="mt-3 select-all font-mono text-[13px] tracking-[0.15em] text-idn-ink">
            {shortCode}
          </p>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-idn-border" aria-hidden>
            <div className="h-1 bg-idn-green transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-idn-muted">
            <Icon name="clock" size={14} />
            {token ? `Nouveau code dans ${secondsLeft} s` : minting ? "Génération du code…" : "Code indisponible"}
          </p>
          <p className="mt-2.5 text-center text-[13px] leading-[19px] text-idn-muted">
            Présente ce code à un agent ou au vérificateur public. Il change toutes les 30 secondes pour empêcher les copies.
          </p>
          <ErrorNote className="self-stretch">{error}</ErrorNote>
          <IdnButton variant="secondary" full className="mt-4" loading={minting} onClick={() => void refresh()} leadIcon={<Icon name="refresh" size={16} />}>
            Régénérer maintenant
          </IdnButton>
        </section>
      </div>
    </Screen>
  )
}
