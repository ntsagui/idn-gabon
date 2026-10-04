import { v } from "convex/values"

import { components } from "../_generated/api"
import { query, type QueryCtx } from "../_generated/server"
import { requireAdmin } from "../lib/auth"
import { DUPLICATE_SIGNALS } from "../schema"

/**
 * File d'arbitrage des rapprochements de comptes.
 *
 * Cette file ne décide rien. Elle expose des paires « peut-être la même
 * personne » avec la source du rapprochement, et laisse l'administrateur
 * trancher — les actions destructrices restent celles d'`admin/accounts.ts`.
 *
 * Contrairement à `admin/duplicates.ts`, qui recalcule un inventaire par
 * balayage à chaque appel, on lit ici des faits écrits au moment de la
 * détection. C'est ce qui permet de couvrir des signaux qu'aucun balayage ne
 * saurait reconstruire après coup : une similarité biométrique ou une
 * réutilisation de pièce ne se relisent pas dans la table des profils.
 */

const SIGNAL = v.union(...DUPLICATE_SIGNALS.map((s) => v.literal(s)))

const FLAG_ACCOUNT = v.object({
  userId: v.string(),
  email: v.string(),
  idnId: v.optional(v.string()),
  loa: v.optional(v.number()),
  exists: v.boolean(),
})

async function describeAccount(ctx: QueryCtx, userId: string | undefined) {
  if (!userId) {
    return {
      userId: "",
      email: "",
      idnId: undefined,
      loa: undefined,
      exists: false,
    }
  }
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  // Un identifiant qui n'est pas un `_id` Better Auth valide (donnée de
  // démonstration, compte purgé) fait lever l'adapter : sans ce filet, une
  // seule ligne rendait toute la file d'arbitrage illisible.
  const user = (await ctx
    .runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: userId }],
    })
    .catch(() => null)) as { email?: string } | null
  return {
    userId,
    email: user?.email ?? "",
    idnId: profile?.idnId,
    loa: profile?.loa,
    exists: profile !== null,
  }
}

export const listOpenFlags = query({
  args: { limit: v.optional(v.number()) },
  returns: v.object({
    flags: v.array(
      v.object({
        _id: v.id("duplicateSignal"),
        signal: SIGNAL,
        score: v.optional(v.number()),
        detectedAt: v.number(),
        account: FLAG_ACCOUNT,
        matched: FLAG_ACCOUNT,
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(args.limit ?? 50, 200)

    // `by_status` est composé de `["status", "detectedAt"]` : les plus anciens
    // sortent d'abord — une file de revue se traite dans l'ordre d'arrivée.
    const rows = await ctx.db
      .query("duplicateSignal")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("asc")
      .take(limit)

    const flags = []
    for (const r of rows) {
      flags.push({
        _id: r._id,
        signal: r.signal,
        score: r.score,
        detectedAt: r.detectedAt,
        account: await describeAccount(ctx, r.userId),
        matched: await describeAccount(ctx, r.matchedUserId),
      })
    }
    return { flags }
  },
})

/** Badge de navigation. Borné : « 200+ » suffit à dire « il y a du travail ». */
export const openFlagCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const rows = await ctx.db
      .query("duplicateSignal")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(200)
    return rows.length
  },
})
