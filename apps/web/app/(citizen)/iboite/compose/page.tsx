"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Bold, Italic, Link2, List, ListOrdered, Underline } from "lucide-react"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { hasLetterContent, isHtmlLetterBody, letterBodyToText, plainTextToLetterHtml } from "@/lib/citizen/letter-content"

import { AttachmentList, ComposeField, MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_LABEL, uploadFile } from "../_components/compose-parts"
import { useIBoite } from "../_components/iboite-context"
import { errorMessage, useGoBack } from "../_lib/nav"

type Mode = "reply" | "replyAll" | "forward"

/** Rédaction d’un e-mail : transposition de apps/mobile/src/app/(tabs)/iboite/compose.tsx. */
export default function ComposePage() {
  return (
    <React.Suspense fallback={null}>
      <Compose />
    </React.Suspense>
  )
}

function escapeHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}

function Compose() {
  const params = useSearchParams()
  const { accounts, account } = useIBoite()
  const send = useMutation(api.iboite.messages.send)
  const generateUploadUrl = useMutation(api.iboite.messages.generateUploadUrl)
  const replyToId = params.get("replyToId") as Id<"iboiteMessage"> | null
  const mode: Mode = (["reply", "replyAll", "forward"] as const).find((m) => m === params.get("mode")) ?? "reply"
  const original = useQuery(api.iboite.messages.get, replyToId ? { messageId: replyToId } : "skip")
  const goBack = useGoBack(replyToId ? `/iboite/email/${replyToId}` : "/iboite")

  const [to, setTo] = React.useState(params.get("to") ?? "")
  const [subject, setSubject] = React.useState(params.get("subject") ?? "")
  const [attachments, setAttachments] = React.useState<File[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const editorRef = React.useRef<HTMLDivElement>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const prefilled = React.useRef(false)

  // Corps initial passé dans l’URL (`body`), comme sur le mobile. L’URL peut
  // venir d’un lien piégé : le corps est toujours ramené à du texte puis
  // échappé, jamais injecté tel quel (sinon `?body=<img onerror=…>` exécute
  // du script sur identite.ga).
  React.useEffect(() => {
    const body = params.get("body")
    if (body && editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = plainTextToLetterHtml(isHtmlLetterBody(body) ? letterBodyToText(body) : body)
    }
  }, [params])

  // Réponse / transfert : pré-remplit destinataire, objet et citation une seule fois.
  React.useEffect(() => {
    if (prefilled.current || !original) return
    const strip = (s: string) => s.replace(/^(Re|Tr|Fwd):\s*/i, "")
    const date = new Date(original.createdAt).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
    if (mode === "forward") setSubject((prev) => prev || `Tr: ${strip(original.subject)}`)
    else {
      setTo((prev) => prev || original.senderEmail)
      setSubject((prev) => prev || `Re: ${strip(original.subject)}`)
    }
    const quote = `--- Message d'origine ---\nDe : ${original.senderName} <${original.senderEmail}>\nDate : ${date}\nObjet : ${original.subject}\n\n${original.body}`
    if (editorRef.current && !editorRef.current.textContent?.trim()) {
      editorRef.current.innerHTML = `<p><br></p><blockquote style="margin:0;border-left:2px solid #9a9c8e;padding-left:12px">${escapeHtml(quote).replaceAll("\n", "<br>")}</blockquote>`
    }
    prefilled.current = true
  }, [original, mode])

  const title = !replyToId ? "Nouveau message" : mode === "forward" ? "Transférer" : "Répondre"

  function format(command: "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList") {
    editorRef.current?.focus()
    document.execCommand(command)
  }

  function addLink() {
    const url = window.prompt("Adresse du lien (https://…)")
    if (!url || !/^https?:\/\//i.test(url)) return
    editorRef.current?.focus()
    document.execCommand("createLink", false, url)
  }

  function pickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    setError(null)
    const next = [...attachments]
    for (const f of files) {
      if (next.length >= MAX_ATTACHMENTS) {
        setError(`Tu peux joindre jusqu’à ${MAX_ATTACHMENTS} fichiers.`)
        break
      }
      if (f.size > MAX_ATTACHMENT_BYTES) {
        setError(`Chaque pièce jointe est limitée à ${MAX_ATTACHMENT_LABEL}.`)
        continue
      }
      next.push(f)
    }
    setAttachments(next)
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
    const recipientEmail = raw.includes("@") ? raw : `${raw}@idn.ga`
    if (!raw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError("Saisis une adresse e-mail ou un identifiant iBoîte valide.")
      return
    }
    if (!subject.trim()) {
      setError("Donne un objet à ton message.")
      return
    }
    const rawBody = (editorRef.current?.innerHTML ?? "").trim()
    if (!hasLetterContent(rawBody)) {
      setError("Écris ton message.")
      return
    }
    const bodyHtml = isHtmlLetterBody(rawBody) ? rawBody : plainTextToLetterHtml(rawBody)
    setSubmitting(true)
    try {
      const uploaded = []
      for (const file of attachments) uploaded.push(await uploadFile(await generateUploadUrl(), file))
      await send({
        accountId: account._id,
        recipientEmail,
        recipientName: recipientEmail.split("@")[0] || recipientEmail,
        subject: subject.trim(),
        // Texte brut : `innerText` suit la mise en page (retours à la ligne des blocs).
        body: editorRef.current?.innerText.trim() || letterBodyToText(rawBody),
        bodyHtml,
        attachments: uploaded.length > 0 ? uploaded : undefined,
        inReplyTo: replyToId && mode !== "forward" ? replyToId : undefined,
      })
      goBack()
    } catch (err) {
      const code = (err as { data?: { code?: string } })?.data?.code
      setError(
        code === "RECIPIENT_UNKNOWN"
          ? "Aucun utilisateur ne correspond à cette adresse iBoîte."
          : code === "INVALID_EMAIL"
            ? "Adresse e-mail invalide."
            : errorMessage(err, "Envoi impossible.")
      )
      setSubmitting(false)
    }
  }

  const tool =
    "inline-flex size-9 items-center justify-center rounded-md text-idn-ink-2 outline-none hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"

  return (
    <Screen
      header={
        <AppBar
          title={title}
          back={replyToId ? `/iboite/email/${replyToId}` : "/iboite"}
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
            <IdnButton size="sm" type="submit" form="iboite-compose" loading={submitting} leadIcon={<Icon name="send" size={16} />}>
              Envoyer
            </IdnButton>
          </div>
        </>
      }
    >
      <form id="iboite-compose" onSubmit={submit} noValidate>
        <ComposeField label="De">
          <span className="min-w-0 flex-1 truncate text-sm text-idn-ink">{account?.emailAlias ?? (accounts === undefined ? "…" : "—")}</span>
        </ComposeField>
        <ComposeField label="À" htmlFor="compose-to">
          <input
            id="compose-to"
            type="text"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="destinataire@…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-idn-ink outline-none placeholder:text-idn-muted"
          />
        </ComposeField>
        <ComposeField label="Objet" htmlFor="compose-subject" srOnlyLabel>
          <input
            id="compose-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Objet"
            autoComplete="off"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-idn-ink outline-none placeholder:font-normal placeholder:text-idn-muted"
          />
        </ComposeField>
        <div role="toolbar" aria-label="Mise en forme du message" className="mt-2 flex flex-wrap gap-0.5 border-b border-idn-border pb-1">
          {(
            [
              ["bold", Bold, "Gras"],
              ["italic", Italic, "Italique"],
              ["underline", Underline, "Souligné"],
              ["insertUnorderedList", List, "Liste à puces"],
              ["insertOrderedList", ListOrdered, "Liste numérotée"],
            ] as const
          ).map(([command, C, label]) => (
            <button key={command} type="button" onClick={() => format(command)} aria-label={label} title={label} className={tool}>
              <C size={16} aria-hidden />
            </button>
          ))}
          <button type="button" onClick={addLink} aria-label="Ajouter un lien" title="Ajouter un lien" className={tool}>
            <Link2 size={16} aria-hidden />
          </button>
        </div>
        <div
          ref={editorRef}
          role="textbox"
          aria-label="Ton message"
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          data-placeholder="Ton message…"
          className="min-h-64 break-words py-3 text-[15px] leading-6 text-idn-ink outline-none empty:before:pointer-events-none empty:before:text-idn-muted empty:before:content-[attr(data-placeholder)] -mx-1 rounded-md px-1 focus-visible:ring-2 focus-visible:ring-ring [&_blockquote]:mt-2 [&_blockquote]:text-idn-muted [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_a]:text-c-green-text [&_a]:underline"
        />
        <AttachmentList files={attachments} disabled={submitting} onRemove={(i) => setAttachments((prev) => prev.filter((_, j) => j !== i))} />
      </form>
    </Screen>
  )
}
