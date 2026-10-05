"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { Card, ErrorNote, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { ChoiceRow, CvField } from "../_components/cv-ui"

/** Création d'un CV (apps/mobile/src/app/icv/create.tsx). */
export default function ICVCreate() {
  const router = useRouter()
  const cvs = useQuery(api.cv.cvs.listMine)
  const create = useMutation(api.cv.cvs.create)
  const [name, setName] = React.useState("")
  const [copyFrom, setCopyFrom] = React.useState<Id<"citizenCv"> | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (busy) return
    const trimmed = name.trim()
    if (trimmed.length < 1) return setError("Donne un nom à ton CV.")
    setBusy(true)
    setError(null)
    try {
      const id = await create({ name: trimmed, copyFromCvId: copyFrom ?? undefined })
      router.replace(`/icv?cv=${id}`)
    } catch (err) {
      const msg = (err as Error).message ?? ""
      setError(msg.includes("CV_LIMIT_REACHED") ? "Tu as atteint la limite de 10 CV." : cleanError(msg) || "Création impossible.")
      setBusy(false)
    }
  }

  return (
    <Screen
      header={<AppBar title="Crée ton CV" back="history" backIcon="close" />}
      footer={
        <IdnButton type="submit" form="icv-create" full loading={busy} disabled={name.trim().length < 1}>
          Créer le CV
        </IdnButton>
      }
    >
      <form id="icv-create" onSubmit={submit}>
        <CvField label="Nom du CV" value={name} onChange={setName} placeholder="Par exemple : CV Tech, CV Direction…" autoFocus maxLength={80} />
        {cvs && cvs.length > 0 ? (
          <>
            <SectionTitle>Point de départ</SectionTitle>
            <Card>
              <div role="radiogroup" aria-label="Point de départ" className="divide-y divide-idn-border">
                <ChoiceRow label="CV vierge" selected={copyFrom === null} onSelect={() => setCopyFrom(null)} />
                {cvs.map((cv) => (
                  <ChoiceRow key={cv._id} label={cv.name} sub="Copie de ce CV" selected={copyFrom === cv._id} onSelect={() => setCopyFrom(cv._id)} />
                ))}
              </div>
            </Card>
          </>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Screen>
  )
}
