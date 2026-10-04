import type { Tone } from "../_components/status-pill"

export type AppStatus = "production" | "pending" | "sandbox" | "disabled"

/** Statut affiché d'une application : la suspension prime sur tout le reste. */
export function appStatus(
  status: AppStatus,
  suspended: boolean,
): { key: AppStatus | "suspended"; label: string; tone: Tone } {
  if (suspended) return { key: "suspended", label: "Suspendue", tone: "red" }
  switch (status) {
    case "production":
      return { key: status, label: "En production", tone: "green" }
    case "pending":
      return { key: status, label: "Revue demandée", tone: "yellow" }
    case "sandbox":
      return { key: status, label: "Sandbox", tone: "blue" }
    default:
      return { key: status, label: "Désactivée", tone: "neutral" }
  }
}

export function scopeList(scopes: string): string[] {
  return scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
