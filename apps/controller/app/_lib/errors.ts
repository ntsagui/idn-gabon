import { ConvexError } from "convex/values"

/** Message lisible d'une erreur Convex (ConvexError porte `{ code, message }`). */
export function describeError(error: unknown, fallback: string): string {
  if (error instanceof ConvexError) {
    const data = error.data as { message?: string } | string | undefined
    if (typeof data === "string") return data
    if (data?.message) return data.message
  }
  return fallback
}
