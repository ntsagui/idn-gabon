import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter"
import { ConvexError, v } from "convex/values"

import { components } from "../_generated/api"
import { internalMutation } from "../_generated/server"

/**
 * Événement de test des webhooks — partie transactionnelle.
 *
 * L'envoi HTTP vit dans `webhookTest.ts` (runtime Node, pour réutiliser
 * `postPinned` et sa protection SSRF). Ici : l'autorisation complète et le
 * quota, dans une mutation, afin qu'un envoi refusé ne consomme rien et qu'un
 * envoi autorisé soit toujours décompté.
 *
 * L'événement de test n'entre pas dans `webhookEvents` / `webhookDeliveries` :
 * il ne porte aucune donnée d'usager, n'est jamais rejoué et ne doit pas
 * gonfler les statistiques de livraison affichées dans « Usage ».
 */

const limiter = new RateLimiter(components.rateLimiter, {
  developerWebhookTest: {
    kind: "token bucket",
    rate: 10,
    period: MINUTE,
    capacity: 10,
  },
})

type OAuthAppDoc = {
  userId?: string | null
  disabled?: boolean | null
  metadata?: string | null
}

export const authorizeTestDelivery = internalMutation({
  args: { endpointId: v.id("webhookEndpoints"), userId: v.string() },
  returns: v.object({
    clientId: v.string(),
    url: v.string(),
    secretCiphertext: v.string(),
    secretIv: v.string(),
    previousSecretCiphertext: v.optional(v.string()),
    previousSecretIv: v.optional(v.string()),
    previousSecretValidUntil: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const role = await ctx.db
      .query("userRole")
      .withIndex("by_userId_role", (q) =>
        q.eq("userId", args.userId).eq("role", "developer"),
      )
      .unique()
    if (!role || role.revokedAt) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Accès réservé aux développeurs.",
      })
    }
    const endpoint = await ctx.db.get(args.endpointId)
    if (!endpoint || endpoint.deletedAt !== undefined) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Endpoint introuvable.",
      })
    }
    if (endpoint.developerUserId !== args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Endpoint non autorisé.",
      })
    }
    if (endpoint.status !== "active") {
      throw new ConvexError({
        code: "ENDPOINT_INACTIVE",
        message:
          endpoint.status === "pending"
            ? "Vérifiez d'abord l'endpoint (challenge) avant d'envoyer un événement de test."
            : "Réactivez l'endpoint avant d'envoyer un événement de test.",
      })
    }
    const apps = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "oauthApplication",
      where: [
        { field: "clientId", value: endpoint.appClientId, operator: "eq" },
      ],
      paginationOpts: { numItems: 1, cursor: null },
    })) as { page: OAuthAppDoc[] }
    const app = apps.page[0]
    if (!app || app.userId !== args.userId || app.disabled) {
      throw new ConvexError({
        code: "APP_INACTIVE",
        message: "L'application de cet endpoint n'est pas active.",
      })
    }
    const status = await limiter.limit(ctx, "developerWebhookTest", {
      key: endpoint._id,
    })
    if (!status.ok) {
      throw new ConvexError({
        code: "RATE_LIMITED",
        message: `Trop d'envois de test. Réessayez dans ${Math.ceil(status.retryAfter / 1000)} s.`,
      })
    }
    return {
      clientId: endpoint.appClientId,
      url: endpoint.url,
      secretCiphertext: endpoint.secretCiphertext,
      secretIv: endpoint.secretIv,
      previousSecretCiphertext: endpoint.previousSecretCiphertext,
      previousSecretIv: endpoint.previousSecretIv,
      previousSecretValidUntil: endpoint.previousSecretValidUntil,
    }
  },
})
