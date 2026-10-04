import { v } from "convex/values"

import { components } from "../_generated/api"
import { internalQuery } from "../_generated/server"
import { internalMutation } from "../functions"
import { normalizeRecoveryPhone } from "../lib/phone"
import { isPhoneRegistryReady } from "../lib/phoneRegistry"
import { assessAutomaticSmsRecovery } from "../lib/pinRecoveryEligibility"

/** Migration idempotente des numéros historiques, par pages de 200 profils. */
export const run = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({
    scanned: v.number(),
    patched: v.number(),
    done: v.boolean(),
    nextCursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query("userProfile").paginate({
      cursor: args.cursor ?? null,
      numItems: 200,
    })
    let patched = 0
    for (const profile of page.page) {
      const phoneKey =
        profile.deletedAt !== undefined
          ? undefined
          : normalizeRecoveryPhone(
              profile.pivot?.phone,
              profile.pivot?.nationality,
            )
      if (profile.phoneKey === phoneKey) continue
      await ctx.db.patch(profile._id, { phoneKey })
      patched++
    }
    return {
      scanned: page.page.length,
      patched,
      done: page.isDone,
      nextCursor: page.isDone ? null : page.continueCursor,
    }
  },
})

/** Contrôle en lecture seule de la migration et d'un compte de récupération. */
export const inspect = internalQuery({
  args: { userId: v.optional(v.string()) },
  returns: v.object({
    ready: v.boolean(),
    eligible: v.union(v.boolean(), v.null()),
    blockers: v.array(v.string()),
    phoneMasked: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const ready = await isPhoneRegistryReady(ctx)
    const userId = args.userId
    if (!userId) {
      return { ready, eligible: null, blockers: [], phoneMasked: null }
    }
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique()
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: userId, operator: "eq" }],
    })) as { emailVerified?: boolean } | null
    if (!profile || !user) {
      return {
        ready,
        eligible: false,
        blockers: ["account_not_found"],
        phoneMasked: null,
      }
    }
    const recovery = await assessAutomaticSmsRecovery(
      ctx,
      profile,
      user.emailVerified === true,
    )
    return {
      ready,
      eligible: recovery.eligible,
      blockers: recovery.blockers,
      phoneMasked: recovery.phone
        ? `${recovery.phone.slice(0, 4)}…${recovery.phone.slice(-2)}`
        : null,
    }
  },
})
