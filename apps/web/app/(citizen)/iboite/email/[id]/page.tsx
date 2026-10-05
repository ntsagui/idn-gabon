"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useConvex, useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote, Overline } from "@/app/_components/idn/list"
import { CenterState, Screen } from "@/app/_components/idn/screen"

import { ActionBar, type BarAction } from "../../_components/action-bar"
import { EmailHtmlFrame } from "../../_components/email-html-frame"
import { EmailTextBody } from "../../_components/email-text-body"
import { useIBoite } from "../../_components/iboite-context"
import { formatBytes, formatDateTime } from "../../_lib/format"
import { errorMessage } from "../../_lib/nav"

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

  const actions: BarAction[] = [
    { icon: "reply", label: "Répondre", primary: true, href: `/iboite/compose?replyToId=${id}` },
    { icon: "forward", label: "Transférer", href: `/iboite/compose?replyToId=${id}&mode=forward` },
  ]
  if (email.folder !== "archive" && email.folder !== "trash") actions.push({ icon: "archive", label: "Archiver", onClick: () => void moveTo("archive") })
  if (email.folder !== "trash") actions.push({ icon: "trash", label: "Supprimer", danger: true, onClick: () => void moveTo("trash") })

  return (
    <Screen
      header={
        <AppBar
          title="Message"
          back="/iboite"
          right={
            <button
              type="button"
              onClick={() => void toggleStar({ messageId }).catch(() => {})}
              aria-label={email.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
              aria-pressed={email.isStarred}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
                email.isStarred ? "text-c-yellow-text" : "text-idn-muted"
              )}
            >
              <Icon name="star" size={20} filled={email.isStarred} />
            </button>
          }
        />
      }
      footer={<ActionBar label="Actions sur le message" actions={actions} />}
    >
      <h2 className="mt-3.5 break-words text-lg font-bold leading-6 tracking-[-0.01em] text-idn-ink">{email.subject || "(sans objet)"}</h2>
      <div className="mt-4 flex items-start gap-3 border-b border-idn-border pb-3.5">
        <span aria-hidden className={cn("flex size-10 shrink-0 items-center justify-center rounded-full text-white", isAdmin ? "bg-idn-blue" : "bg-idn-green")}>
          <Icon name={isAdmin ? "building" : "user"} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-idn-ink">{email.senderName}</p>
          <p className="break-all font-mono text-xs text-idn-muted">{email.senderEmail}</p>
          <p className="mt-1 break-words text-xs text-idn-muted">
            À : {email.recipientEmail} · {formatDateTime(email.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-3.5 overflow-hidden rounded-xl border border-idn-border bg-idn-surface">
        {email.bodyHtml ? <EmailHtmlFrame html={email.bodyHtml} /> : <EmailTextBody text={email.body} />}
      </div>
      {email.attachments.length > 0 ? (
        <section className="mt-5" aria-label="Pièces jointes">
          <Overline className="mb-2">Pièces jointes</Overline>
          <ul className="flex flex-col gap-1.5">
            {email.attachments.map((a) => (
              <li key={a._id}>
                <button
                  type="button"
                  onClick={() => void openAttachment(a._id)}
                  aria-label={`Ouvrir ${a.name}`}
                  className="flex w-full items-center gap-2.5 rounded-[10px] border border-idn-border bg-idn-surface p-3 text-left outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon name="paperclip" size={18} className="shrink-0 text-idn-ink-2" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-idn-ink">{a.name}</span>
                    <span className="block text-xs text-idn-muted">{formatBytes(a.size)}</span>
                  </span>
                  <Icon name="download" size={16} className="shrink-0 text-idn-muted" />
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
