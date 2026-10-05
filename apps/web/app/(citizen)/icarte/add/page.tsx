"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, Overline } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { FormFooter } from "../_components/form-footer"
import { CARD_COLORS, CARD_TEMPLATES, TEMPLATES, cardIcon, gradKeyToGradient, isTemplateType, type FieldSpec } from "../_content/cards"
import { errorMessage, useGoBack } from "../_lib/nav"

/** Ajout d’une carte depuis un modèle : transposition de apps/mobile/src/app/(tabs)/icarte/add.tsx. */
export default function ICarteAddPage() {
  return (
    <React.Suspense fallback={null}>
      <AddForm />
    </React.Suspense>
  )
}

function AddForm() {
  const params = useSearchParams()
  const goBack = useGoBack("/icarte")
  const createCard = useMutation(api.wallet.create)

  const raw = params.get("template")
  const tpl = TEMPLATES[isTemplateType(raw) ? raw : "driving"]
  const visual = CARD_TEMPLATES.find((c) => c.id === tpl.type)

  const [name, setName] = React.useState(tpl.defaultName)
  const [subtitle, setSubtitle] = React.useState(tpl.defaultSubtitle)
  const [data, setData] = React.useState<Record<string, string>>(() => Object.fromEntries(tpl.data.map((f) => [f.key, ""])))
  const [backData, setBackData] = React.useState<Record<string, string>>(() => Object.fromEntries(tpl.backData.map((f) => [f.key, ""])))
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
        type: tpl.type,
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        gradient: gradKeyToGradient(tpl.grad),
        iconKey: tpl.iconKey,
        isOfficialStyle: tpl.isOfficialStyle,
        data,
        backData: tpl.backData.length > 0 ? backData : undefined,
      })
      goBack()
    } catch (err) {
      setError(errorMessage(err, "Création impossible."))
      setSubmitting(false)
    }
  }

  const field = (f: FieldSpec, values: Record<string, string>, set: React.Dispatch<React.SetStateAction<Record<string, string>>>) => (
    <IdnInput
      key={f.key}
      label={f.label}
      type={f.type === "date" ? "date" : "text"}
      placeholder={f.placeholder}
      value={values[f.key] ?? ""}
      onChange={(e) => set((d) => ({ ...d, [f.key]: e.target.value }))}
    />
  )

  return (
    <Screen
      header={<AppBar title="Ajouter une carte" back="/icarte" />}
      footer={
        <FormFooter onCancel={goBack} submitting={submitting} submitLabel="Créer" submitIcon={<Icon name="plus" size={16} />} form="icarte-add" />
      }
    >
      <form id="icarte-add" onSubmit={submit} noValidate>
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-idn-border bg-idn-surface p-3.5">
          <span aria-hidden className="flex h-9 w-14 items-center justify-center rounded-md text-white" style={{ background: CARD_COLORS[tpl.grad] }}>
            <Icon name={cardIcon(tpl.iconKey)} size={18} />
          </span>
          <span>
            <span className="block text-[13px] font-semibold text-idn-ink">{visual?.label ?? tpl.defaultName}</span>
            <span className="block text-xs text-idn-muted">Type sélectionné</span>
          </span>
        </div>
        <IdnInput label="Nom de la carte" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="off" />
        <IdnInput label="Sous-titre" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} autoComplete="off" />
        {tpl.data.map((f) => field(f, data, setData))}
        {tpl.backData.length > 0 ? <Overline className="mt-6">Verso</Overline> : null}
        {tpl.backData.map((f) => field(f, backData, setBackData))}
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Screen>
  )
}
