import { ConvexError, v } from "convex/values"

import { components } from "../_generated/api"
import { internalMutation } from "../functions"
import { isProductionDeployment } from "../lib/deployment"

/**
 * Outil de recette (déploiement de dev) — rend rejouable de bout en bout le
 * parcours Niveau 3 d'un compte de test : un entretien accordé ne peut pas se
 * refaire, puisque le compte est alors au Niveau 3 et la demande approuvée.
 *
 * Remet le compte `email` au Niveau 2 et classe sa demande Niveau 3 approuvée
 * en « cancelled » : le citoyen retrouve la présentation du Niveau 3 et peut
 * réserver un nouveau créneau. L'historique (revues, journal d'audit) est
 * conservé tel quel. Passe par le `internalMutation` à déclencheurs pour que
 * l'agrégat `usersByLoa` reste juste.
 *
 * Interne : appelable uniquement avec la clé d'administration
 *   bunx convex run _dev/level3Retest:reopen '{"email":"x@idn.ga"}'
 * Refuse la production.
 */
export const reopen = internalMutation({
  args: { email: v.string() },
  returns: v.object({ reopened: v.number() }),
  handler: async (ctx, args) => {
    if (isProductionDeployment()) {
      throw new ConvexError({
        code: "FORBIDDEN_IN_PRODUCTION",
        message: "Outil de recette interdit en production.",
      })
    }
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: args.email.trim().toLowerCase(), operator: "eq" }],
    })) as { _id: string } | null
    const profile = user
      ? await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique()
      : null
    if (!user || !profile || profile.deletedAt !== undefined) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Compte introuvable." })
    }
    const now = Date.now()
    const approved = await ctx.db
      .query("level3Verification")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "approved"))
      .collect()
    for (const verification of approved) {
      await ctx.db.patch(verification._id, { status: "cancelled", updatedAt: now })
    }
    if (profile.loa === 3) await ctx.db.patch(profile._id, { loa: 2, updatedAt: now })
    return { reopened: approved.length }
  },
})
