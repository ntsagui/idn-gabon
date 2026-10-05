import { ConvexError, v } from "convex/values"

import { components } from "../_generated/api"
import { internalMutation } from "../_generated/server"
import { isProductionDeployment } from "../lib/deployment"
import { hashOpaqueSecret } from "../lib/pin"

/**
 * Outil de recette (déploiement de dev) — rend testable de bout en bout la
 * récupération du PIN par SMS (`pinRecovery.requestReset` → `verifyCode` →
 * `resetPin`).
 *
 * Le code SMS est généré et conservé par Bird : personne, pas même le
 * backend, ne peut le lire. Pour un compte de test (souvent sans téléphone,
 * donc sans envoi réel), cet outil arme la demande `requestId` renvoyée à
 * l'écran avec un code choisi ici et le rattache au compte `email`.
 * `verifyCode` compare alors localement ce code au lieu d'interroger Bird.
 *
 * Interne : appelable uniquement avec la clé d'administration
 *   bunx convex run _dev/pinRecoveryTestCode:arm '{"requestId":"…","email":"x@idn.ga"}'
 * Refuse la production, et `verifyCode` y ignore de toute façon le code armé.
 */
export const arm = internalMutation({
  args: { requestId: v.string(), email: v.string() },
  returns: v.object({ code: v.string() }),
  handler: async (ctx, args) => {
    if (isProductionDeployment()) {
      throw new ConvexError({
        code: "FORBIDDEN_IN_PRODUCTION",
        message: "Outil de recette interdit en production.",
      })
    }

    const challenge = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    if (
      !challenge ||
      (challenge.status !== "pending" && challenge.status !== "sent") ||
      challenge.expiresAt <= Date.now()
    ) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Demande de récupération introuvable ou expirée.",
      })
    }

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [
        { field: "email", value: args.email.trim().toLowerCase(), operator: "eq" },
      ],
    })) as { _id: string } | null
    const profile = user
      ? await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique()
      : null
    if (!user || !profile || profile.deletedAt !== undefined) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Compte introuvable.",
      })
    }
    // Une demande déjà rattachée à un autre compte n'est pas détournable.
    if (challenge.userId && challenge.userId !== user._id) {
      throw new ConvexError({
        code: "MISMATCH",
        message: "Cette demande appartient à un autre compte.",
      })
    }

    const bytes = new Uint32Array(1)
    crypto.getRandomValues(bytes)
    const code = String(bytes[0]! % 1_000_000).padStart(6, "0")
    await ctx.db.patch(challenge._id, {
      userId: user._id,
      // `takeVerificationAttempt` exige un numéro ; il ne sert pas ici.
      phone: challenge.phone ?? "recette",
      status: "sent",
      testCodeHash: await hashOpaqueSecret(code),
      updatedAt: Date.now(),
    })
    return { code }
  },
})
