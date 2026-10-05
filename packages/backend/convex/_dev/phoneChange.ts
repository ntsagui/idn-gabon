import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import { internalMutation } from "../_generated/server"
import { isProductionDeployment } from "../lib/deployment"

/**
 * Changement de téléphone sans SMS — DÉVELOPPEMENT UNIQUEMENT.
 *
 * Le code du changement de numéro est détenu par Bird Verify (le backend ne
 * le connaît jamais) et `BIRD_API_KEY` est réelle sur le dev : on ne peut ni
 * lire le code ni l'envoyer à un numéro fictif sans écrire à un inconnu.
 * Cette fonction rejoue le parcours serveur réel (`prepareChange` →
 * `markSent` → `confirmChange` : validation du numéro, unicité, limites,
 * audit) en sautant uniquement l'aller-retour Bird, pour vérifier côté
 * écrans (Profil, Journal) l'effet d'un changement confirmé.
 *
 *   bunx convex run _dev/phoneChange:simulateVerifiedChange '{"userId":"…","phone":"+241 06 00 00 00"}'
 *
 * Refuse la production.
 */

export const simulateVerifiedChange = internalMutation({
  args: { userId: v.string(), phone: v.string() },
  returns: v.object({ phone: v.string(), maskedPhone: v.string() }),
  handler: async (ctx, args): Promise<{ phone: string; maskedPhone: string }> => {
    if (isProductionDeployment()) {
      throw new ConvexError({
        code: "FORBIDDEN_IN_PRODUCTION",
        message: "Changement de téléphone sans SMS interdit en production.",
      })
    }
    const requestId = crypto.randomUUID()
    const prepared: { phone: string; maskedPhone: string } = await ctx.runMutation(internal.phoneChange.prepareChange, {
      userId: args.userId,
      rawPhone: args.phone,
      requestId,
      expiresAt: Date.now() + 10 * 60 * 1000,
    })
    await ctx.runMutation(internal.phoneChange.markSent, {
      userId: args.userId,
      requestId,
    })
    const confirmed: boolean = await ctx.runMutation(internal.phoneChange.confirmChange, {
      userId: args.userId,
      requestId,
    })
    if (!confirmed) {
      throw new ConvexError({
        code: "PHONE_CHANGE_NOT_CONFIRMED",
        message: "Le changement n'a pas pu être confirmé.",
      })
    }
    return { phone: prepared.phone, maskedPhone: prepared.maskedPhone }
  },
})
