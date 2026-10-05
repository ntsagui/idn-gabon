"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAction, useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote } from "@/app/_components/idn/list"
import { OtpInput } from "@/app/_components/idn/otp-input"
import { Screen } from "@/app/_components/idn/screen"
import { normalizeProfileForm, type ProfileForm, validateProfileForm } from "@/lib/citizen/profile-form"

import { PhotoUploader } from "../../_components/photo-uploader"

const GENDERS: { id: ProfileForm["gender"]; label: string }[] = [
  { id: "F", label: "Femme" },
  { id: "M", label: "Homme" },
  { id: "O", label: "Autre" },
  { id: "N", label: "Non précisé" },
]

const EMPTY: ProfileForm = { firstName: "", lastName: "", dateOfBirth: "", gender: "N", birthPlace: "", nationality: "" }

function comparablePhone(value: string): string {
  return value.trim().replace(/[\s().-]/g, "")
}

/** Modifier mon profil : transposition de apps/mobile/src/app/profile-edit.tsx. */
export default function ProfileEditPage() {
  const router = useRouter()
  const me = useQuery(api.profile.getCurrentUser)
  const updatePivot = useMutation(api.profile.updatePivot)
  const requestPhoneChange = useAction(api.phoneChange.requestChange)
  const verifyPhoneChange = useAction(api.phoneChange.verifyChange)
  const [form, setForm] = React.useState<ProfileForm>(EMPTY)
  const [initialized, setInitialized] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [phone, setPhone] = React.useState("")
  const [phoneRequestId, setPhoneRequestId] = React.useState<string | null>(null)
  const [maskedPhone, setMaskedPhone] = React.useState("")
  const [phoneCode, setPhoneCode] = React.useState("")
  const [phoneError, setPhoneError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const pivot = me?.profile?.pivot
    if (!pivot || initialized) return
    setForm({
      firstName: pivot.firstName,
      lastName: pivot.lastName,
      dateOfBirth: pivot.dateOfBirth,
      gender: pivot.gender as ProfileForm["gender"],
      birthPlace: pivot.birthPlace,
      nationality: pivot.nationality,
    })
    setPhone(pivot.phone ?? "")
    setInitialized(true)
  }, [initialized, me?.profile?.pivot])

  function field<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const storedPhone = me?.profile?.pivot?.phone ?? ""
  const phoneChanged = comparablePhone(phone) !== comparablePhone(storedPhone)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateProfileForm(form)
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    setPhoneError(null)
    try {
      if (phoneRequestId) {
        if (phoneCode.length !== 6) return
        const result = await verifyPhoneChange({ requestId: phoneRequestId, code: phoneCode })
        if (!result.verified || !result.phone) {
          setPhoneError("Code incorrect ou expiré.")
          return
        }
        await updatePivot(normalizeProfileForm(form))
        toast.success("Profil mis à jour", { description: "Le numéro a bien été enregistré." })
        router.push("/profile")
        return
      }
      if (phoneChanged) {
        if (!phone.trim()) return
        const result = await requestPhoneChange({ phone })
        setPhoneRequestId(result.requestId)
        setMaskedPhone(result.maskedPhone)
        setPhoneCode("")
        return
      }
      await updatePivot(normalizeProfileForm(form))
      toast.success("Profil mis à jour", { description: "Tes informations ont bien été enregistrées." })
      router.push("/profile")
    } catch (caught) {
      setError(caught instanceof Error ? cleanError(caught.message) : "Mise à jour impossible.")
    } finally {
      setSaving(false)
    }
  }

  const initials = `${form.firstName[0] ?? "?"}${form.lastName[0] ?? ""}`.toUpperCase()
  const today = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

  return (
    <Screen header={<AppBar title="Modifier mon profil" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">Ton identité telle qu’elle figure sur tes documents officiels.</p>
      <div className="mt-5">
        <PhotoUploader initials={initials} photoUrl={me?.profile?.photoUrl} />
      </div>
      <form onSubmit={save} noValidate>
        <div className="sm:grid sm:grid-cols-2 sm:gap-4">
          <IdnInput label="Prénom" autoComplete="given-name" value={form.firstName} onChange={(e) => field("firstName", e.target.value)} />
          <IdnInput label="Nom" autoComplete="family-name" value={form.lastName} onChange={(e) => field("lastName", e.target.value)} />
        </div>
        <IdnInput
          label="Date de naissance"
          type="date"
          autoComplete="bday"
          max={today}
          value={form.dateOfBirth}
          onChange={(e) => field("dateOfBirth", e.target.value)}
        />
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-semibold text-idn-ink">Genre</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Genre">
            {GENDERS.map((g) => {
              const selected = form.gender === g.id
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => field("gender", g.id)}
                  className={cn(
                    "min-h-10 rounded-full border px-3.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-idn-green bg-c-green-badge text-c-green-text" : "border-idn-border bg-idn-surface text-idn-ink hover:bg-idn-surface-2"
                  )}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </fieldset>
        <IdnInput label="Lieu de naissance" autoComplete="address-level2" value={form.birthPlace} onChange={(e) => field("birthPlace", e.target.value)} />
        <IdnInput
          label="Numéro de téléphone"
          type="tel"
          autoComplete="tel"
          placeholder="+241"
          value={phone}
          disabled={saving}
          onChange={(e) => {
            setPhone(e.target.value)
            setPhoneRequestId(null)
            setPhoneCode("")
            setPhoneError(null)
          }}
          error={!phoneRequestId ? phoneError ?? undefined : undefined}
        />
        {phoneRequestId ? (
          <div className="mt-3">
            <p className="text-[13px] text-idn-muted">Code envoyé au {maskedPhone}</p>
            <div className="mt-2">
              <OtpInput
                value={phoneCode}
                onChange={(v) => {
                  setPhoneCode(v.replace(/\D/g, "").slice(0, 6))
                  setPhoneError(null)
                }}
                length={6}
                autoFocus
                disabled={saving}
                error={!!phoneError}
                label="Code à 6 chiffres"
              />
            </div>
            {phoneError ? <p className="mt-1.5 text-[13px] text-c-red-text" role="alert">{phoneError}</p> : null}
          </div>
        ) : null}
        <IdnInput
          label="Nationalité"
          value={form.nationality}
          onChange={(e) => field("nationality", e.target.value)}
          hint="Code pays ou nationalité (ex. GAB)."
        />
        <ErrorNote>{error}</ErrorNote>
        <IdnButton
          type="submit"
          size="lg"
          full
          className="mt-6"
          loading={saving}
          disabled={me === undefined || (phoneRequestId ? phoneCode.length !== 6 : phoneChanged && !phone.trim())}
        >
          {phoneRequestId ? "Valider" : phoneChanged ? "Envoyer le code" : "Enregistrer"}
        </IdnButton>
      </form>
    </Screen>
  )
}
