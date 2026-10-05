"use client"

import * as React from "react"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { CardPreview } from "../_components/card-face"
import { FormFooter } from "../_components/form-footer"
import { CARD_COLORS, CUSTOM_COLORS, CUSTOM_ICONS, cardIcon, gradKeyToGradient, type GradKey } from "../_content/cards"
import { errorMessage, useGoBack } from "../_lib/nav"

/** Carte personnalisée : transposition de apps/mobile/src/app/(tabs)/icarte/custom.tsx. */
export default function ICarteCustomPage() {
  const goBack = useGoBack("/icarte")
  const createCard = useMutation(api.wallet.create)
  const [name, setName] = React.useState("Ma Carte")
  const [subtitle, setSubtitle] = React.useState("")
  const [color, setColor] = React.useState<GradKey>("green")
  const [icon, setIcon] = React.useState("cc")
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    if (!name.trim()) {
      setNameError("Donne un nom à ta carte.")
      return
    }
    setNameError(null)
    setSubmitting(true)
    try {
      await createCard({
        type: "custom",
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        gradient: gradKeyToGradient(color),
        iconKey: icon,
        isOfficialStyle: false,
        data: {},
      })
      goBack()
    } catch (err) {
      setError(errorMessage(err, "Création impossible."))
      setSubmitting(false)
    }
  }

  const tile =
    "flex aspect-square items-center justify-center rounded-[10px] border-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-idn-bg"

  return (
    <Screen
      header={<AppBar title="Carte personnalisée" back="/icarte" />}
      footer={<FormFooter onCancel={goBack} submitting={submitting} submitLabel="Créer" submitIcon={<Icon name="plus" size={16} />} form="icarte-custom" />}
    >
      <form id="icarte-custom" onSubmit={submit} noValidate className="pt-5">
        <CardPreview grad={color} icon={cardIcon(icon)} name={name || "Ma Carte"} sub={subtitle} />
        <IdnInput label="Nom" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="off" />
        <IdnInput label="Sous-titre (optionnel)" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} autoComplete="off" />

        <fieldset className="mt-5">
          <legend className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-idn-muted">Couleur</legend>
          <div className="grid grid-cols-6 gap-2">
            {CUSTOM_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.label}
                aria-pressed={c.id === color}
                onClick={() => setColor(c.id)}
                className={cn(tile, c.id === color ? "border-idn-green" : "border-transparent")}
              >
                <span aria-hidden className="size-full rounded-[7px]" style={{ background: CARD_COLORS[c.id] }} />
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-idn-muted">Icône</legend>
          <div className="grid grid-cols-6 gap-2">
            {CUSTOM_ICONS.map((ic) => (
              <button
                key={ic.id}
                type="button"
                aria-label={ic.label}
                aria-pressed={ic.id === icon}
                onClick={() => setIcon(ic.id)}
                className={cn(tile, "bg-idn-surface", ic.id === icon ? "border-idn-green text-c-green-text" : "border-idn-border text-idn-ink-2")}
              >
                <Icon name={cardIcon(ic.id)} size={18} />
              </button>
            ))}
          </div>
        </fieldset>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Screen>
  )
}
