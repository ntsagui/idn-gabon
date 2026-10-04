"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { useEffect, useState, type ReactNode } from "react"

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

import { useApiKeys, useApplications } from "./data"
import { Icon, type IconName } from "./icons"
import { EASE } from "./ui"

type NavItem = {
  href: string
  label: string
  icon: IconName
  count?: number
  match: (path: string) => boolean
}

function useNavGroups(): Array<{ label: string; items: NavItem[] }> {
  const { groups } = useApplications()
  const keys = useApiKeys()
  const activeKeys = keys?.filter((key) => key.status === "active").length
  return [
    {
      label: "Intégration",
      items: [
        {
          href: "/applications",
          label: "Applications",
          icon: "apps",
          count: groups?.length,
          match: (p) => p.startsWith("/applications"),
        },
        {
          href: "/api-keys",
          label: "Clés API",
          icon: "key",
          count: activeKeys,
          match: (p) => p.startsWith("/api-keys"),
        },
        {
          href: "/usage",
          label: "Usage",
          icon: "chart",
          match: (p) => p.startsWith("/usage"),
        },
      ],
    },
    {
      label: "Ressources",
      items: [
        {
          href: "/docs",
          label: "Documentation",
          icon: "book",
          match: (p) => p.startsWith("/docs"),
        },
        {
          href: "/settings",
          label: "Paramètres",
          icon: "settings",
          match: (p) => p.startsWith("/settings"),
        },
      ],
    },
  ]
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("px-4 pb-4 pt-5", compact && "md:flex md:flex-col md:items-center md:px-0 lg:items-stretch lg:px-4")}>
      <Link
        href="/applications"
        className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
      >
        <IdnMark size={28} />
        <span className={cn("min-w-0 leading-tight", compact && "md:sr-only lg:not-sr-only")}>
          <span className="block text-[13px] font-semibold tracking-[-0.01em] text-idn-ink">
            Identité Numérique
          </span>
          <span className="block whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            Développeurs
          </span>
        </span>
      </Link>
      {compact ? (
        <>
          <IdnFlagBars width="100%" height={3} className="mt-4 hidden lg:flex" />
          <IdnFlagBars width={32} height={3} className="mt-4 lg:hidden" />
        </>
      ) : (
        <IdnFlagBars width="100%" height={3} className="mt-4" />
      )}
    </div>
  )
}

function NavList({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname() ?? ""
  const groups = useNavGroups()
  return (
    <nav aria-label="Navigation principale" className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label} className="mt-3 first:mt-0">
          <p
            className={cn(
              "px-2 pb-1.5 pt-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted",
              compact && "md:sr-only lg:not-sr-only",
            )}
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.match(pathname)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={compact ? item.label : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                      EASE,
                      compact && "md:justify-center md:px-0 lg:justify-start lg:px-2.5",
                      active
                        ? "bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                        : "text-idn-ink-2 hover:bg-idn-surface-2 hover:text-idn-ink",
                    )}
                  >
                    <Icon name={item.icon} size={18} className="shrink-0" />
                    <span className={cn("flex-1 truncate", compact && "md:sr-only lg:not-sr-only")}>
                      {item.label}
                    </span>
                    {item.count !== undefined ? (
                      <span
                        className={cn(
                          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] font-medium tabular-nums",
                          active
                            ? "bg-idn-surface text-idn-green dark:bg-idn-surface dark:text-idn-green-on-dark"
                            : "bg-idn-surface-2 text-idn-muted",
                          compact && "md:hidden lg:inline-flex",
                        )}
                      >
                        <span className="sr-only">, </span>
                        {item.count}
                      </span>
                    ) : null}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function UserCard({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const me = useQuery(api.profile.getCurrentUser)
  const session = authClient.useSession() as {
    data?: { user?: { name?: string | null; email?: string | null } } | null
  }
  const pivot = me?.profile?.pivot
  const fullName =
    session.data?.user?.name?.trim() ||
    [pivot?.firstName, pivot?.lastName].filter(Boolean).join(" ")
  const email = me?.email ?? session.data?.user?.email ?? ""
  const displayName = fullName || email || "Compte développeur"
  const initials =
    (fullName
      ? fullName
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join("")
      : email.slice(0, 1)
    ).toUpperCase() || "D"

  const signOut = async () => {
    try {
      await authClient.signOut()
    } finally {
      router.replace("/sign-in")
    }
  }

  return (
    <div className="border-t border-idn-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Menu du compte ${displayName}`}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-[10px] p-2 text-left outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-idn-green",
              EASE,
              compact && "md:justify-center lg:justify-start",
            )}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-idn-green-soft text-xs font-semibold text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark">
              {initials}
            </span>
            <span className={cn("min-w-0 flex-1", compact && "md:sr-only lg:not-sr-only")}>
              <span className="block truncate text-[13px] font-semibold text-idn-ink">{displayName}</span>
              <span className="block truncate text-xs text-idn-muted">Développeur</span>
            </span>
            <Icon
              name="chevronUp"
              size={16}
              className={cn("shrink-0 text-idn-muted", compact && "md:hidden lg:block")}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-56 rounded-[10px] border-idn-border bg-idn-surface shadow-none"
        >
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-[13px] font-semibold text-idn-ink">{displayName}</span>
            {email ? <span className="block truncate text-xs text-idn-muted">{email}</span> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer">
              <Icon name="settings" size={16} /> Paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void signOut()} className="cursor-pointer">
            <Icon name="logout" size={16} /> Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Shell du portail : barre latérale 248 px (≥ 1024 px), rail d'icônes
 * (768–1023 px), tiroir sous 768 px.
 */
export function Shell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  return (
    <div className="min-h-svh bg-idn-bg md:flex">
      {/* Barre mobile */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-idn-border bg-idn-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={drawerOpen}
          aria-controls="mobile-nav"
          className="grid size-9 place-items-center rounded-[10px] border border-idn-border text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
        >
          <Icon name="menu" size={18} />
        </button>
        <IdnMark size={24} />
        <span className="whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
          Développeurs
        </span>
      </div>

      {/* Tiroir mobile */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Fermer la navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col border-r border-idn-border bg-idn-surface"
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                autoFocus
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer la navigation"
                className="grid size-9 place-items-center rounded-[10px] text-idn-muted hover:bg-idn-surface-2 focus-visible:outline-2 focus-visible:outline-idn-green"
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <Brand />
            <NavList onNavigate={() => setDrawerOpen(false)} />
            <UserCard />
          </aside>
        </div>
      ) : null}

      {/* Rail / barre latérale */}
      <aside className="sticky top-0 hidden h-svh shrink-0 flex-col border-r border-idn-border bg-idn-surface md:flex md:w-16 lg:w-[248px]">
        <Brand compact />
        <NavList compact />
        <UserCard compact />
      </aside>

      <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>
    </div>
  )
}
