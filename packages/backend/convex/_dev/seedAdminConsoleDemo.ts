import { ConvexError, v } from "convex/values"

import { components } from "../_generated/api"
import { internalMutation } from "../functions"
import { normalizeIdentityKey } from "../lib/identity"

/**
 * Compte citoyen FICTIF pour exercer la console d'administration —
 * DÉVELOPPEMENT UNIQUEMENT (codes provisoires, rôles, anonymisation,
 * suppression définitive) sans toucher au compte d'une vraie personne.
 *
 *   bunx convex run _dev/seedAdminConsoleDemo:createCitizen '{"email":"…"}'
 *
 * Le compte se supprime ensuite depuis sa fiche (« Supprimer »), ce qui
 * exerce aussi la suppression définitive. Refuse la production.
 */

const PRODUCTION_DEPLOYMENT = "flexible-panda-248"

export const createCitizen = internalMutation({
  args: { email: v.string() },
  returns: v.object({ userId: v.string(), idnId: v.string() }),
  handler: async (ctx, args) => {
    if ((process.env.CONVEX_CLOUD_URL ?? "").includes(PRODUCTION_DEPLOYMENT)) {
      throw new ConvexError({
        code: "FORBIDDEN_IN_PRODUCTION",
        message: "Compte de démonstration interdit en production.",
      })
    }
    const now = Date.now()
    const created = (await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "user",
          data: {
            email: args.email.toLowerCase(),
            name: args.email.toLowerCase(),
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          },
        },
      },
    )) as { _id: string }
    const suffix = now.toString(36).slice(-4).toUpperCase().padStart(4, "0")
    const idnId = `GA-ESSA-${suffix}`
    const pivot = {
      firstName: "Essai",
      lastName: `Console ${suffix}`,
      dateOfBirth: "1990-01-01",
      gender: "N" as const,
      birthPlace: "Libreville",
      nationality: "GA",
    }
    await ctx.db.insert("userProfile", {
      userId: created._id,
      profileType: "citizen",
      loa: 1,
      idnId,
      pivot,
      pivotKey: normalizeIdentityKey(pivot.firstName, pivot.lastName, pivot.dateOfBirth),
      createdAt: now,
      updatedAt: now,
    })
    return { userId: created._id, idnId }
  },
})
