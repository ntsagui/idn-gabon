import { v } from "convex/values"

import { query } from "../_generated/server"
import { getCurrentAuthUser } from "../lib/auth"
import { GRANTABLE_SCOPES } from "../lib/consentGrant"
import { VALID_M2M_SCOPES } from "./apiKeys"

/**
 * Référentiels exposés au portail développeur, pour que l'interface propose
 * exactement ce que le serveur accepte (et non une copie qui dériverait) :
 *
 *   • `oauthScopes` — scopes OAuth accordables (`lib/consentGrant`, aligné sur
 *     l'allowlist `oidcProvider({ scopes })` de auth.ts) ;
 *   • `m2mScopes` — scopes des clés API serveur (`developer/apiKeys`).
 *
 * Données publiques : la documentation les publie aussi.
 */
export const scopes = query({
  args: {},
  returns: v.object({
    oauthScopes: v.array(v.string()),
    m2mScopes: v.array(v.string()),
  }),
  handler: async () => ({
    oauthScopes: [...GRANTABLE_SCOPES],
    m2mScopes: [...VALID_M2M_SCOPES],
  }),
})

/**
 * Statut du compte développeur courant : le rôle, et sa validation par un
 * super-administrateur (condition d'une demande de mise en production, cf.
 * `developer/apps.requestProduction`).
 */
export const accountStatus = query({
  args: {},
  returns: v.object({
    hasDeveloperRole: v.boolean(),
    verified: v.boolean(),
    developerSince: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const user = await getCurrentAuthUser(ctx)
    if (!user) {
      return { hasDeveloperRole: false, verified: false, developerSince: null }
    }
    const role = await ctx.db
      .query("userRole")
      .withIndex("by_userId_role", (q) =>
        q.eq("userId", user.userId).eq("role", "developer"),
      )
      .unique()
    if (!role || role.revokedAt) {
      return { hasDeveloperRole: false, verified: false, developerSince: null }
    }
    return {
      hasDeveloperRole: true,
      verified: role.verified === true,
      developerSince: role.assignedAt,
    }
  },
})
