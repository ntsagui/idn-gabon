import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { QueryCtx } from "../_generated/server"
import { internalMutation, internalQuery } from "../_generated/server"
import {
  deleteIncompleteSignup,
  findBetterAuthUserByEmail,
  IDN_DOMAIN,
  inspectIncompleteSignup,
} from "../lib/incompleteSignup"

const MAX_EMAILS = 25
const CONFIRMATION = "SUPPRIMER LES INSCRIPTIONS IDN INCOMPLETES"

// Le parcours embarqué fautif a été introduit le 22 août 2026. La borne de
// fin est volontairement large : les autres garde-fous portent sur l'état
// réel du compte et empêchent de toucher un citoyen finalisé.
const INCIDENT_START = Date.UTC(2026, 7, 22)
const INCIDENT_END = Date.UTC(2026, 7, 27)

const inspectionValidator = v.object({
  email: v.string(),
  userId: v.union(v.string(), v.null()),
  createdAt: v.union(v.number(), v.null()),
  emailVerified: v.union(v.boolean(), v.null()),
  eligible: v.boolean(),
  reasons: v.array(v.string()),
  sessionCount: v.number(),
  accountCount: v.number(),
})

type ReadCtx = Pick<QueryCtx, "db" | "runQuery">

function normalizeEmails(emails: string[]): string[] {
  const normalized = [
    ...new Set(emails.map((email) => email.trim().toLowerCase())),
  ]
  if (normalized.length === 0 || normalized.length > MAX_EMAILS) {
    throw new ConvexError({
      code: "INVALID_BATCH",
      message: `Indiquez entre 1 et ${MAX_EMAILS} adresses IDN.`,
    })
  }
  if (normalized.some((email) => !email.endsWith(IDN_DOMAIN))) {
    throw new ConvexError({
      code: "INVALID_EMAIL",
      message: "Seules les adresses @idn.ga peuvent être réparées ici.",
    })
  }
  return normalized
}

async function inspectOne(ctx: ReadCtx, email: string) {
  const user = await findBetterAuthUserByEmail(ctx, email)

  if (!user) {
    return {
      email,
      userId: null,
      createdAt: null,
      emailVerified: null,
      eligible: false,
      reasons: ["USER_NOT_FOUND"],
      sessionCount: 0,
      accountCount: 0,
    }
  }

  const inspection = await inspectIncompleteSignup(ctx, user, {
    expectedEmail: email,
    createdWithin: { from: INCIDENT_START, to: INCIDENT_END },
  })

  return {
    email,
    userId: user._id,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    ...inspection,
  }
}

/** Audit en lecture seule. Toujours exécuter cette fonction avant `run`. */
export const inspect = internalQuery({
  args: { emails: v.array(v.string()) },
  returns: v.array(inspectionValidator),
  handler: async (ctx, args) => {
    const emails = normalizeEmails(args.emails)
    return await Promise.all(emails.map((email) => inspectOne(ctx, email)))
  },
})

/**
 * Supprime uniquement les coquilles Better Auth créées pendant l'incident.
 * La transaction entière échoue si une seule adresse ne passe plus l'audit.
 */
export const run = internalMutation({
  args: {
    emails: v.array(v.string()),
    confirm: v.string(),
  },
  returns: v.object({ deleted: v.array(v.string()) }),
  handler: async (ctx, args) => {
    if (args.confirm !== CONFIRMATION) {
      throw new ConvexError({
        code: "CONFIRMATION_MISMATCH",
        message: `Confirmation requise : ${CONFIRMATION}`,
      })
    }

    const emails = normalizeEmails(args.emails)
    const inspections = await Promise.all(
      emails.map((email) => inspectOne(ctx, email)),
    )
    const blocked = inspections.filter((item) => !item.eligible)
    if (blocked.length > 0) {
      throw new ConvexError({
        code: "UNSAFE_TO_DELETE",
        message:
          "Au moins un compte ne correspond plus à une inscription incomplète.",
        details: blocked.map((item) => ({
          email: item.email,
          reasons: item.reasons,
        })),
      })
    }

    for (const item of inspections) {
      const userId = item.userId!
      await deleteIncompleteSignup(ctx, { _id: userId, email: item.email })
      await ctx.runMutation(internal.audit.recordAudit, {
        action: "admin_action",
        targetType: "user",
        targetId: userId,
        metadata: {
          kind: "embedded_signup_orphan_deleted",
          email: item.email,
          incident: "gabon-diplomatie-completeSignup-contract-2026-08",
        },
      })
    }

    return { deleted: emails }
  },
})
