"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import {
  CalendarDaysIcon,
  ChevronsUpDownIcon,
  FileSignatureIcon,
  HistoryIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  QrCodeIcon,
  SettingsIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { cn } from "@repo/ui/lib/utils"

import { authClient } from "@/lib/auth-client"

import { shell } from "../../_content/fr"
import { formatNumber, initials } from "../../_lib/format"
import { NotificationsBell } from "./notifications-bell"

type CountKey = "queue" | "appointmentsToday"
type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  count?: CountKey
  countLabel?: (n: number) => string
  match: (pathname: string) => boolean
}

const GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Pilotage",
    items: [{ href: "/", label: "Tableau de bord", icon: LayoutDashboardIcon, match: (p) => p === "/" }],
  },
  {
    label: "Instruction",
    items: [
      {
        href: "/queue",
        label: "File de demandes",
        icon: ShieldCheckIcon,
        count: "queue",
        countLabel: (n) => `${n} dossier${n > 1 ? "s" : ""} à examiner`,
        match: (p) => p.startsWith("/queue"),
      },
      {
        href: "/agenda",
        label: "Agenda entretiens",
        icon: CalendarDaysIcon,
        count: "appointmentsToday",
        countLabel: (n) => `${n} entretien${n > 1 ? "s" : ""} aujourd'hui`,
        match: (p) => p.startsWith("/agenda"),
      },
    ],
  },
  {
    label: "Terrain",
    items: [
      { href: "/scan", label: "Contrôle d'identité", icon: QrCodeIcon, match: (p) => p.startsWith("/scan") },
      { href: "/verify", label: "Vérifier un acte", icon: FileSignatureIcon, match: (p) => p.startsWith("/verify") },
    ],
  },
  {
    label: "Suivi",
    items: [{ href: "/history", label: "Historique", icon: HistoryIcon, match: (p) => p.startsWith("/history") }],
  },
]

export type SidebarUser = { name: string; email: string }

/**
 * Barre latérale. `rail` : 248px au-delà de 1024px, icônes seules (libellés
 * accessibles conservés) entre 768 et 1024px. `full` : toujours déployée,
 * pour le tiroir mobile.
 */
export function Sidebar({
  user,
  variant,
  onNavigate,
}: {
  user: SidebarUser
  variant: "rail" | "full"
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? "/"
  const counts = useQuery(api.controller.dashboard.counts, {})
  const rail = variant === "rail"
  // En mode rail, le texte n'apparaît qu'à partir de lg ; en dessous il reste lu par les lecteurs d'écran.
  const label = rail ? "sr-only lg:not-sr-only" : ""

  const signOut = async () => {
    await authClient.signOut()
    window.location.href = "/sign-in"
  }

  return (
    <div className="flex h-full flex-col bg-idn-surface">
      <div className={cn("px-4 pb-3 pt-4", rail && "max-lg:px-0 max-lg:pt-4")}>
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            rail && "max-lg:justify-center",
          )}
        >
          <IdnMark size={28} />
          <span className={cn("min-w-0", label)}>
            <span className="block text-sm font-semibold leading-tight text-idn-ink">{shell.brand}</span>
            <span className="mt-0.5 block whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              {shell.portal}
            </span>
          </span>
        </Link>
        <div className={cn("mt-3", rail && "max-lg:hidden")}>
          <IdnFlagBars width="100%" height={3} />
        </div>
      </div>

      <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-3">
        {GROUPS.map((group) => (
          <div key={group.label} className="mt-3 first:mt-1">
            <p
              className={cn(
                "px-2 pb-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted",
                label,
              )}
            >
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.match(pathname)
                const value = item.count && counts ? counts[item.count] : undefined
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={rail ? item.label : undefined}
                      className={cn(
                        "relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        rail && "max-lg:justify-center max-lg:px-0",
                        active
                          ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                          : "text-idn-ink-2 hover:bg-idn-surface-2",
                      )}
                    >
                      <Icon aria-hidden className="size-4 shrink-0" />
                      <span className={cn("min-w-0 flex-1 truncate", label)}>{item.label}</span>
                      {value !== undefined && value > 0 && (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-px font-mono text-[11px] font-medium tabular-nums",
                            active
                              ? "bg-idn-surface text-idn-green-dark dark:bg-idn-surface-2 dark:text-idn-green-on-dark"
                              : "bg-idn-surface-2 text-idn-ink-2",
                            rail && "max-lg:absolute max-lg:-right-1 max-lg:-top-1 max-lg:px-1 max-lg:text-[10px]",
                          )}
                        >
                          <span aria-hidden>{formatNumber(value)}</span>
                          <span className="sr-only">{item.countLabel?.(value)}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "flex items-center gap-1 border-t border-idn-border-soft p-2",
          rail && "max-lg:flex-col",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Compte de ${user.name}`}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-idn-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                rail && "max-lg:flex-none max-lg:justify-center",
              )}
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-idn-green-soft text-xs font-semibold text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
              >
                {initials(user.name)}
              </span>
              <span className={cn("min-w-0 flex-1", label)}>
                <span className="block truncate text-[13px] font-medium text-idn-ink">{user.name}</span>
                <span className="block truncate text-xs text-idn-muted">{shell.roleLabel}</span>
              </span>
              <ChevronsUpDownIcon aria-hidden className={cn("size-4 shrink-0 text-idn-muted", rail && "max-lg:hidden")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-idn-ink">{user.name}</span>
              <span className="truncate text-xs font-normal text-idn-muted">{user.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" onClick={onNavigate}>
                <SettingsIcon aria-hidden />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
              <LogOutIcon aria-hidden />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <NotificationsBell />
      </div>
    </div>
  )
}
