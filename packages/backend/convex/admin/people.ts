import { v } from "convex/values"

import { components } from "../_generated/api"
import type { QueryCtx } from "../_generated/server"

/**
 * Résolution « humaine » d'un identifiant de compte pour la console admin.
 *
 * Les journaux et les listes ne connaissent que des `userId` Better Auth. La
 * console ne doit jamais les afficher seuls quand un nom existe : on joint le
 * pivot KYC (nom civil, qui fait foi) et, à défaut, le nom Better Auth quand
 * il n'est pas une simple recopie de l'email.
 *
 * Aucune fonction Convex n'est enregistrée ici : c'est un module d'aide
 * partagé par les queries de `admin/`.
 */

export const PERSON = v.object({
  userId: v.string(),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  idnId: v.optional(v.string()),
  exists: v.boolean(),
})

export type Person = {
  userId: string
  name?: string
  email?: string
  idnId?: string
  exists: boolean
}

type AuthUser = { email?: string; name?: string } | null

/**
 * Crée un résolveur mémoïsé pour la durée d'une query : un même acteur
 * apparaît souvent des dizaines de fois dans un journal.
 */
export function personResolver(ctx: QueryCtx) {
  const cache = new Map<string, Promise<Person>>()

  async function load(userId: string): Promise<Person> {
    const [profile, user] = await Promise.all([
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique(),
      // Un acteur peut être un identifiant qui n'est pas un `_id` Better Auth
      // valide (tâche système, compte purgé) : l'adapter lève alors une
      // erreur de validation, que l'on traite comme « compte introuvable ».
      (
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "user",
          where: [{ field: "_id", value: userId }],
        }) as Promise<AuthUser>
      ).catch(() => null),
    ])
    const pivotName = profile?.pivot
      ? `${profile.pivot.firstName} ${profile.pivot.lastName}`.trim()
      : undefined
    const authName =
      user?.name && user.name !== user.email ? user.name : undefined
    return {
      userId,
      name: pivotName || authName,
      email: user?.email || undefined,
      idnId: profile?.idnId,
      exists: Boolean(profile || user),
    }
  }

  return (userId: string): Promise<Person> => {
    let hit = cache.get(userId)
    if (!hit) {
      hit = load(userId)
      cache.set(userId, hit)
    }
    return hit
  }
}
