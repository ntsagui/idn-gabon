"use client"

import { useRouter } from "next/navigation"
import { useConvexAuth, useQuery } from "convex/react"
import { useEffect } from "react"

import { api } from "@repo/backend/convex/_generated/api"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { Shell } from "../_components/shell"

/**
 * Garde d'accès de la console : session Convex prête ET rôle administrateur.
 * Aucune query de la console ne part avant que le jeton soit disponible —
 * elles sont toutes rendues sous ce garde.
 */
export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const router = useRouter()

  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : "skip")
  const isAdmin = Boolean(me?.roles?.includes("admin"))

  useEffect(() => {
    if (isAuthLoading) return
    if (!isAuthenticated) {
      router.replace("/sign-in")
      return
    }
    if (me === undefined) return
    if (!isAdmin) router.replace("/sign-in?error=forbidden")
  }, [isAuthLoading, isAuthenticated, me, isAdmin, router])

  if (isAuthLoading || !isAuthenticated || me === undefined || !isAdmin) {
    return (
      <div
        role="status"
        className="flex min-h-svh flex-col items-center justify-center gap-3 bg-idn-bg"
      >
        <IdnMark size={32} aria-hidden />
        <p className="adm-kicker">Vérification de l&apos;accès…</p>
      </div>
    )
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-idn-green focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Aller au contenu principal
      </a>
      <Shell>{children}</Shell>
    </>
  )
}
