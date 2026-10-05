"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Avatar } from "@/app/_components/idn/list"
import { LevelBadge } from "@/app/_components/idn/badge"
import { initialsOf } from "@/lib/citizen/last-account"

/** Les 4 onglets du mobile (apps/mobile/src/components/chrome/tab-bar.tsx). */
const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Accueil", icon: "home" },
  { href: "/icarte", label: "iCarte", icon: "wallet" },
  { href: "/iboite", label: "iBoîte", icon: "mailbox" },
  { href: "/profile", label: "Profil", icon: "userRound" },
]

/** Raccourcis de l'accueil mobile, rangés sous les onglets sur grand écran. */
const SERVICES: { href: string; label: string; icon: IconName }[] = [
  { href: "/idoc", label: "iDocument", icon: "lock" },
  { href: "/icv", label: "iCV", icon: "fileUser" },
  { href: "/mes-services", label: "Services publics", icon: "landmark" },
]

/**
 * La barre d'onglets n'apparaît qu'à la racine des 4 onglets, comme sur le
 * mobile : les autres écrans (carte, KYC, réglages…) ont leur bouton retour.
 */
export function isTabRoot(pathname: string): boolean {
  return TABS.some((t) => t.href === pathname)
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard"
  if (href === "/profile") {
    return ["/profile", "/settings", "/consents", "/activity"].some((p) => pathname === p || pathname.startsWith(`${p}/`))
  }
  if (href === "/mes-services" && pathname.startsWith("/service/")) return true
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function CitizenShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const tabbed = isTabRoot(pathname)
  return (
    <div
      className="flex min-h-svh bg-idn-bg"
      style={{ "--tabbar-h": tabbed ? "calc(64px + env(safe-area-inset-bottom))" : "0px" } as React.CSSProperties}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-[10px] focus:bg-idn-green focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>
      <Sidebar pathname={pathname} />
      <main id="main" tabIndex={-1} className={cn("flex min-w-0 flex-1 flex-col outline-none", tabbed && "pb-[var(--tabbar-h)] md:pb-0")}>
        {children}
      </main>
      {tabbed ? <TabBar pathname={pathname} /> : null}
    </div>
  )
}

function Sidebar({ pathname }: { pathname: string }) {
  const user = useQuery(api.profile.getCurrentUser)
  const unread = useQuery(api.notifications.unreadCount)
  const pivot = user?.profile?.pivot
  const loa = (user?.profile?.loa ?? 1) as 1 | 2 | 3
  const item = (active: boolean) =>
    cn(
      "flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
      active ? "bg-c-green-badge font-semibold text-c-green-text" : "font-medium text-idn-ink hover:bg-idn-surface-2"
    )
  return (
    <nav
      aria-label="Navigation principale"
      className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col border-r border-idn-border bg-idn-surface md:flex"
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 px-5 pb-4 pt-5 outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <IdnMark size={30} />
        <span className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-idn-muted">République gabonaise</span>
          <span className="text-[15px] font-semibold text-idn-ink">Identité Numérique</span>
        </span>
      </Link>
      <div className="flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-0.5">
          {TABS.map((t) => {
            const active = isActive(pathname, t.href)
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className={item(active)}>
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
        <p className="mb-1.5 mt-6 px-3 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-idn-muted">Mes services</p>
        <ul className="flex flex-col gap-0.5">
          {SERVICES.map((t) => {
            const active = isActive(pathname, t.href)
            return (
              <li key={t.href}>
                <Link href={t.href} aria-current={active ? "page" : undefined} className={item(active)}>
                  <Icon name={t.icon} size={20} />
                  {t.label}
                </Link>
              </li>
            )
          })}
          <li>
            <Link href="/notifications" aria-current={pathname === "/notifications" ? "page" : undefined} className={item(pathname === "/notifications")}>
              <Icon name="bell" size={20} />
              <span className="flex-1">Notifications</span>
              {unread ? (
                <span className="rounded-full bg-[#b3261e] px-1.5 text-xs font-semibold leading-5 text-white">
                  {unread}
                  <span className="sr-only"> non lue{unread > 1 ? "s" : ""}</span>
                </span>
              ) : null}
            </Link>
          </li>
          <li>
            <Link href="/scanner" aria-current={pathname === "/scanner" ? "page" : undefined} className={item(pathname === "/scanner")}>
              <Icon name="scanLine" size={20} />
              Vérifier un acte officiel
            </Link>
          </li>
        </ul>
      </div>
      <Link
        href="/profile"
        className="m-3 flex items-center gap-3 rounded-[14px] border border-idn-border p-3 outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar photoUrl={user?.profile?.photoUrl} initials={initialsOf(pivot?.firstName, pivot?.lastName, user?.email)} size={36} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-sm font-semibold text-idn-ink">{pivot ? `${pivot.firstName} ${pivot.lastName}` : (user?.email ?? "…")}</span>
          <LevelBadge level={loa} short />
        </span>
      </Link>
    </nav>
  )
}

/** Barre d'onglets du mobile (`.tabBar`) : 4 onglets, actif en vert 600. */
function TabBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-idn-border bg-idn-surface px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 md:hidden"
    >
      {TABS.map((t) => {
        const active = isActive(pathname, t.href)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-[3px] rounded-[10px] py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "font-semibold text-c-green-text" : "font-medium text-idn-muted"
            )}
          >
            <Icon name={t.icon} size={22} />
            {t.label}
          </Link>
        )
      })}
    </nav>
  )
}
