"use client"

import { createContext, useContext } from "react"

import type { ApplicationGroup, DeveloperApplication } from "../../../../_components/application-groups"

export type AppWorkspace = {
  group: ApplicationGroup
  /** Enregistrement de l'environnement sélectionné. */
  app: DeveloperApplication
  env: "sandbox" | "production"
  setEnv: (env: "sandbox" | "production") => void
  icon: string | null
}

export const AppWorkspaceContext = createContext<AppWorkspace | null>(null)

export function useAppWorkspace(): AppWorkspace {
  const value = useContext(AppWorkspaceContext)
  if (!value) throw new Error("useAppWorkspace hors de AppWorkspaceContext")
  return value
}
