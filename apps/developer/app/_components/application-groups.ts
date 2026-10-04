import type { FunctionReturnType } from "convex/server"

import type { api } from "@repo/backend/convex/_generated/api"

export type DeveloperApplication = FunctionReturnType<
  typeof api.developer.apps.listMine
>[number]

/**
 * Une application du portail = un enregistrement sandbox et, après demande
 * de mise en production, son jumeau production (deux client_id distincts).
 */
export type ApplicationGroup = {
  id: string
  name: string
  sandbox: DeveloperApplication | null
  production: DeveloperApplication | null
}

/** Regroupe les deux enregistrements OAuth d'une même application. */
export function groupApplications(
  applications: readonly DeveloperApplication[],
): ApplicationGroup[] {
  const groups = new Map<string, ApplicationGroup>()

  for (const application of applications) {
    const groupId =
      application.env === "sandbox"
        ? application.clientId
        : (application.linkedClientId ?? application.clientId)
    const existing = groups.get(groupId) ?? {
      id: groupId,
      name: application.name,
      sandbox: null,
      production: null,
    }

    if (application.env === "sandbox") {
      existing.sandbox = application
      existing.name = application.name
    } else {
      existing.production = application
    }
    groups.set(groupId, existing)
  }

  return [...groups.values()].sort(
    (a, b) => primaryOf(b).createdAt - primaryOf(a).createdAt,
  )
}

/** Enregistrement de référence : la production si elle est active, sinon la sandbox. */
export function primaryOf(group: ApplicationGroup): DeveloperApplication {
  if (group.production && !group.production.disabled) return group.production
  return (group.sandbox ?? group.production)!
}

/** Statut affiché d'une application, aligné sur les pastilles de la charte. */
export function applicationStatus(group: ApplicationGroup): {
  label: string
  tone: "info" | "attention" | "success" | "danger" | "neutral"
} {
  const production = group.production
  if (production && !production.disabled) return { label: "En production", tone: "success" }
  const status = group.sandbox?.productionStatus ?? "none"
  if (status === "pending") return { label: "Production en revue", tone: "info" }
  if (status === "rejected") return { label: "Production refusée", tone: "danger" }
  if (group.sandbox?.disabled) return { label: "Désactivée", tone: "neutral" }
  return { label: "Sandbox active", tone: "neutral" }
}
