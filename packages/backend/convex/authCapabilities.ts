import { v } from "convex/values"

import { components } from "./_generated/api"
import { query, type QueryCtx } from "./_generated/server"

/** Vrai si le composant Better Auth sait lire le modèle `model`. */
export async function componentHasModel(ctx: QueryCtx, model: string): Promise<boolean> {
  try {
    await ctx.runQuery(components.betterAuth.adapter.findOne, {
      // Un modèle absent du composant est refusé par son validateur : c'est
      // précisément ce que l'on teste.
      model: model as never,
      where: [{ field: "_id", value: "__capability_probe__", operator: "eq" }],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Capacités d'authentification réellement disponibles sur ce déploiement.
 *
 * Clés d'accès (passkeys) : le plugin est déclaré dans `auth.ts`, mais le
 * composant Better Auth installé par défaut n'a pas de table `passkey` ; les
 * routes `/passkey/*` répondent alors 500. Les clients interrogent cette
 * requête avant d'appeler ces routes, pour afficher « indisponible » au lieu
 * de provoquer une erreur. Elle passe d'elle-même à `true` le jour où le
 * composant porte la table.
 */
export const get = query({
  args: {},
  returns: v.object({ passkeys: v.boolean() }),
  handler: async (ctx) => ({ passkeys: await componentHasModel(ctx, "passkey") }),
})
