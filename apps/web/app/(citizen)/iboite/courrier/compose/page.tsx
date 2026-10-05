"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useConvex, useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { hasLetterContent, isHtmlLetterBody, plainTextToLetterHtml } from "@/lib/citizen/letter-content"

import { AttachmentList, ComposeField, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL, uploadFile } from "../../_components/compose-parts"
import { useIBoite } from "../../_components/iboite-context"
import { LetterEditor, type LetterEditorHandle } from "../../_components/letter-editor"
import { errorMessage, useGoBack } from "../../_lib/nav"

/** Rédaction d’un courrier : transposition de apps/mobile/src/app/(tabs)/iboite/courrier/compose.tsx. */
export default function LetterComposePage() {
  return (
    <React.Suspense fallback={null}>
      <LetterCompose />
    </React.Suspense>
  )
}

function LetterCompose() {
  const params = useSearchParams()
  const convex = useConvex()
  const { accounts, account } = useIBoite()
  const send = useMutation(api.iboite.letters.send)
  const generateUploadUrl = useMutation(api.iboite.letters.generateUploadUrl)
  const goBack = useGoBack("/iboite")
  const [to, setTo] = React.useState(params.get("to") ?? "")
  const [subject, setSubject] = React.useState(params.get("subject") ?? "")
  const [initialHtml] = React.useState(() => {
    const body = params.get("body") ?? ""
    return body && !isHtmlLetterBody(body) ? plainTextToLetterHtml(body) : body
  })
  const [attachments, setAttachments] = React.useState<File[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const editorRef = React.useRef<LetterEditorHandle>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  /** Image insérée dans le courrier : envoyée au stockage, puis URL durable. */
  async function uploadInlineImage(file: File): Promise<string> {
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`Chaque image est limitée à ${MAX_ATTACHMENT_LABEL}.`)
    const { storageRef } = await uploadFile(await generateUploadUrl(), file)
    const url = await convex.query(api.iboite.letters.getStorageUrl, { storageRef: storageRef as Id<"_storage"> })
    if (!url) throw new Error("Impossible de résoudre l’image envoyée.")
    return url
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    setError(null)
    const accepted = files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)
    if (accepted.length < files.length) setError(`Chaque pièce jointe est limitée à ${MAX_ATTACHMENT_LABEL}.`)
    setAttachments((prev) => [...prev, ...accepted])
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (submitting) return
    setError(null)
    if (!account) {
      setError("Aucun compte iBoîte actif.")
      return
    }
    const raw = to.trim().toLowerCase()
    if (!raw) {
      setError("Saisis une adresse iBoîte (login ou alias @idn.ga).")
      return
    }
    const recipient = raw.includes("@") ? raw : `${raw}@idn.ga`
    if (!recipient.endsWith("@idn.ga")) {
      setError("Les courriers numériques sont réservés aux adresses @idn.ga.")
      return
    }
    if (!subject.trim()) {
      setError("Donne un objet à ton courrier.")
      return
    }
    const body = (editorRef.current?.getHtml() ?? "").trim()
    if (!hasLetterContent(body)) {
      setError("Écris le contenu de ton courrier.")
      return
    }
    setSubmitting(true)
    try {
      const uploaded = []
      for (const file of attachments) uploaded.push(await uploadFile(await generateUploadUrl(), file))
      await send({
        accountId: account._id,
        recipientEmail: recipient,
        subject: subject.trim(),
        body,
        attachments: uploaded.length > 0 ? uploaded : undefined,
      })
      goBack()
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code
      setError(
        code === "RECIPIENT_UNKNOWN"
          ? "Aucun utilisateur ne correspond à cette adresse iBoîte."
          : code === "INVALID_DOMAIN"
            ? "Les courriers numériques sont réservés aux adresses @idn.ga."
            : errorMessage(err, "Envoi impossible.")
      )
      setSubmitting(false)
    }
  }

  return (
    <Screen
      width="wide"
      header={
        <AppBar
          title="Nouveau courrier"
          back="/iboite"
          backIcon="close"
          right={<IconButton icon="send" label="Envoyer" plain onClick={() => void submit()} className="text-c-green-text" />}
        />
      }
      footer={
        <>
          <ErrorNote className="mt-0">{error}</ErrorNote>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-2 text-[13px] font-medium text-idn-ink-2 outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <Icon name="paperclip" size={16} />
              Joindre
              <span className="text-xs font-normal text-idn-muted">Max {MAX_ATTACHMENT_LABEL}</span>
            </button>
            <input ref={fileRef} type="file" multiple hidden onChange={pickFiles} />
            <span className="flex-1" />
            <IdnButton size="sm" type="submit" form="iboite-letter" loading={submitting} leadIcon={<Icon name="send" size={16} />}>
              Envoyer
            </IdnButton>
          </div>
        </>
      }
    >
      <form id="iboite-letter" onSubmit={submit} noValidate>
        <ComposeField label="De">
          <span className="min-w-0 flex-1 truncate text-sm text-idn-ink">{account?.emailAlias ?? (accounts === undefined ? "…" : "—")}</span>
        </ComposeField>
        <ComposeField label="À" htmlFor="letter-to">
          <input
            id="letter-to"
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="login ou destinataire@idn.ga"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-idn-ink outline-none placeholder:text-idn-muted"
          />
        </ComposeField>
        <ComposeField label="Objet" htmlFor="letter-subject" srOnlyLabel>
          <input
            id="letter-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-idn-ink outline-none placeholder:font-normal placeholder:text-idn-muted"
          />
        </ComposeField>
        <LetterEditor
          ref={editorRef}
          initialHtml={initialHtml}
          onUploadImage={uploadInlineImage}
          onUploadError={(err) => setError(`Image non ajoutée. ${errorMessage(err, "Réessaie.")}`)}
          className="mt-3"
        />
        <AttachmentList files={attachments} disabled={submitting} onRemove={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))} />
      </form>
    </Screen>
  )
}
