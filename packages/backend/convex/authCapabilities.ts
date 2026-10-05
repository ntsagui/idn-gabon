import { v } from "convex/values"

import { components } from "./_generated/api"
import { query, type QueryCtx } from "./_generated/server"

/** Vrai si le composant Better Auth sait lire le modèle `model`. */
export async function componentHasModel(ctx: QueryCtx, model: string): Promise<boolean> {
  try {
    await ctx.runQuery(components.betterAuth.adapter.findMany, {
      // Un modèle absent du composant est refusé par son validateur : c'est
      // précisément ce que l'on teste. Pas de filtre sur `_id` : un faux
      // identifiant fait échouer `db.get` en production, quel que soit le
      // modèle, et la sonde répondrait toujours `false`.
      model: model as never,
      paginationOpts: { numItems: 1, cursor: null },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Capacités d'authentification réellement disponibles sur ce déploiement.
 *
 * Clés d'accès (passkeys) : le plugin est déclaré dans `auth.ts` et la table
 * `passkey` est portée par le composant local (`betterAuth/schema.ts`). Sans
 * elle, les routes `/passkey/*` répondraient 500 : les clients interrogent
 * cette requête avant de les appeler, pour afficher « indisponible » plutôt
 * que de provoquer une erreur.
 */
export const get = query({
  args: {},
  returns: v.object({ passkeys: v.boolean() }),
  handler: async (ctx) => ({ passkeys: await componentHasModel(ctx, "passkey") }),
})
