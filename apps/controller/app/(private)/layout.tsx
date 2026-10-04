"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useConvexAuth, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppShell, ShellSkeleton } from "../_components/shell/app-shell"
import { fullName } from "../_lib/format"

/**
 * Garde des pages de l'espace contrôleur.
 *
 * Même comportement que l'administration et le portail développeur : sans
 * session, retour à `/sign-in?redirect_to=<page>` ; sans le rôle
 * `identity_controller`, retour à `/sign-in` avec le motif. Pendant la
 * vérification, le cadre de la coque s'affiche sans aucun contenu : ni
 * écran blanc, ni page protégée entrevue. Aucune requête métier ne part
 * avant que le jeton Convex soit prêt (les pages ne sont pas montées).
 */
export default function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const router = useRouter()
  const pathname = usePathname() ?? "/"
  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : "skip")
  const isController = Boolean(me?.roles?.includes("identity_controller"))

  React.useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      const target = `${pathname}${window.location.search}`
      router.replace(target === "/" ? "/sign-in" : `/sign-in?redirect_to=${encodeURIComponent(target)}`)
      return
    }
    if (me === undefined) return
    if (!isController) router.replace("/sign-in?motif=role")
  }, [isLoading, isAuthenticated, me, isController, pathname, router])

  if (isLoading || !isAuthenticated || me === undefined || !me || !isController) {
    return <ShellSkeleton />
  }

  const name = fullName(me.profile?.pivot?.firstName, me.profile?.pivot?.lastName) || me.email.split("@")[0] || me.email
  return <AppShell user={{ name, email: me.email }}>{children}</AppShell>
}
