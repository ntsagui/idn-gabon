"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { cleanError } from "@/app/_components/idn/dialog"

/** Vrai si l’écran courant est celui par lequel le document a été chargé (lien direct, favori, rechargement). */
function isLandingPage(): boolean {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
  if (!nav) return window.history.length <= 1
  const landing = new URL(nav.name)
  return landing.pathname + landing.search === window.location.pathname + window.location.search
}

/**
 * Retour à l’écran précédent (`router.back()` du mobile). Arrivé directement
 * sur l’URL (lien, favori), l’entrée précédente de l’historique n’est pas un
 * écran de l’app : on rejoint alors l’écran parent.
 */
export function useGoBack(fallback: string) {
  const router = useRouter()
  return React.useCallback(() => {
    if (isLandingPage()) router.replace(fallback)
    else router.back()
  }, [router, fallback])
}

/** Message lisible d’une erreur Convex (`ConvexError.data.message`) ou JS. */
export function errorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { message?: string } | string } | null)?.data
  if (data && typeof data === "object" && data.message) return data.message
  if (typeof data === "string" && data) return data
  if (err instanceof Error && err.message) return cleanError(err.message)
  return fallback
}
