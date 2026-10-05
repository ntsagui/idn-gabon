"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog, cleanError } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { IconTile, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { DOC_FOLDERS, findDocFolder, type DocFolderId } from "@/lib/citizen/doc-folders"
import { formatBytes } from "@/lib/citizen/doc-format"

/** « 12/04/2031 » → « 2031-04-12 », ou null si la date n'existe pas. */
function frDateToIso(input: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim())
  if (!m) return null
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

function inferFileType(mime: string): "image" | "pdf" | "other" {
  if (mime.startsWith("image/")) return "image"
  if (mime === "application/pdf") return "pdf"
  return "other"
}

type Alert = { title: string; message: string }

/** Ajout d'un document (apps/mobile/src/app/idoc/add.tsx). */
export default function DocAddSelect() {
  const router = useRouter()
  const params = useSearchParams()
  const generateUrl = useMutation(api.idoc.generateUploadUrl)
  const createItem = useMutation(api.idoc.create)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const [selected, setSelected] = React.useState<DocFolderId>(findDocFolder(params.get("folder") ?? undefined)?.id ?? "identity")
  const [name, setName] = React.useState("")
  const [expiration, setExpiration] = React.useState("")
  const [picked, setPicked] = React.useState<File | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [alert, setAlert] = React.useState<Alert | null>(null)

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    setPicked(f)
    if (!name) setName(f.name)
  }

  async function submit() {
    if (submitting) return
    if (!picked) return setAlert({ title: "Aucun fichier", message: "Choisis un fichier ou prends une photo." })
    if (!name.trim()) return setAlert({ title: "Nom requis", message: "Donne un nom à ce document." })
    const expirationIso = expiration.trim() ? frDateToIso(expiration) : undefined
    if (expirationIso === null) {
      return setAlert({ title: "Date invalide", message: "Saisis la date d’expiration au format JJ/MM/AAAA." })
    }
    setSubmitting(true)
    try {
      const mime = picked.type || "application/octet-stream"
      const uploadUrl = await generateUrl({})
      const uploadRes = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mime }, body: picked })
      if (!uploadRes.ok) throw new Error(`L’envoi du fichier a échoué (code ${uploadRes.status}).`)
      const { storageId } = (await uploadRes.json()) as { storageId: string }
      await createItem({
        folderId: selected,
        contentRef: storageId as Id<"_storage">,
        name: name.trim(),
        originalName: picked.name,
        mimeType: mime,
        fileType: inferFileType(mime),
        fileSize: picked.size,
        expirationDate: expirationIso,
      })
      router.replace(`/idoc/add-success?folder=${selected}`)
    } catch (err) {
      setAlert({ title: "Ajout impossible", message: err instanceof Error ? cleanError(err.message) : "Réessaie dans un instant." })
      setSubmitting(false)
    }
  }

  return (
    <Screen
      header={<AppBar title="Ajouter un document" back="history" />}
      footer={
        <IdnButton full onClick={submit} disabled={!picked} loading={submitting}>
          {submitting ? "Envoi en cours…" : "Ajouter le document"}
        </IdnButton>
      }
    >
      <SectionTitle>Dossier</SectionTitle>
      <div role="radiogroup" aria-label="Dossier" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {DOC_FOLDERS.map((f) => {
          const sel = f.id === selected
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={sel}
              onClick={() => setSelected(f.id)}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sel ? "border-idn-green bg-c-green-badge font-semibold text-c-green-text" : "border-idn-border bg-idn-surface font-medium text-idn-ink"
              )}
            >
              <Icon name={f.icon} size={16} className={sel ? undefined : "text-idn-ink-2"} />
              {f.label}
            </button>
          )
        })}
      </div>

      <SectionTitle>Fichier</SectionTitle>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={onPicked} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={picked ? `Fichier choisi : ${picked.name}. Appuie pour en choisir un autre` : "Choisir un fichier"}
        className={cn(
          "flex w-full items-center gap-3 rounded-[14px] border bg-idn-surface p-3.5 text-left outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
          picked ? "border-idn-green" : "border-idn-border"
        )}
      >
        <IconTile icon={picked ? "checkCir" : "upload"} tone={picked ? "green" : "neutral"} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-idn-ink">{picked ? picked.name : "Choisir un fichier"}</span>
          <span className="mt-0.5 block text-[13px] text-idn-muted">
            {picked ? `${formatBytes(picked.size)} · appuie pour changer` : "PDF ou image (JPG, PNG)"}
          </span>
        </span>
      </button>

      <SectionTitle>Informations</SectionTitle>
      <IdnInput label="Nom du document" value={name} onChange={(e) => setName(e.target.value)} className="mt-0" />
      <IdnInput
        label="Date d’expiration (facultatif)"
        placeholder="JJ/MM/AAAA"
        hint="Tu verras ce document signalé quand l’échéance approche."
        value={expiration}
        onChange={(e) => setExpiration(e.target.value)}
        maxLength={10}
        inputMode="numeric"
        className="mt-3.5"
      />

      <IdnDialog open={!!alert} onOpenChange={(o) => !o && setAlert(null)} title={alert?.title ?? ""} description={alert?.message}>
        <div className="mt-5 flex justify-end">
          <IdnButton size="sm" className="min-h-11" onClick={() => setAlert(null)}>
            OK
          </IdnButton>
        </div>
      </IdnDialog>
    </Screen>
  )
}
