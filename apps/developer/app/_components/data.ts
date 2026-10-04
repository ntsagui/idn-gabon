"use client"

import { useConvexAuth, useQuery } from "convex/react"
import { useMemo } from "react"

import { api } from "@repo/backend/convex/_generated/api"

import { groupApplications, type ApplicationGroup } from "./application-groups"

/**
 * Lectures partagées du portail. Convex déduplique les abonnements
 * identiques : le shell et la page lisent la même source, donc les compteurs
 * de la navigation et des listes restent cohérents.
 */
export function useApplications(): {
  apps: ReturnType<typeof useQuery<typeof api.developer.apps.listMine>>
  groups: ApplicationGroup[] | undefined
} {
  const { isAuthenticated } = useConvexAuth()
  const apps = useQuery(api.developer.apps.listMine, isAuthenticated ? {} : "skip")
  const groups = useMemo(() => (apps ? groupApplications(apps) : undefined), [apps])
  return { apps, groups }
}

export function useApiKeys(appClientId?: string) {
  const { isAuthenticated } = useConvexAuth()
  return useQuery(
    api.developer.apiKeys.listKeys,
    isAuthenticated ? (appClientId ? { appClientId } : {}) : "skip",
  )
}

export function useScopeCatalog() {
  return useQuery(api.developer.catalog.scopes, {})
}
