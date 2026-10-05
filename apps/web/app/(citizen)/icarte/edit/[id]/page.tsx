"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, Overline } from "@/app/_components/idn/list"
import { CenterState, Screen } from "@/app/_components/idn/screen"

import { CardPreview } from "../../_components/card-face"
import { FormFooter } from "../../_components/form-footer"
import { formatLabel, walletCardToUi } from "../../_content/cards"
import { errorMessage, useGoBack } from "../../_lib/nav"

/** Modification d’une carte : transposition de apps/mobile/src/app/(tabs)/icarte/edit/[id].tsx. */
export default function ICarteEditPage() {
  const { id } = useParams<{ id: string }>()
  const goBack = useGoBack(`/icarte/${id}`)
  const wallet = useQuery(api.wallet.listMine)
  const updateCard = useMutation(api.wallet.update)
  const raw = wallet?.cards.find((c) => c._id === id)

  const [name, setName] = React.useState("")
  const [subtitle, setSubtitle] = React.useState("")
  const [data, setData] = React.useState<Record<string, string>>({})
  const [backData, setBackData] = React.useState<Record<string, string>>({})
  const [initialised, setInitialised] = React.useState(false)
  const [nameError, setNameError] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (raw && !initialised) {
      setName(raw.name)
      setSubtitle(raw.subtitle ?? "")
      setData(raw.data ?? {})
      setBackData(raw.backData ?? {})
      setInitialised(true)
    }
  }, [raw, initialised])

  if (wallet === undefined) {
    return (
      <Screen header={<AppBar title="Modifier la carte" back={`/icarte/${id}`} />}>
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      </Screen>
    )
  }
  if (!raw) {
    return (
      <Screen header={<AppBar title="Carte introuvable" back="/icarte" />}>
        <CenterState visual={<Icon name="wallet" size={40} className="text-idn-muted" />} title="Carte introuvable">
          Cette carte n’existe plus.
        </CenterState>
      </Screen>
    )
  }

  const card = walletCardToUi(raw)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    if (!name.trim()) {
      setNameError("Le nom de la carte est obligatoire.")
      return
    }
    setNameError(null)
    setSubmitting(true)
    try {
      await updateCard({
        cardId: id as Id<"walletCard">,
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        data,
        backData: Object.keys(backData).length > 0 ? backData : undefined,
      })
      goBack()
    } catch (err) {
      setError(errorMessage(err, "Modification impossible."))
      setSubmitting(false)
    }
  }

  return (
    <Screen
      header={<AppBar title="Modifier la carte" back={`/icarte/${id}`} />}
      footer={<FormFooter onCancel={goBack} submitting={submitting} submitLabel="Enregistrer" submitIcon={<Icon name="check" size={16} />} form="icarte-edit" />}
    >
      <form id="icarte-edit" onSubmit={submit} noValidate className="pt-6">
        <CardPreview grad={card.grad} icon={card.icon} name={name} sub={subtitle} />
        <IdnInput label="Nom de la carte" value={name} onChange={(e) => setName(e.target.value)} error={nameError} autoComplete="off" />
        <IdnInput label="Sous-titre" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} autoComplete="off" />
        {Object.keys(data).length > 0 ? <Overline className="mt-6">Recto</Overline> : null}
        {Object.entries(data).map(([k, v]) => (
          <IdnInput key={`f-${k}`} label={formatLabel(k)} value={v} onChange={(e) => setData((d) => ({ ...d, [k]: e.target.value }))} autoComplete="off" />
        ))}
        {Object.keys(backData).length > 0 ? <Overline className="mt-6">Verso</Overline> : null}
        {Object.entries(backData).map(([k, v]) => (
          <IdnInput key={`b-${k}`} label={formatLabel(k)} value={v} onChange={(e) => setBackData((d) => ({ ...d, [k]: e.target.value }))} autoComplete="off" />
        ))}
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Screen>
  )
}
