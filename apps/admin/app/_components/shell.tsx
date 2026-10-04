"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type ReactNode } from "react"
import { useQuery } from "convex/react"
import {
  AppWindow,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Users,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@repo/ui/components/sheet"
import { cn } from "@repo/ui/lib/utils"

import { authClient } from "@/lib/auth-client"

import { fmtNumber, initials } from "../_lib/format"

type NavItem = {
  href: string
  label: string
  icon: LucideIcon
  count?: number
  countLabel?: string
}

type NavGroup = { title: string; items: NavItem[] }

/** Barre latérale complète (≥ 1024px) ou réduite aux icônes (768–1023px). */
type Mode = "responsive" | "full"

function useNav(): NavGroup[] {
  const totalAccounts = useQuery(api.admin.directory.countAccounts, {})?.total
  const apps = useQuery(api.admin.oauthApps.listApps, { limit: 500 })
  const activeApps = apps?.filter((a) => !a.disabled).length

  return [
    {
      title: "Pilotage",
      items: [
        { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      ],
    },
    {
      title: "Registre",
      items: [
        {
          href: "/users",
          label: "Comptes IDN",
          icon: Users,
          count: totalAccounts,
          countLabel: "comptes",
        },
        {
          href: "/apps",
          label: "Applications OAuth",
          icon: AppWindow,
          count: activeApps,
          countLabel: "applications actives",
        },
      ],
    },
    {
      title: "Sécurité",
      items: [
        { href: "/roles", label: "Rôles et habilitations", icon: ShieldCheck },
        { href: "/logs", label: "Journal d'audit", icon: ScrollText },
      ],
    },
    {
      title: "Configuration",
      items: [
        { href: "/providers", label: "Fournisseurs e-mail et SMS", icon: Send },
        { href: "/settings", label: "Paramètres", icon: Settings },
      ],
    },
  ]
}

function NavLinks({
  groups,
  mode,
  onNavigate,
}: {
  groups: NavGroup[]
  mode: Mode
  onNavigate?: () => void
}) {
  const pathname = usePathname() ?? ""
  const compact = mode === "responsive"
  return (
    <nav
      aria-label="Navigation de l'administration"
      className="flex-1 overflow-y-auto px-3 py-4"
    >
      {groups.map((group) => (
        <div key={group.title} className="mb-4 last:mb-0">
          <p
            className={cn(
              "adm-kicker mb-1 px-2",
              compact && "sr-only lg:not-sr-only",
            )}
          >
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    title={compact ? item.label : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-idn-green",
                      compact && "justify-center lg:justify-start",
                      active
                        ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                        : "text-idn-ink-2 hover:bg-idn-surface-2 hover:text-idn-ink",
                    )}
                  >
                    <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
                    <span className={cn("min-w-0 flex-1", compact && "sr-only lg:not-sr-only")}>
                      {item.label}
                    </span>
                    {item.count !== undefined ? (
                      <span
                        className={cn(
                          "rounded-full bg-idn-surface-2 px-1.5 font-mono text-[11px] leading-5 text-idn-muted",
                          active && "bg-idn-surface dark:bg-idn-surface-2",
                          compact && "hidden lg:inline",
                        )}
                      >
                        <span aria-hidden>{fmtNumber(item.count)}</span>
                        <span className="sr-only">
                          , {fmtNumber(item.count)} {item.countLabel}
                        </span>
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

function Brand({ mode }: { mode: Mode }) {
  const compact = mode === "responsive"
  return (
    <div className={cn("border-b border-idn-border-soft px-4 pb-4 pt-5", compact && "px-3 lg:px-4")}>
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
          compact && "justify-center lg:justify-start",
        )}
      >
        <IdnMark size={28} aria-hidden />
        <span className={cn("min-w-0", compact && "sr-only lg:not-sr-only")}>
          <span className="block text-[13px] font-semibold leading-4 text-idn-ink">
            Identité Numérique
          </span>
          <span className="adm-kicker block whitespace-nowrap">Administration</span>
        </span>
      </Link>
      <IdnFlagBars
        width="100%"
        height={3}
        className={cn("mt-4", compact && "hidden lg:flex")}
      />
    </div>
  )
}

function UserCard({ mode }: { mode: Mode }) {
  const me = useQuery(api.profile.getCurrentUser) as
    | {
        email: string
        roles?: string[]
        profile: { pivot?: { firstName: string; lastName: string } } | null
      }
    | null
    | undefined
  const compact = mode === "responsive"
  const pivot = me?.profile?.pivot
  const name = pivot
    ? `${pivot.firstName} ${pivot.lastName}`.trim()
    : (me?.email ?? "")
  const signOut = async () => {
    try {
      await authClient.signOut()
    } finally {
      window.location.href = "/sign-in"
    }
  }

  return (
    <div className="border-t border-idn-border-soft p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Compte de ${name || "l'administrateur"} : paramètres et déconnexion`}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md p-2 text-left outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-idn-green",
              compact && "justify-center lg:justify-start",
            )}
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-idn-green-soft text-xs font-semibold text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
            >
              {name ? initials(name) : ""}
            </span>
            <span className={cn("min-w-0 flex-1", compact && "hidden lg:block")}>
              <span className="block truncate text-[13px] font-medium text-idn-ink">
                {name}
              </span>
              <span className="block text-xs text-idn-muted">Administrateur</span>
            </span>
            <ChevronsUpDown
              aria-hidden
              className={cn("size-4 text-idn-muted", compact && "hidden lg:block")}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-60 shadow-none">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-idn-ink">{name}</span>
            {me?.email ? (
              <span className="text-xs font-normal text-idn-muted">{me.email}</span>
            ) : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings aria-hidden />
              Paramètres
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => void signOut()}>
            <LogOut aria-hidden />
            Se déconnecter
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function SidebarContent({ mode, onNavigate }: { mode: Mode; onNavigate?: () => void }) {
  const groups = useNav()
  return (
    <>
      <Brand mode={mode} />
      <NavLinks groups={groups} mode={mode} onNavigate={onNavigate} />
      <UserCard mode={mode} />
    </>
  )
}

/**
 * Coquille de la console : barre latérale 248px (icônes seules entre 768 et
 * 1023px, tiroir sous 768px), contenu principal à droite.
 */
export function Shell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false)

  return (
    <div className="flex min-h-svh bg-idn-bg">
      <aside className="sticky top-0 hidden h-svh shrink-0 flex-col border-r border-idn-border bg-idn-surface md:flex md:w-16 lg:w-[248px]">
        <SidebarContent mode="responsive" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-idn-border bg-idn-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Ouvrir la navigation"
            aria-expanded={drawer}
            className="inline-flex size-10 items-center justify-center rounded-md text-idn-ink outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-idn-green"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <IdnMark size={24} aria-hidden />
          <span className="adm-kicker whitespace-nowrap">Administration</span>
        </div>
        <Sheet open={drawer} onOpenChange={setDrawer}>
          <SheetContent side="left" className="w-[248px] gap-0 p-0 shadow-none">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Rubriques de la console d&apos;administration
            </SheetDescription>
            <div className="flex h-full flex-col">
              <SidebarContent mode="full" onNavigate={() => setDrawer(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
