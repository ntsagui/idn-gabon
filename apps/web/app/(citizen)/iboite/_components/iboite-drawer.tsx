"use client"

import * as React from "react"
import Link from "next/link"

import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@repo/ui/components/sheet"
import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"

import { useIBoite, type LetterFolder, type MessageFolder } from "./iboite-context"

export const EMAIL_FOLDERS: { id: MessageFolder; label: string; icon: IconName }[] = [
  { id: "inbox", label: "Réception", icon: "inbox" },
  { id: "starred", label: "Favoris", icon: "star" },
  { id: "sent", label: "Envoyés", icon: "send" },
  { id: "archive", label: "Archives", icon: "archive" },
  { id: "trash", label: "Corbeille", icon: "trash" },
]
export const LETTER_FOLDERS: { id: LetterFolder; label: string; icon: IconName }[] = [
  { id: "inbox", label: "Réception", icon: "inbox" },
  { id: "pending", label: "À traiter", icon: "clock" },
  { id: "sent", label: "Expédiés", icon: "send" },
  { id: "trash", label: "Corbeille", icon: "trash" },
]
const ACCOUNT_ICON: Record<string, IconName> = { personal: "user", professional: "briefcase", association: "users" }
const ACCOUNT_LABEL: Record<string, string> = { personal: "Personnel", professional: "Professionnel", association: "Association" }

const item = (sel: boolean) =>
  cn(
    "flex min-h-[46px] w-full items-center gap-4 rounded-full px-4 text-left text-[14.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
    sel ? "bg-c-green-badge font-bold text-c-green-text" : "font-medium text-idn-ink-2 hover:bg-idn-surface-2"
  )

/**
 * Tiroir de l’iBoîte (menu ☰ de la barre de recherche) : adresse @idn.ga,
 * dossiers de l’onglet courant, boîtes Perso / Pro / Asso, adresse postale.
 * Radix gère le piège du focus, Échap et le retour du focus sur ☰.
 */
export function IBoiteDrawer({ trigger }: { trigger: React.ReactElement }) {
  const { accounts, account, setActiveAccountId, tab, emailFolder, setEmailFolder, letterFolder, setLetterFolder } = useIBoite()
  const [open, setOpen] = React.useState(false)
  const [aliasCopied, setAliasCopied] = React.useState<"ok" | "ko" | null>(null)

  async function copyAlias(alias: string) {
    try {
      await navigator.clipboard.writeText(alias)
      setAliasCopied("ok")
    } catch {
      setAliasCopied("ko")
    }
    window.setTimeout(() => setAliasCopied(null), 2500)
  }

  if (!account || !accounts) return trigger

  const folders =
    tab === "emails"
      ? EMAIL_FOLDERS.map((f) => ({ ...f, sel: f.id === emailFolder, pick: () => setEmailFolder(f.id), n: f.id === "inbox" ? account.counters.unreadMessages : 0 }))
      : tab === "courriers"
        ? LETTER_FOLDERS.map((f) => ({ ...f, sel: f.id === letterFolder, pick: () => setLetterFolder(f.id), n: f.id === "inbox" ? account.counters.unreadLetters : 0 }))
        : []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="w-[300px] max-w-[85vw] gap-0 overflow-y-auto rounded-r-[18px] border-idn-border bg-idn-surface px-2.5 pb-4 pt-[max(env(safe-area-inset-top),16px)] shadow-none sm:max-w-[300px]"
      >
        <div className="flex items-center justify-between pb-3 pl-3.5">
          <SheetTitle className="text-xl font-bold text-idn-ink">
            <span className="text-c-green-text">i</span>Boîte
          </SheetTitle>
          <SheetClose
            aria-label="Fermer le menu"
            className="inline-flex size-10 items-center justify-center rounded-full text-idn-ink-2 outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="close" size={20} />
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">Dossiers, boîtes et réglages de l’iBoîte</SheetDescription>

        <button
          type="button"
          onClick={() => void copyAlias(account.emailAlias)}
          aria-label={`Copier ton adresse ${account.emailAlias}`}
          className="mx-1.5 flex items-center gap-2 rounded-xl bg-idn-surface-2 px-3 py-2.5 text-left outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-idn-ink">{account.emailAlias}</span>
          <Icon name={aliasCopied === "ok" ? "check" : "copy"} size={17} className="shrink-0 text-idn-muted" />
        </button>
        <p role="status" className="mx-1.5 text-xs text-idn-muted">
          {aliasCopied ? <span className="mt-1 block">{aliasCopied === "ok" ? `Adresse copiée : ${account.emailAlias}` : "Copie impossible sur ce navigateur."}</span> : null}
        </p>

        {folders.length > 0 ? (
          <nav aria-label={tab === "emails" ? "Dossiers des e-mails" : "Dossiers des courriers"} className="mt-2.5">
            <ul className="flex flex-col gap-0.5">
              {folders.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-current={f.sel ? "true" : undefined}
                    onClick={() => {
                      f.pick()
                      setOpen(false)
                    }}
                    className={item(f.sel)}
                  >
                    <Icon name={f.icon} size={20} />
                    <span className="flex-1">{f.label}</span>
                    {f.n ? (
                      <span className="text-[12.5px] font-semibold">
                        {f.n}
                        <span className="sr-only"> non lus</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <div aria-hidden className="mx-3 my-2 h-px bg-idn-border" />
        <h3 id="iboite-drawer-accounts" className="px-4 pb-1.5 pt-3 text-xs font-medium uppercase tracking-[0.04em] text-idn-muted">
          Mes boîtes
        </h3>
        <ul aria-labelledby="iboite-drawer-accounts" className="flex flex-col gap-0.5">
          {accounts.map((a) => {
            const sel = a._id === account._id
            const unread = a.counters.unreadMessages + a.counters.unreadLetters
            const label = a.label || ACCOUNT_LABEL[a.type]
            return (
              <li key={a._id}>
                <button
                  type="button"
                  aria-current={sel ? "true" : undefined}
                  onClick={() => {
                    setActiveAccountId(a._id)
                    setOpen(false)
                  }}
                  className={cn(item(false), sel && "font-bold text-idn-ink")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "inline-flex size-[26px] shrink-0 items-center justify-center rounded-full",
                      sel ? "bg-idn-green text-white" : "bg-idn-surface-2 text-idn-ink-2"
                    )}
                  >
                    <Icon name={ACCOUNT_ICON[a.type] ?? "user"} size={15} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {unread ? (
                    <span className={cn("text-[12.5px] font-semibold", sel && "text-c-green-text")}>
                      {unread}
                      <span className="sr-only"> non lus</span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>

        <div aria-hidden className="mx-3 my-2 h-px bg-idn-border" />
        <Link href={`/iboite/address-setup?accountId=${account._id}`} onClick={() => setOpen(false)} className={item(false)}>
          <Icon name="settings" size={20} />
          Adresse postale et réglages
        </Link>
      </SheetContent>
    </Sheet>
  )
}
