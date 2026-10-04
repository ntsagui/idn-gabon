"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"

import { IdnMark } from "@repo/ui/components/idn-mark"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@repo/ui/components/sheet"

import { shell } from "../../_content/fr"
import { Sidebar, type SidebarUser } from "./sidebar"

/**
 * Coque de l'espace contrôleur : barre latérale 248px (rail d'icônes entre
 * 768 et 1024px, tiroir en dessous) et zone de travail.
 */
export function AppShell({ user, children }: { user: SidebarUser; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const pathname = usePathname()
  // Le tiroir se referme à chaque changement de page.
  const [lastPath, setLastPath] = React.useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setDrawerOpen(false)
  }

  return (
    <div className="flex h-svh flex-col bg-idn-bg md:flex-row">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-idn-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-idn-ink focus:ring-2 focus:ring-ring"
      >
        Aller au contenu
      </a>
      <aside className="hidden shrink-0 border-r border-idn-border md:block md:w-[72px] lg:w-[248px]">
        <Sidebar user={user} variant="rail" />
      </aside>

      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-idn-border bg-idn-surface px-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Ouvrir la navigation"
          aria-expanded={drawerOpen}
          className="flex size-10 items-center justify-center rounded-lg text-idn-ink-2 hover:bg-idn-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MenuIcon aria-hidden className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <IdnMark size={24} />
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            {shell.portal}
          </span>
        </Link>
      </div>
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[280px] gap-0 p-0 sm:max-w-[280px]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Pages de l&apos;espace contrôleur</SheetDescription>
          <Sidebar user={user} variant="full" onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <main id="contenu" tabIndex={-1} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto focus:outline-none">
        {children}
      </main>
    </div>
  )
}

/** Cadre affiché pendant la vérification de session : même géométrie, aucun contenu. */
export function ShellSkeleton() {
  return (
    <div className="flex h-svh bg-idn-bg" aria-busy="true" aria-label="Chargement de l'espace contrôleur">
      <div className="hidden shrink-0 border-r border-idn-border bg-idn-surface md:block md:w-[72px] lg:w-[248px]">
        <div className="flex items-center gap-2.5 px-4 pt-4 max-lg:justify-center max-lg:px-0">
          <IdnMark size={28} />
        </div>
      </div>
      <div className="flex-1" />
    </div>
  )
}
