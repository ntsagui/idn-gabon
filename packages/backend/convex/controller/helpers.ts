import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

/**
 * Petits utilitaires partagés par les modules de l'espace contrôleur.
 * Fonctions TypeScript simples (aucune fonction Convex enregistrée ici).
 */

const DAY_MS = 24 * 60 * 60 * 1000
/** Libreville est à UTC+1 toute l'année (pas d'heure d'été). */
const LIBREVILLE_OFFSET_MS = 60 * 60 * 1000

/** Minuit, heure de Libreville, du jour contenant `now`. */
export function startOfLibrevilleDay(now: number): number {
  return Math.floor((now + LIBREVILLE_OFFSET_MS) / DAY_MS) * DAY_MS - LIBREVILLE_OFFSET_MS
}

/** Même dérivation que `controller/queue.ts` : « KYC-XXX-XXX ». */
export function kycRef(id: string): string {
  const trimmed = id.replace(/[^a-z0-9]/gi, "").toUpperCase()
  return `KYC-${trimmed.slice(-6, -3) || "000"}-${trimmed.slice(-3) || "000"}`
}

/** Même dérivation que `level3.ts` : « L3-XXX-XXX ». */
export function level3Ref(id: string): string {
  const trimmed = id.replace(/[^a-z0-9]/gi, "").toUpperCase()
  return `L3-${trimmed.slice(-6, -3) || "000"}-${trimmed.slice(-3) || "000"}`
}

export function profileName(profile: Doc<"userProfile"> | null | undefined): string {
  return [profile?.pivot?.firstName, profile?.pivot?.lastName].filter(Boolean).join(" ")
}

export async function profileOf(
  ctx: Pick<QueryCtx, "db">,
  userId: string,
): Promise<Doc<"userProfile"> | null> {
  return await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
}

/** Lecture de profils avec cache, pour les listes qui citent souvent les mêmes personnes. */
export function profileCache(ctx: Pick<QueryCtx, "db">) {
  const cache = new Map<string, Promise<Doc<"userProfile"> | null>>()
  return (userId: string) => {
    let hit = cache.get(userId)
    if (!hit) {
      hit = profileOf(ctx, userId)
      cache.set(userId, hit)
    }
    return hit
  }
}
