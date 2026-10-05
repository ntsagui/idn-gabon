"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@repo/ui/lib/utils"

import { IBoiteHome } from "./_components/iboite-home"
import { IBoiteProvider, useIBoite } from "./_components/iboite-context"

const READER = /^\/iboite\/(email|courrier)\/([^/]+)$/

/**
 * iBoîte : l’état (boîte active, onglet, dossiers) est partagé par tous les
 * écrans. Téléphone : enchaînement d’écrans du mobile (liste, puis lecture).
 * Grand écran (≥ lg) : liste à gauche, lecture à droite, sur la même URL que
 * l’écran de lecture (`/iboite/email/[id]`, `/iboite/courrier/[id]`).
 */
export default function IBoiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <IBoiteProvider>
      <Split>{children}</Split>
    </IBoiteProvider>
  )
}

function Split({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { tab, setTab } = useIBoite()
  const root = pathname === "/iboite"
  const match = pathname.match(READER)
  const reader = match !== null && match[2] !== "compose"
  const readerKind = reader ? match?.[1] : null

  // Anciennes URL (liens des notifications push, favoris) :
  // /iboite?section=emails&id=… → /iboite/email/…, ?compose=1 → rédaction.
  React.useEffect(() => {
    if (!root) return
    const q = new URLSearchParams(window.location.search)
    if (!window.location.search) return
    const section = q.get("section")
    const id = q.get("id")
    if (id) router.replace(section === "courriers" ? `/iboite/courrier/${id}` : `/iboite/email/${id}`)
    else if (q.get("compose") === "1") router.replace(section === "courriers" ? "/iboite/courrier/compose" : "/iboite/compose")
    else if (section === "courriers" || section === "colis") {
      setTab(section)
      router.replace("/iboite")
    }
  }, [root, router, setTab])

  // La liste suit l’élément ouvert (lien direct vers un courrier → onglet Courriers).
  React.useEffect(() => {
    if (readerKind === "email" && tab !== "emails") setTab("emails")
    if (readerKind === "courrier" && tab !== "courriers") setTab("courriers")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerKind, pathname])

  if (!root && !reader) return <>{children}</>
  const listOnly = root && tab === "colis"
  return (
    <div className="flex min-w-0 flex-1 lg:h-svh lg:max-h-svh lg:min-h-0 lg:overflow-hidden">
      <div
        className={cn(
          "min-w-0 flex-1 flex-col lg:flex lg:overflow-y-auto",
          root ? "flex" : "hidden",
          listOnly ? "" : "lg:w-[400px] lg:flex-none lg:border-r lg:border-idn-border xl:w-[440px]"
        )}
      >
        <IBoiteHome />
      </div>
      <div className={cn("min-w-0 flex-1 flex-col lg:overflow-y-auto", root ? "hidden lg:flex" : "flex", listOnly && "lg:hidden")}>
        {children}
      </div>
    </div>
  )
}
