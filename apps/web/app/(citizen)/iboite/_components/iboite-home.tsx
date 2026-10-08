"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { Menu } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Avatar, Card, IconTile } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { initialsOf } from "@/lib/citizen/last-account"

import { formatListTime, formatShortDate } from "../_lib/format"
import { AddressStrip } from "./address-strip"
import { EMAIL_FOLDERS, IBoiteDrawer, LETTER_FOLDERS } from "./iboite-drawer"
import { useIBoite, type Tab } from "./iboite-context"
import { LetterAvatar, SenderAvatar, VerifiedBadge } from "./sender-avatar"

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <IdnLottie name="iboite" size={110} label="iBoîte" />
      <p className="mt-1 text-sm text-idn-muted">{text}</p>
    </div>
  )
}

const Loading = () => (
  <p role="status" className="mt-2 text-sm text-idn-muted">
    Chargement…
  </p>
)

/**
 * Accueil iBoîte, façon Gmail : barre de recherche en pilule (menu ☰ vers le
 * tiroir des dossiers et des boîtes, avatar), onglets E-mails / Courriers /
 * Colis soulignés, liste dense, bouton flottant « Écrire ».
 * Sur grand écran, c’est la colonne de gauche ; la lecture s’ouvre à droite.
 */
export function IBoiteHome() {
  const pathname = usePathname()
  const { accounts, account, tab, setTab, emailFolder, letterFolder, search, setSearch } = useIBoite()
  const user = useQuery(api.profile.getCurrentUser)
  const pivot = user?.profile?.pivot
  const tabRefs = React.useRef<Record<Tab, HTMLButtonElement | null>>({ emails: null, courriers: null, colis: null })
  const root = pathname === "/iboite"
  const Heading = root ? "h1" : "h2"
  const Section = root ? "h2" : "h3"

  const tabs = account
    ? ([
        { id: "emails", label: "E-mails", n: account.counters.unreadMessages, unit: "non lus" },
        { id: "courriers", label: "Courriers", n: account.counters.unreadLetters, unit: "non lus" },
        { id: "colis", label: "Colis", n: account.counters.availablePackages, unit: "à retirer" },
      ] as const)
    : []

  function onTabKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]
    if (!next) return
    setTab(next.id)
    tabRefs.current[next.id]?.focus()
  }

  const folderLabel =
    tab === "emails" ? EMAIL_FOLDERS.find((f) => f.id === emailFolder)?.label : tab === "courriers" ? LETTER_FOLDERS.find((f) => f.id === letterFolder)?.label : null

  return (
    <Screen
      className="md:px-6"
      contentClassName="flex flex-col"
      header={
        <div className="sticky top-0 z-20 bg-idn-bg pt-1.5 md:pt-6">
          <Heading className="sr-only">iBoîte</Heading>
          {account ? (
            <>
              <div className="mx-3.5 flex h-[52px] items-center gap-1 rounded-full bg-idn-surface-2 px-1.5 has-[input:focus]:ring-2 has-[input:focus]:ring-ring md:mx-0">
                <IBoiteDrawer
                  trigger={
                    <button
                      type="button"
                      aria-label="Ouvrir le menu de l’iBoîte"
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-idn-ink-2 outline-none hover:bg-idn-border/60 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Menu aria-hidden size={22} strokeWidth={1.8} />
                    </button>
                  }
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher dans iBoîte"
                  aria-label="Rechercher dans iBoîte"
                  className="h-full min-w-0 flex-1 bg-transparent px-1 text-base text-idn-ink outline-none placeholder:text-idn-ink-2"
                />
                <Link href="/profile" aria-label="Mon profil" className="inline-flex size-10 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar photoUrl={user?.profile?.photoUrl} initials={initialsOf(pivot?.firstName, pivot?.lastName, user?.email)} size={34} />
                </Link>
              </div>

              <div role="tablist" aria-label="Rubriques iBoîte" className="mt-2 flex border-b border-idn-border px-1.5 md:px-0">
                {tabs.map((s, i) => {
                  const sel = s.id === tab
                  return (
                    <button
                      key={s.id}
                      ref={(el) => {
                        tabRefs.current[s.id] = el
                      }}
                      type="button"
                      role="tab"
                      id={`iboite-tab-${s.id}`}
                      aria-selected={sel}
                      aria-controls={`iboite-panel-${s.id}`}
                      tabIndex={sel ? 0 : -1}
                      onClick={() => setTab(s.id)}
                      onKeyDown={(e) => onTabKey(e, i)}
                      className={cn(
                        "relative flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-t-lg text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                        sel ? "text-c-green-text" : "text-idn-muted hover:text-idn-ink"
                      )}
                    >
                      {s.label}
                      {s.n ? (
                        <span className={cn("rounded-full px-1.5 text-[11px] leading-[17px]", sel ? "bg-idn-green text-white" : "bg-idn-surface-2 text-idn-ink-2")}>
                          {s.n}
                          <span className="sr-only"> {s.unit}</span>
                        </span>
                      ) : null}
                      {sel ? <span aria-hidden className="absolute inset-x-[18%] -bottom-px h-[3px] rounded-t-[3px] bg-c-green-text" /> : null}
                    </button>
                  )
                })}
              </div>
            </>
          ) : null}
        </div>
      }
    >
      {accounts === undefined ? (
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      ) : !account ? (
        <Empty text="Aucun compte iBoîte. Termine ton inscription pour activer ton adresse @idn.ga." />
      ) : (
        <>
          <div role="tabpanel" id={`iboite-panel-${tab}`} aria-labelledby={`iboite-tab-${tab}`} className="mb-4">
            {tab !== "emails" ? <AddressStrip account={account} /> : null}
            {folderLabel ? <Section className="pb-1 pt-3.5 text-[13px] font-medium tracking-[0.06em] text-idn-ink-2">{folderLabel}</Section> : null}
            {tab === "emails" ? <EmailsList accountId={account._id} /> : null}
            {tab === "courriers" ? <LettersList accountId={account._id} /> : null}
            {tab === "colis" ? <PackagesList accountId={account._id} qr={account.qrCode} /> : null}
          </div>
          {tab !== "colis" ? (
            <Link
              href={tab === "courriers" ? "/iboite/courrier/compose" : "/iboite/compose"}
              className="sticky bottom-[calc(var(--tabbar-h,0px)+16px)] z-10 mt-auto inline-flex h-14 items-center gap-3 self-end rounded-[18px] bg-c-green-badge pl-[18px] pr-5 text-[15px] font-semibold text-idn-green-dark shadow-[0_6px_14px_-4px_rgba(10,92,44,0.35)] outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:text-c-green-text md:bottom-6"
            >
              <Icon name="edit" size={22} />
              {tab === "courriers" ? "Nouveau courrier" : "Écrire"}
            </Link>
          ) : null}
        </>
      )}
    </Screen>
  )
}

/** Id de l’élément ouvert dans le panneau de lecture (grand écran). */
function useOpenId(kind: "email" | "courrier") {
  const pathname = usePathname()
  const m = pathname.match(new RegExp(`^/iboite/${kind}/([^/]+)$`))
  return m && m[1] !== "compose" ? m[1] : null
}

const rowLink = (selected: boolean) =>
  cn(
    "flex gap-3.5 px-4 py-[11px] outline-none transition-colors hover:bg-idn-surface-2/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:rounded-xl md:px-3",
    selected && "bg-idn-surface-2 hover:bg-idn-surface-2"
  )

/** Ligne 1 d’une ligne de liste : expéditeur (+ badge vérifié) et heure. */
function RowHead({ who, verified, time, unread }: { who: string; verified?: boolean; time: string; unread: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className={cn("flex min-w-0 flex-1 items-center gap-1 text-base leading-[22px]", unread ? "font-bold text-idn-ink" : "text-idn-ink-2")}>
        <span className="truncate">{who}</span>
        {verified ? <VerifiedBadge size={15} /> : null}
      </span>
      <span className={cn("shrink-0 text-xs", unread ? "font-bold text-c-green-text" : "text-idn-muted")}>{time}</span>
    </span>
  )
}

const AttachmentChip = () => (
  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-idn-border px-2.5 py-[3px] text-xs text-idn-ink-2">
    <Icon name="paperclip" size={13} />
    Pièce jointe
  </span>
)

function EmailsList({ accountId }: { accountId: Id<"iboiteAccount"> }) {
  const { emailFolder: folder, search } = useIBoite()
  const openId = useOpenId("email")
  const result = usePaginatedQuery(api.iboite.messages.listByFolder, { accountId, folder }, { initialNumItems: 30 })
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const q = search.trim().toLocaleLowerCase("fr")
  const emails = q
    ? result.results.filter((e) => [e.senderName, e.senderEmail, e.subject, e.preview].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      {result.status === "LoadingFirstPage" ? (
        <Loading />
      ) : emails.length === 0 ? (
        <Empty text={q ? "Aucun message ne correspond." : "Aucun message dans ce dossier."} />
      ) : (
        <ul className="-mx-5 md:-mx-3">
          {emails.map((e) => {
            const subject = e.subject || "(sans objet)"
            const sent = folder === "sent"
            const admin = e.senderKind === "admin" && !sent
            const time = formatListTime(e.createdAt)
            return (
              <li key={e._id} className="relative">
                <Link
                  href={`/iboite/email/${e._id}`}
                  aria-label={`${e.isRead ? "" : "Non lu, "}${subject}, de ${e.senderName}${admin ? " (administration vérifiée)" : ""}, ${time}${e.hasAttachment ? ", avec pièce jointe" : ""}`}
                  className={rowLink(e._id === openId)}
                >
                  <SenderAvatar name={sent ? e.recipientName || e.recipientEmail : e.senderName} admin={admin} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <RowHead who={sent ? `À : ${e.recipientEmail}` : e.senderName} verified={admin} time={time} unread={!e.isRead} />
                    <span className={cn("block truncate text-sm leading-5", e.isRead ? "text-idn-ink-2" : "font-bold text-idn-ink")}>{subject}</span>
                    <span className="block truncate pr-8 text-sm leading-5 text-idn-muted">{e.preview}</span>
                    {e.hasAttachment ? <AttachmentChip /> : null}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void toggleStar({ messageId: e._id })}
                  aria-label={e.isStarred ? `Retirer des favoris : ${subject}` : `Ajouter aux favoris : ${subject}`}
                  aria-pressed={e.isStarred}
                  className={cn(
                    "absolute right-[5px] top-[43px] inline-flex size-10 items-center justify-center rounded-full outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring md:right-0",
                    e.isStarred ? "text-c-yellow-text" : "text-idn-muted"
                  )}
                >
                  <Icon name="star" size={18} filled={e.isStarred} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {result.status === "CanLoadMore" ? (
        <IdnButton variant="ghost" full className="mt-3" onClick={() => result.loadMore(30)}>
          Afficher plus
        </IdnButton>
      ) : null}
    </>
  )
}

function LettersList({ accountId }: { accountId: Id<"iboiteAccount"> }) {
  const { letterFolder: folder, search } = useIBoite()
  const openId = useOpenId("courrier")
  const result = usePaginatedQuery(api.iboite.letters.listByFolder, { accountId, folder }, { initialNumItems: 30 })
  const q = search.trim().toLocaleLowerCase("fr")
  const letters = q
    ? result.results.filter((l) => [l.senderName, l.recipientName, l.subject].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      {result.status === "LoadingFirstPage" ? (
        <Loading />
      ) : letters.length === 0 ? (
        <Empty text={q ? "Aucun courrier ne correspond." : "Aucun courrier dans ce dossier."} />
      ) : (
        <ul className="-mx-5 md:-mx-3">
          {letters.map((l) => {
            const who = folder === "sent" ? `À : ${l.recipientName}` : l.senderName
            const time = formatListTime(l.createdAt)
            const due = l.dueAt ? `Réponse avant le ${new Date(l.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : null
            return (
              <li key={l._id}>
                <Link
                  href={`/iboite/courrier/${l._id}`}
                  aria-label={`${l.isRead ? "" : "Non lu, "}${who}, ${l.subject}${due ? `, ${due.toLocaleLowerCase("fr")}` : ""}, ${time}${l.hasAttachments ? ", avec pièce jointe" : ""}`}
                  className={rowLink(l._id === openId)}
                >
                  <LetterAvatar actionRequired={l.type === "action_required"} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <RowHead who={who} time={time} unread={!l.isRead} />
                    <span className={cn("block truncate text-sm leading-5", l.isRead ? "text-idn-ink-2" : "font-bold text-idn-ink")}>{l.subject}</span>
                    {due || l.hasAttachments ? (
                      <span className="flex flex-wrap items-center gap-1.5">
                        {due ? (
                          <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-c-yellow-badge px-2 py-0.5 text-xs font-semibold text-c-yellow-text">
                            <Icon name="clock" size={13} />
                            {due}
                          </span>
                        ) : null}
                        {l.hasAttachments ? <AttachmentChip /> : null}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {result.status === "CanLoadMore" ? (
        <IdnButton variant="ghost" full className="mt-3" onClick={() => result.loadMore(30)}>
          Afficher plus
        </IdnButton>
      ) : null}
    </>
  )
}

function PackagesList({ accountId, qr }: { accountId: Id<"iboiteAccount">; qr: string }) {
  const { search } = useIBoite()
  const data = useQuery(api.iboite.packages.listMine, { accountId })
  const markPickedUp = useMutation(api.iboite.packages.markPickedUp)
  const [toPick, setToPick] = React.useState<Id<"iboitePackage"> | null>(null)
  if (data === undefined) return <Loading />
  const q = search.trim().toLocaleLowerCase("fr")
  const items = q ? data.items.filter((p) => [p.description, p.senderName, p.trackingNumber].join(" ").toLocaleLowerCase("fr").includes(q)) : data.items
  const statusBadge = (s: string) =>
    s === "available" ? (
      <Badge tone="green" icon="checkCir">
        À retirer
      </Badge>
    ) : s === "transit" ? (
      <Badge tone="blue" icon="truck">
        En transit
      </Badge>
    ) : s === "delivered" ? (
      <Badge tone="neutral">Retiré</Badge>
    ) : (
      <Badge tone="neutral">En attente</Badge>
    )
  return (
    <>
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="rounded-[14px] border border-idn-border bg-idn-surface p-3">
          <p className="text-xl font-semibold text-idn-ink">{data.available}</p>
          <p className="text-xs text-idn-muted">À retirer</p>
        </div>
        <div className="rounded-[14px] border border-idn-border bg-idn-surface p-3">
          <p className="text-xl font-semibold text-idn-ink">{data.transit}</p>
          <p className="text-xs text-idn-muted">En transit</p>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty text={q ? "Aucun colis ne correspond." : "Aucun colis pour le moment."} />
      ) : (
        <Card as="ul" className="mt-3">
          {items.map((p) => (
            <li key={p._id} className="flex flex-col gap-2 py-3">
              <div className="flex items-start gap-3">
                <IconTile icon="package" tone={p.status === "available" ? "green" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-idn-ink">{p.description}</p>
                  <p className="text-[13px] text-idn-muted">De : {p.senderName}</p>
                  <p className="mt-0.5 break-all font-mono text-xs text-idn-muted">{p.trackingNumber}</p>
                  {p.estimatedDeliveryAt && p.status === "transit" ? (
                    <p className="mt-0.5 text-xs text-idn-muted">Arrivée prévue le {formatShortDate(p.estimatedDeliveryAt)}</p>
                  ) : null}
                </div>
                {statusBadge(p.status)}
              </div>
              {p.status === "available" ? (
                <IdnButton variant="secondary" full onClick={() => setToPick(p._id)}>
                  J’ai retiré ce colis
                </IdnButton>
              ) : null}
            </li>
          ))}
        </Card>
      )}
      <div className="mt-4 flex items-center gap-2.5 rounded-[14px] border border-idn-border bg-idn-surface p-3">
        <Icon name="qr" size={24} className="shrink-0 text-idn-ink-2" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-idn-muted">Code iBoîte à présenter au guichet</p>
          <p className="mt-0.5 select-all break-all font-mono text-sm text-idn-ink">{qr}</p>
        </div>
      </div>
      <ConfirmDialog
        open={toPick !== null}
        onOpenChange={(o) => !o && setToPick(null)}
        title="Colis retiré ?"
        description="Confirme seulement si tu as le colis en main."
        confirmLabel="Oui, retiré"
        onConfirm={async () => {
          if (toPick) await markPickedUp({ packageId: toPick })
        }}
      />
    </>
  )
}
