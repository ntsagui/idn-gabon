"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { CvField } from "../_components/cv-ui"

/** Renommage d'un CV (apps/mobile/src/app/icv/rename.tsx). */
export default function ICVRename() {
  const params = useSearchParams()
  const cvId = params.get("cv") as Id<"citizenCv"> | null
  const router = useRouter()
  const rename = useMutation(api.cv.cvs.rename)
  const [name, setName] = React.useState(params.get("name") ?? "")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !cvId) return
    const trimmed = name.trim()
    if (trimmed.length < 1) return setError("Le nom ne peut pas être vide.")
    setBusy(true)
    setError(null)
    try {
      await rename({ cvId, name: trimmed })
      router.replace("/icv/list")
    } catch (err) {
      setError(err instanceof Error && err.message ? cleanError(err.message) : "Réessaie dans un instant.")
      setBusy(false)
    }
  }

  return (
    <Screen
      header={<AppBar title="Renommer le CV" back="/icv/list" backIcon="close" />}
      footer={
        <IdnButton type="submit" form="icv-rename" full loading={busy} disabled={!cvId || name.trim().length < 1}>
          Enregistrer
        </IdnButton>
      }
    >
      <form id="icv-rename" onSubmit={submit}>
        <CvField label="Nouveau nom" value={name} onChange={setName} autoFocus maxLength={80} />
        {!cvId ? <ErrorNote>Aucun CV sélectionné. Reviens à « Mes CV » et réessaie.</ErrorNote> : null}
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Screen>
  )
}
