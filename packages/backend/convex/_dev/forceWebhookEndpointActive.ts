import { ConvexError, v } from "convex/values"

import { internalMutation } from "../_generated/server"

/**
 * Outil de test (déploiement de dev) — marque un endpoint webhook comme
 * vérifié, pour tester l'événement de test du portail vers un récepteur
 * public qui ne sait pas renvoyer le challenge (ex. httpbin.org/post).
 * Interne : appelable uniquement avec la clé d'administration
 * (`bunx convex run _dev/forceWebhookEndpointActive:run '{"endpointId":"…"}'`).
 * Refuse la production : contourner la vérification d'un endpoint y est interdit.
 */

const PRODUCTION_DEPLOYMENT = "flexible-panda-248"

export const run = internalMutation({
  args: { endpointId: v.id("webhookEndpoints") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if ((process.env.CONVEX_CLOUD_URL ?? "").includes(PRODUCTION_DEPLOYMENT)) {
      throw new ConvexError({
        code: "FORBIDDEN_IN_PRODUCTION",
        message: "Outil de recette interdit en production.",
      })
    }
    const row = await ctx.db.get(args.endpointId)
    if (!row || row.deletedAt !== undefined) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Endpoint introuvable." })
    }
    const now = Date.now()
    await ctx.db.patch(row._id, {
      status: "active",
      verifiedAt: now,
      challengeId: undefined,
      pausedReason: undefined,
      consecutiveFailures: 0,
      updatedAt: now,
    })
    return null
  },
})
