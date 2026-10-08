"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useConvex, useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { CenterState, Screen } from "@/app/_components/idn/screen"

import { ActionBar, PillLink, type BarAction } from "../../_components/action-bar"
import { EmailHtmlFrame } from "../../_components/email-html-frame"
import { EmailTextBody } from "../../_components/email-text-body"
import { useIBoite } from "../../_components/iboite-context"
import { SenderAvatar, VerifiedBadge } from "../../_components/sender-avatar"
import { formatBytes, formatDateTime, formatListTime } from "../../_lib/format"
import { errorMessage } from "../../_lib/nav"

const FOLDER_LABEL: Record<string, string> = { inbox: "Réception", starred: "Favoris", sent: "Envoyés", archive: "Archives", trash: "Corbeille" }

/** Extension courte d’un nom de fichier (« PDF »), affichée dans la vignette. */
function fileExtension(name: string) {
  const ext = name.split(".").pop()
  return ext && ext !== name && ext.length <= 4 ? ext : null
}

/** Lecture d’un e-mail : transposition de apps/mobile/src/app/(tabs)/iboite/email/[id].tsx. */
export default function EmailPage() {
  const router = useRouter()
  const convex = useConvex()
  const { id } = useParams<{ id: string }>()
  const messageId = id as Id<"iboiteMessage">
  const { account, setActiveAccountId } = useIBoite()
  const email = useQuery(api.iboite.messages.get, { messageId })
  const markRead = useMutation(api.iboite.messages.markRead)
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const move = useMutation(api.iboite.messages.move)
  const [error, setError] = React.useState<string | null>(null)
  const [details, setDetails] = React.useState(false)

  React.useEffect(() => {
    if (email && !email.isRead) void markRead({ messageId: email._id }).catch(() => {})
  }, [email, markRead])

  // Ouvert depuis un lien direct : la liste bascule sur la boîte du message.
  const accountId = email?.accountId
  React.useEffect(() => {
    if (accountId && account && account._id !== accountId) setActiveAccountId(accountId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  if (email === undefined) {
    return (
      <Screen header={<AppBar title="Message" back="/iboite" />}>
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      </Screen>
    )
  }
  if (!email) {
    return (
      <Screen header={<AppBar title="Message" back="/iboite" />}>
        <CenterState visual={<Icon name="mail" size={40} className="text-idn-muted" />} title="Message introuvable.">
          Il a peut-être été supprimé définitivement.
        </CenterState>
      </Screen>
    )
  }

  const isAdmin = email.senderKind === "admin"

  async function moveTo(target: "archive" | "trash") {
    setError(null)
    try {
      await move({ messageId, target })
      router.replace("/iboite")
    } catch (err) {
      setError(errorMessage(err, "Action impossible."))
    }
  }

  async function openAttachment(attachmentId: Id<"iboiteMessageAttachment">) {
    setError(null)
    try {
      const url = await convex.query(api.iboite.messages.attachmentUrl, { attachmentId })
      if (!url) throw new Error("Pièce jointe introuvable.")
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(errorMessage(err, "Ouverture impossible."))
    }
  }

  const actions: BarAction[] = []
  if (email.folder !== "archive" && email.folder !== "trash") actions.push({ icon: "archive", label: "Archiver", onClick: () => void moveTo("archive") })
  if (email.folder !== "trash") actions.push({ icon: "trash", label: "Supprimer", danger: true, onClick: () => void moveTo("trash") })
  const sent = email.folder === "sent"

  return (
    <Screen
      header={<ActionBar back="/iboite" label="Actions sur le message" actions={actions} />}
      footer={
        <div className="flex gap-2.5">
          <PillLink href={`/iboite/compose?replyToId=${id}`} icon="reply">
            Répondre
          </PillLink>
          <PillLink href={`/iboite/compose?replyToId=${id}&mode=forward`} icon="forward">
            Transférer
          </PillLink>
        </div>
      }
    >
      <div className="mt-1.5 flex items-start gap-2.5">
        <h1 className="min-w-0 flex-1 break-words text-[22px] font-medium leading-[1.3] text-idn-ink">{email.subject || "(sans objet)"}</h1>
        <button
          type="button"
          onClick={() => void toggleStar({ messageId }).catch(() => {})}
          aria-label={email.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
          aria-pressed={email.isStarred}
          className={cn(
            "-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
            email.isStarred ? "text-c-yellow-text" : "text-idn-muted"
          )}
        >
          <Icon name="star" size={22} filled={email.isStarred} />
        </button>
      </div>
      <span className="mt-2 inline-block rounded-[5px] bg-idn-surface-2 px-[7px] py-[3px] text-xs text-idn-ink-2">{FOLDER_LABEL[email.folder]}</span>

      <div className="mt-[18px] flex items-start gap-3">
        <SenderAvatar name={email.senderName} admin={isAdmin} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-idn-ink">
            <span className="truncate">{email.senderName}</span>
            {isAdmin ? <VerifiedBadge /> : null}
            <span className="shrink-0 text-xs font-normal text-idn-muted">{formatListTime(email.createdAt)}</span>
          </p>
          <button
            type="button"
            onClick={() => setDetails((d) => !d)}
            aria-expanded={details}
            aria-controls="email-details"
            className="-ml-1 mt-0.5 inline-flex min-h-6 max-w-full items-center gap-0.5 rounded-md px-1 text-[13px] text-idn-muted outline-none hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate">{sent ? `à ${email.recipientEmail}` : "à moi"}</span>
            <Icon name="chevDn" size={15} className={cn("shrink-0 transition-transform", details && "rotate-180")} />
            <span className="sr-only">{details ? "(masquer les détails)" : "(afficher les détails)"}</span>
          </button>
        </div>
      </div>
      {details ? (
        <dl id="email-details" className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl border border-idn-border p-3 text-[13px]">
          <dt className="text-idn-muted">De</dt>
          <dd className="min-w-0 break-all text-idn-ink">
            {email.senderName} <span className="font-mono text-xs text-idn-muted">&lt;{email.senderEmail}&gt;</span>
          </dd>
          <dt className="text-idn-muted">À</dt>
          <dd className="min-w-0 break-all font-mono text-xs text-idn-ink">{email.recipientEmail}</dd>
          <dt className="text-idn-muted">Date</dt>
          <dd className="text-idn-ink">{formatDateTime(email.createdAt)}</dd>
        </dl>
      ) : null}
      {isAdmin ? (
        <p className="mt-3 flex items-center gap-2.5 rounded-xl bg-c-green-badge px-3 py-2.5 text-[13px] text-c-green-text">
          <Icon name="landmark" size={18} className="shrink-0" />
          Message officiel d’une administration vérifiée.
        </p>
      ) : null}

      <div className="-mx-4 mt-3 md:mx-0 md:overflow-hidden md:rounded-xl md:border md:border-idn-border">{email.bodyHtml ? <EmailHtmlFrame html={email.bodyHtml} /> : <EmailTextBody text={email.body} />}</div>
      {email.attachments.length > 0 ? (
        <section className="mt-3" aria-label="Pièces jointes">
          <ul className="flex flex-col gap-2">
            {email.attachments.map((a) => (
              <li key={a._id}>
                <button
                  type="button"
                  onClick={() => void openAttachment(a._id)}
                  aria-label={`Ouvrir ${a.name}`}
                  className="flex w-full items-center gap-3 rounded-xl border border-idn-border bg-idn-surface px-3 py-2.5 text-left outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span aria-hidden className="inline-flex h-[42px] w-9 shrink-0 items-center justify-center rounded-md bg-c-red-badge text-[10px] font-bold uppercase text-c-red-text">
                    {fileExtension(a.name) ?? <Icon name="paperclip" size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-idn-ink">{a.name}</span>
                    <span className="block text-xs text-idn-muted">{formatBytes(a.size)}</span>
                  </span>
                  <Icon name="download" size={18} className="shrink-0 text-idn-muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  )
}
