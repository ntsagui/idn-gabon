"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, Note } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { useIBoite } from "../_components/iboite-context"
import { getCurrentPosition, reverseGeocode } from "../_lib/geocoding"
import { errorMessage, useGoBack } from "../_lib/nav"

type Step = "choose" | "locating" | "form"
type FormState = {
  latitude: number | null
  longitude: number | null
  district: string
  city: string
  postalCode: string
  country: string
  addressLine: string
}
const INITIAL_FORM: FormState = { latitude: null, longitude: null, district: "", city: "", postalCode: "", country: "Gabon", addressLine: "" }

/**
 * Adresse postale iBoîte : transposition de apps/mobile/src/app/(tabs)/iboite/address-setup.tsx.
 * Géolocalisation du navigateur puis géocodage inverse OpenStreetMap, ou saisie manuelle.
 */
export default function AddressSetupPage() {
  return (
    <React.Suspense fallback={null}>
      <AddressSetup />
    </React.Suspense>
  )
}

function AddressSetup() {
  const params = useSearchParams()
  const { accounts, account } = useIBoite()
  const setAddress = useMutation(api.iboite.accounts.setAddress)
  const goBack = useGoBack("/iboite")
  const [step, setStep] = React.useState<Step>("choose")
  const [form, setForm] = React.useState<FormState>(INITIAL_FORM)
  const [error, setError] = React.useState<string | null>(null)
  const [warning, setWarning] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // Compte visé : celui passé dans l’URL (lien du Profil), sinon la boîte active.
  const requested = params.get("accountId")
  const target = requested ? accounts?.find((a) => a._id === requested) : account
  const accountId = (target?._id ?? null) as Id<"iboiteAccount"> | null

  async function startGps() {
    setError(null)
    setWarning(null)
    setStep("locating")
    try {
      const pos = await getCurrentPosition()
      let resolved: Awaited<ReturnType<typeof reverseGeocode>> | null = null
      try {
        resolved = await reverseGeocode(pos.latitude, pos.longitude)
      } catch {
        setWarning("Impossible de retrouver ton adresse depuis ta position. Complète les champs à la main.")
      }
      setForm({
        latitude: pos.latitude,
        longitude: pos.longitude,
        district: resolved?.district ?? "",
        city: resolved?.city ?? "",
        postalCode: resolved?.postalCode ?? "",
        country: resolved?.country ?? "Gabon",
        addressLine: resolved?.addressLine ?? "",
      })
      setStep("form")
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? (err as GeolocationPositionError).code : null
      setError(
        code === 1
          ? "Géolocalisation refusée. Autorise-la dans les réglages de ton navigateur ou saisis ton adresse à la main."
          : code === 3
            ? "La géolocalisation prend trop de temps. Réessaie ou saisis ton adresse à la main."
            : "Géolocalisation impossible. Réessaie ou saisis ton adresse à la main."
      )
      setStep("choose")
    }
  }

  function startManual() {
    setError(null)
    setWarning(null)
    setForm(INITIAL_FORM)
    setStep("form")
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    if (!accountId) {
      setError("Compte iBoîte introuvable.")
      return
    }
    if (form.latitude === null && !form.city.trim()) {
      setError("Adresse incomplète. Indique au moins ta ville ou active la géolocalisation.")
      return
    }
    setSubmitting(true)
    try {
      await setAddress({
        accountId,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        district: form.district.trim() || undefined,
        addressLine: form.addressLine.trim() || undefined,
        city: form.city.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || "Gabon",
      })
      goBack()
    } catch (err) {
      setError(`Enregistrement impossible. ${errorMessage(err, "Réessaie plus tard.")}`)
      setSubmitting(false)
    }
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Screen header={<AppBar title="Mon adresse postale" back="/iboite" />}>
      {target ? <p className="mt-3.5 break-all font-mono text-[13px] text-idn-muted">{target.emailAlias}</p> : null}

      {step === "choose" ? (
        <div className="mt-3.5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void startGps()}
            className="flex items-center gap-3 rounded-[14px] border border-idn-green bg-c-green-badge p-3.5 text-left outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-idn-green text-white">
              <Icon name="pinLoc" size={18} />
            </span>
            <span>
              <span className="block text-sm font-bold text-c-green-text">Utiliser ma position GPS</span>
              <span className="mt-0.5 block text-[13px] text-idn-ink-2">Recommandé — précis et instantané</span>
            </span>
          </button>
          <button
            type="button"
            onClick={startManual}
            className="flex items-center gap-3 rounded-[14px] border border-idn-border bg-idn-surface p-3.5 text-left outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-idn-surface-2 text-idn-ink-2">
              <Icon name="edit" size={18} />
            </span>
            <span className="text-sm font-semibold text-idn-ink">Saisir manuellement</span>
          </button>
          <Note>
            Au Gabon les adresses postales formelles sont rares. Nous utilisons ta position GPS pour localiser ton logement — tu peux compléter
            manuellement si besoin.
          </Note>
        </div>
      ) : null}

      {step === "locating" ? (
        <div role="status" className="flex flex-col items-center gap-3 py-6 text-center">
          <IdnLottie name="loader" size={56} label="Localisation en cours" />
          <p className="text-sm font-semibold text-idn-ink">Localisation en cours…</p>
          <p className="max-w-xs text-[13px] text-idn-muted">Autorise la géolocalisation dans ton navigateur pour continuer.</p>
        </div>
      ) : null}

      {step === "form" ? (
        <form onSubmit={submit} noValidate>
          {form.latitude !== null && form.longitude !== null ? (
            <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-idn-green bg-c-green-badge p-3">
              <Icon name="pinLoc" size={16} className="mt-0.5 shrink-0 text-c-green-text" />
              <div>
                <p className="text-[13px] font-bold text-c-green-text">Adresse détectée</p>
                <p className="mt-0.5 text-xs text-idn-ink-2">Vérifie les champs ci-dessous avant de confirmer.</p>
                <p className="mt-1 font-mono text-xs text-idn-muted">
                  {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                </p>
              </div>
            </div>
          ) : null}
          {warning ? <p className="mt-3 text-[13px] text-c-yellow-text">{warning}</p> : null}
          <IdnInput label="Quartier" placeholder="ex. Akanda, Glass, Nzeng-Ayong" value={form.district} onChange={set("district")} autoComplete="off" />
          <IdnInput label="Ville" placeholder="ex. Libreville" value={form.city} onChange={set("city")} autoComplete="address-level2" />
          <IdnInput label="Boîte postale (optionnel)" placeholder="ex. BP 1000" value={form.postalCode} onChange={set("postalCode")} autoComplete="postal-code" />
          <IdnInput label="Pays" value={form.country} onChange={set("country")} autoComplete="country-name" />
          <div className="mt-4">
            <label htmlFor="addr-line" className="mb-1.5 block text-sm font-semibold text-idn-ink">
              Adresse complète
            </label>
            <textarea
              id="addr-line"
              rows={2}
              value={form.addressLine}
              onChange={set("addressLine")}
              placeholder="Précise si besoin (point de repère, immeuble…)"
              className="block w-full resize-y rounded-[10px] border border-[#8a8c80] bg-idn-surface px-3.5 py-3 text-base text-idn-ink outline-none placeholder:text-idn-muted focus:border-2 focus:border-idn-green focus:px-[13px] dark:border-idn-muted-soft"
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void startGps()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md text-[13px] font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon name="rotateCcw" size={14} />
              Réessayer la géolocalisation
            </button>
            <p className="text-xs text-idn-muted">
              Données ©{" "}
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">
                OpenStreetMap
              </a>
            </p>
          </div>
          <ErrorNote>{error}</ErrorNote>
          <div className="mt-5 flex gap-2">
            <IdnButton variant="ghost" onClick={goBack} disabled={submitting}>
              Annuler
            </IdnButton>
            <IdnButton type="submit" full className="flex-1" loading={submitting}>
              Enregistrer mon adresse
            </IdnButton>
          </div>
        </form>
      ) : (
        <ErrorNote>{error}</ErrorNote>
      )}
    </Screen>
  )
}
