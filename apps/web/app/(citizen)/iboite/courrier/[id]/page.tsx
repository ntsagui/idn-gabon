"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useConvex, useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Callout, ErrorNote, Overline } from "@/app/_components/idn/list"
import { CenterState, Screen } from "@/app/_components/idn/screen"
import { isHtmlLetterBody, letterBodyToText } from "@/lib/citizen/letter-content"

import { ActionBar, type BarAction } from "../../_components/action-bar"
import { useIBoite } from "../../_components/iboite-context"
import { LetterBody } from "../../_components/letter-editor"
import { formatBytes, formatLongDate } from "../../_lib/format"
import { errorMessage } from "../../_lib/nav"
import "../../_lib/letter-content.css"

/** Lecture d’un courrier : transposition de apps/mobile/src/app/(tabs)/iboite/courrier/[id].tsx. */
export default function CourrierPage() {
  const router = useRouter()
  const convex = useConvex()
  const { id } = useParams<{ id: string }>()
  const letterId = id as Id<"iboiteLetter">
  const { account, setActiveAccountId } = useIBoite()
  const letter = useQuery(api.iboite.letters.get, { letterId })
  const markRead = useMutation(api.iboite.letters.markRead)
  const moveLetter = useMutation(api.iboite.letters.move)
  const [moreOpen, setMoreOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [note, setNote] = React.useState<string | null>(null)
  const [downloading, setDownloading] = React.useState(false)

  React.useEffect(() => {
    if (letter && !letter.isRead) void markRead({ letterId: letter._id }).catch(() => {})
  }, [letter, markRead])

  const accountId = letter?.accountId
  React.useEffect(() => {
    if (accountId && account && account._id !== accountId) setActiveAccountId(accountId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  if (letter === undefined) {
    return (
      <Screen header={<AppBar title="Courrier" back="/iboite" />}>
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      </Screen>
    )
  }
  if (!letter) {
    return (
      <Screen header={<AppBar title="Courrier" back="/iboite" />}>
        <CenterState visual={<Icon name="scrollText" size={40} className="text-idn-muted" />} title="Courrier introuvable.">
          Il a peut-être été supprimé définitivement.
        </CenterState>
      </Screen>
    )
  }

  const current = letter
  const created = formatLongDate(current.createdAt)
  const dueLabel = current.dueAt ? formatLongDate(current.dueAt) : null
  const plainBody = letterBodyToText(current.body)
  const replyBody = `\n\n--- Courrier d'origine ---\nDe : ${current.senderName}\nDate : ${created}\nObjet : ${current.subject}\n\n${plainBody}`
  const replyHref =
    `/iboite/courrier/compose?subject=${encodeURIComponent(`Re: ${current.subject.replace(/^Re:\s*/i, "")}`)}` +
    `&body=${encodeURIComponent(replyBody)}`

  async function move(target: "pending" | "trash") {
    setError(null)
    try {
      await moveLetter({ letterId, target })
      router.replace("/iboite")
    } catch (err) {
      setError(errorMessage(err, "Action impossible."))
    }
  }

  function onPrint() {
    setMoreOpen(false)
    window.print()
  }

  async function onShare() {
    setMoreOpen(false)
    setNote(null)
    const text = `${current.senderName} — ${current.subject}\n\n${plainBody}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: current.subject, text })
      } catch {
        // partage annulé
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setNote("Texte du courrier copié.")
    } catch {
      setNote("Partage impossible sur ce navigateur.")
    }
  }

  /** PDF A4 de la feuille affichée (jsPDF + html2canvas, chargés à la demande). */
  async function onDownload() {
    setMoreOpen(false)
    setError(null)
    const paper = document.querySelector<HTMLElement>(`[data-letter-paper="${letterId}"]`)
    if (!paper) return
    setDownloading(true)
    try {
      const { exportLetterToPdf, safeFilename } = await import("../../_lib/letter-pdf")
      await exportLetterToPdf(paper, `${safeFilename(current.subject)}.pdf`)
    } catch (err) {
      setError(errorMessage(err, "Téléchargement impossible."))
    } finally {
      setDownloading(false)
    }
  }

  async function openAttachment(attachmentId: Id<"iboiteLetterAttachment">) {
    setError(null)
    try {
      const url = await convex.query(api.iboite.letters.attachmentUrl, { attachmentId })
      if (!url) throw new Error("Pièce jointe introuvable.")
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setError(errorMessage(err, "Ouverture impossible."))
    }
  }

  const actions: BarAction[] = [{ icon: "reply", label: "Répondre", primary: true, href: replyHref }]
  // « À traiter » n’existe que pour un courrier reçu (règle du backend).
  if (current.folder === "inbox") actions.push({ icon: "clock", label: "À traiter", onClick: () => void move("pending") })
  actions.push({ icon: "printer", label: "Imprimer", onClick: onPrint })
  actions.push({ icon: "share", label: "Partager", onClick: () => void onShare() })
  if (current.folder !== "trash") actions.push({ icon: "trash", label: "Supprimer", danger: true, onClick: () => void move("trash") })

  return (
    <Screen
      width="wide"
      header={<AppBar title="Courrier" back="/iboite" right={<IconButton icon="more" label="Autres actions" plain onClick={() => setMoreOpen(true)} />} />}
      footer={<ActionBar label="Actions sur le courrier" actions={actions} />}
    >
      <div className="-mx-2 mt-3.5 rounded-lg bg-idn-surface-2 p-2 md:mx-0 md:p-6">
        <article data-letter-paper={letterId} className="letter-paper" aria-label={`Courrier : ${current.subject}`}>
          <header className="flex justify-between gap-4 text-[11px] text-[#3a3a3a]">
            <div className="min-w-0 max-w-[48%]">
              <p className="font-bold text-[#1a1a1a]">{current.senderName}</p>
              <p className="whitespace-pre-line">{current.senderAddress}</p>
            </div>
            <div className="min-w-0 max-w-[48%] text-right">
              <p className="font-bold text-[#1a1a1a]">{current.recipientName}</p>
              <p className="whitespace-pre-line">{current.recipientAddress}</p>
            </div>
          </header>
          <p className="mt-6 text-right text-[11px] text-[#3a3a3a]">Libreville, le {created}</p>
          <h2 className="mt-6 border-b border-[#d6d2c4] pb-2 text-[14px] font-bold text-[#1a1a1a]">Objet : {current.subject}</h2>
          {isHtmlLetterBody(current.body) ? (
            <LetterBody key={current._id} html={current.body} className="mt-5 text-[13px] leading-7 text-[#2a2a2a]" />
          ) : (
            <div className="mt-5 whitespace-pre-wrap text-justify text-[13px] leading-7 text-[#2a2a2a]">{current.body}</div>
          )}
        </article>
      </div>

      {current.type === "action_required" && dueLabel ? (
        <Callout tone="red" icon="alert" title="Action requise">
          Réponse attendue avant le {dueLabel}
        </Callout>
      ) : null}

      {current.attachments.length > 0 ? (
        <section className="mt-4" aria-label="Pièces jointes">
          <Overline className="mb-2">Pièces jointes</Overline>
          <ul className="flex flex-col gap-1.5">
            {current.attachments.map((a) => (
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

      {downloading ? (
        <p role="status" className="mt-3 text-[13px] text-idn-muted">
          Préparation du PDF…
        </p>
      ) : null}
      {note ? (
        <p role="status" className="mt-3 text-[13px] text-idn-muted">
          {note}
        </p>
      ) : null}
      <ErrorNote>{error}</ErrorNote>

      <IdnDialog open={moreOpen} onOpenChange={setMoreOpen} title="Actions">
        <div className="mt-4 flex flex-col gap-2">
          <IdnButton variant="secondary" full leadIcon={<Icon name="download" size={16} />} onClick={() => void onDownload()}>
            Télécharger le PDF
          </IdnButton>
          <IdnButton variant="secondary" full leadIcon={<Icon name="printer" size={16} />} onClick={onPrint}>
            Imprimer
          </IdnButton>
          <IdnButton variant="secondary" full leadIcon={<Icon name="share" size={16} />} onClick={() => void onShare()}>
            Partager
          </IdnButton>
        </div>
      </IdnDialog>
    </Screen>
  )
}
