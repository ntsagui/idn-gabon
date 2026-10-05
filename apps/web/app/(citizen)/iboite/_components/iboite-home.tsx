"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Card, IconTile, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { formatRelativeTime, formatShortDate } from "../_lib/format"
import { AddressStrip } from "./address-strip"
import { useIBoite, type LetterFolder, type MessageFolder, type Tab } from "./iboite-context"

const LETTER_FOLDERS: { id: LetterFolder; label: string }[] = [
  { id: "inbox", label: "Réception" },
  { id: "pending", label: "À traiter" },
  { id: "sent", label: "Expédiés" },
  { id: "trash", label: "Corbeille" },
]
const EMAIL_FOLDERS: { id: MessageFolder; label: string }[] = [
  { id: "inbox", label: "Réception" },
  { id: "starred", label: "Favoris" },
  { id: "archive", label: "Archives" },
  { id: "sent", label: "Envoyés" },
  { id: "trash", label: "Corbeille" },
]
const ACCOUNT_ICON: Record<string, IconName> = { personal: "user", professional: "briefcase", association: "users" }
const ACCOUNT_LABEL: Record<string, string> = { personal: "Personnel", professional: "Professionnel", association: "Association" }

const chip = (sel: boolean) =>
  cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
    sel ? "border-idn-green bg-c-green-badge font-semibold text-c-green-text" : "border-idn-border bg-idn-surface font-medium text-idn-ink-2 hover:bg-idn-surface-2"
  )

function Chips<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-2.5 md:mx-0 md:flex-wrap md:px-0">
      {items.map((f) => (
        <button key={f.id} type="button" aria-pressed={f.id === value} onClick={() => onChange(f.id)} className={chip(f.id === value)}>
          {f.label}
        </button>
      ))}
    </div>
  )
}

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
 * Accueil iBoîte : transposition de apps/mobile/src/app/(tabs)/iboite/index.tsx
 * (comptes, adresse copiable, onglets E-mails / Courriers / Colis avec dossiers).
 * Sur grand écran, c’est la colonne de gauche ; la lecture s’ouvre à droite.
 */
export function IBoiteHome() {
  const pathname = usePathname()
  const { accounts, account, setActiveAccountId, tab, setTab } = useIBoite()
  const [aliasCopied, setAliasCopied] = React.useState<"ok" | "ko" | null>(null)
  const tabRefs = React.useRef<Record<Tab, HTMLButtonElement | null>>({ emails: null, courriers: null, colis: null })

  async function copyAlias(alias: string) {
    try {
      await navigator.clipboard.writeText(alias)
      setAliasCopied("ok")
    } catch {
      setAliasCopied("ko")
    }
    window.setTimeout(() => setAliasCopied(null), 2500)
  }

  const tabs = account
    ? ([
        { id: "emails", label: "E-mails", n: account.counters.unreadMessages },
        { id: "courriers", label: "Courriers", n: account.counters.unreadLetters },
        { id: "colis", label: "Colis", n: account.counters.availablePackages },
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

  return (
    <Screen
      className="md:px-6"
      header={
        <AppBar
          title="iBoîte"
          headingLevel={pathname === "/iboite" ? 1 : 2}
          right={
            account && tab !== "colis" ? (
              <IconButton
                icon="edit"
                label={tab === "courriers" ? "Nouveau courrier" : "Nouveau message"}
                href={tab === "courriers" ? "/iboite/courrier/compose" : "/iboite/compose"}
              />
            ) : null
          }
        />
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
          <div role="group" aria-label="Mes boîtes" className="-mx-5 flex gap-2 overflow-x-auto px-5 pt-3.5 md:mx-0 md:flex-wrap md:px-0">
              {accounts.map((a) => {
                const sel = a._id === account._id
                const unread = a.counters.unreadMessages + a.counters.unreadLetters
                const label = a.label || ACCOUNT_LABEL[a.type]
                return (
                  <button
                    key={a._id}
                    type="button"
                    aria-pressed={sel}
                    aria-label={`${label}${unread ? `, ${unread} non lus` : ""}`}
                    onClick={() => setActiveAccountId(a._id)}
                    className={cn(chip(sel), "px-3.5 py-2 text-sm")}
                  >
                    <Icon name={ACCOUNT_ICON[a.type] ?? "user"} size={16} />
                    {label}
                    {unread ? (
                      <span aria-hidden className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-idn-green px-[5px] text-[11px] font-semibold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

          <button
            type="button"
            onClick={() => void copyAlias(account.emailAlias)}
            aria-label={`Copier ton adresse ${account.emailAlias}`}
            className="mt-2.5 flex w-full items-center gap-2 rounded-[10px] bg-idn-surface-2 px-3 py-2.5 text-left outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="mail" size={16} className="shrink-0 text-idn-ink-2" />
            <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-idn-ink">{account.emailAlias}</span>
            <Icon name={aliasCopied === "ok" ? "check" : "copy"} size={16} className="shrink-0 text-idn-muted" />
          </button>
          <p role="status" className="text-xs text-idn-muted">
            {aliasCopied ? <span className="mt-1 block">{aliasCopied === "ok" ? `Adresse copiée : ${account.emailAlias}` : "Copie impossible sur ce navigateur."}</span> : null}
          </p>

          <div role="tablist" aria-label="Rubriques iBoîte" className="mt-3 flex rounded-xl bg-idn-surface-2 p-[3px]">
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
                    "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-[9px] border text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sel ? "border-idn-border bg-idn-surface text-idn-ink" : "border-transparent text-idn-muted hover:text-idn-ink"
                  )}
                >
                  {s.label}
                  {s.n ? (
                    <span className="text-xs font-semibold text-c-green-text">
                      {s.n}
                      <span className="sr-only"> non lus</span>
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>

          <div role="tabpanel" id={`iboite-panel-${tab}`} aria-labelledby={`iboite-tab-${tab}`}>
            {tab === "emails" ? <EmailsList accountId={account._id} /> : null}
            {tab === "courriers" ? (
              <>
                <AddressStrip account={account} />
                <LettersList accountId={account._id} />
              </>
            ) : null}
            {tab === "colis" ? (
              <>
                <AddressStrip account={account} />
                <PackagesList accountId={account._id} qr={account.qrCode} />
              </>
            ) : null}
          </div>
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

const selectedRow = "-mx-2 rounded-[10px] bg-idn-surface-2 px-2"

function EmailsList({ accountId }: { accountId: Id<"iboiteAccount"> }) {
  const { emailFolder: folder, setEmailFolder, search, setSearch } = useIBoite()
  const openId = useOpenId("email")
  const result = usePaginatedQuery(api.iboite.messages.listByFolder, { accountId, folder }, { initialNumItems: 30 })
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const q = search.trim().toLocaleLowerCase("fr")
  const emails = q
    ? result.results.filter((e) => [e.senderName, e.senderEmail, e.subject, e.preview].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      <div className="mt-3 flex h-11 items-center gap-2 rounded-[10px] border border-idn-border bg-idn-surface px-3 focus-within:border-2 focus-within:border-idn-green focus-within:px-[11px]">
        <Icon name="search" size={16} className="shrink-0 text-idn-muted" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher dans les messages"
          aria-label="Rechercher dans les messages"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-idn-ink outline-none placeholder:text-idn-muted"
        />
      </div>
      <Chips items={EMAIL_FOLDERS} value={folder} onChange={setEmailFolder} label="Dossiers des e-mails" />
      {result.status === "LoadingFirstPage" ? (
        <Loading />
      ) : emails.length === 0 ? (
        <Empty text={q ? "Aucun message ne correspond." : "Aucun message dans ce dossier."} />
      ) : (
        <Card>
          {emails.map((e) => (
            <Row
              key={e._id}
              className={e._id === openId ? selectedRow : undefined}
              icon={e.senderKind === "admin" ? "landmark" : "mail"}
              tone={e.senderKind === "admin" ? "green" : "blue"}
              unread={!e.isRead}
              title={e.subject || "(sans objet)"}
              sub={`${folder === "sent" ? `À : ${e.recipientEmail}` : e.senderName} · ${formatRelativeTime(e.createdAt)}${e.hasAttachment ? " · pièce jointe" : ""}`}
              href={`/iboite/email/${e._id}`}
              ariaLabel={`${e.isRead ? "" : "Non lu, "}${e.subject || "(sans objet)"}, de ${e.senderName}`}
              right={
                <button
                  type="button"
                  onClick={() => void toggleStar({ messageId: e._id })}
                  aria-label={e.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}
                  aria-pressed={e.isStarred}
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring",
                    e.isStarred ? "text-c-yellow-text" : "text-idn-muted"
                  )}
                >
                  <Icon name="star" size={18} filled={e.isStarred} />
                </button>
              }
            />
          ))}
        </Card>
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
  const { letterFolder: folder, setLetterFolder } = useIBoite()
  const openId = useOpenId("courrier")
  const result = usePaginatedQuery(api.iboite.letters.listByFolder, { accountId, folder }, { initialNumItems: 30 })
  const letters = result.results
  return (
    <>
      <Chips items={LETTER_FOLDERS} value={folder} onChange={setLetterFolder} label="Dossiers des courriers" />
      {result.status === "LoadingFirstPage" ? (
        <Loading />
      ) : letters.length === 0 ? (
        <Empty text="Aucun courrier dans ce dossier." />
      ) : (
        <Card>
          {letters.map((l) => (
            <Row
              key={l._id}
              className={l._id === openId ? selectedRow : undefined}
              icon="scrollText"
              tone={l.type === "action_required" ? "yellow" : "blue"}
              unread={!l.isRead}
              title={folder === "sent" ? `À : ${l.recipientName}` : l.senderName}
              sub={`${l.subject}${l.dueAt ? ` · réponse avant le ${new Date(l.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}`}
              href={`/iboite/courrier/${l._id}`}
              right={<span className="shrink-0 font-mono text-[11px] text-idn-muted">{formatRelativeTime(l.createdAt)}</span>}
            />
          ))}
        </Card>
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
  const data = useQuery(api.iboite.packages.listMine, { accountId })
  const markPickedUp = useMutation(api.iboite.packages.markPickedUp)
  const [toPick, setToPick] = React.useState<Id<"iboitePackage"> | null>(null)
  if (data === undefined) return <Loading />
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
      {data.items.length === 0 ? (
        <Empty text="Aucun colis pour le moment." />
      ) : (
        <Card as="ul" className="mt-3">
          {data.items.map((p) => (
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
