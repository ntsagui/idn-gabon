import { ConvexError, v } from "convex/values"

import { components, internal } from "../_generated/api"
import type { MutationCtx, QueryCtx } from "../_generated/server"
import { mutation, query } from "../_generated/server"
import { requireAdmin } from "../lib/auth"
import { PERSON, personResolver } from "./people"

/**
 * Pilotage des applications OAuth depuis la console admin : propriétaire,
 * suspension et réactivation.
 *
 * POURQUOI PAS `oauthApps.disableApp` : cette mutation réécrit le statut en
 * `sandbox`. Une application de production désactivée puis « réapprouvée »
 * perd donc la trace de ce qu'elle était, et une sandbox réactivée par
 * `approveApp` passe en production sans revue. La suspension, elle, mémorise
 * l'état `disabled` de chaque enregistrement technique (sandbox et
 * production) dans `metadata.suspension`, puis le restaure à l'identique.
 *
 * Une application logique regroupe jusqu'à deux enregistrements Better Auth
 * liés par `metadata.linkedClientId` : la suspension s'applique aux deux, sans
 * quoi l'environnement jumeau resterait utilisable.
 */

type RawApp = {
  _id: string
  clientId?: string | null
  name?: string | null
  userId?: string | null
  disabled?: boolean | null
  metadata?: string | null
}

type Suspension = {
  at: number
  by: string
  reason?: string
  previousDisabled: boolean
}

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as unknown
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function suspensionOf(meta: Record<string, unknown>): Suspension | null {
  const s = meta.suspension as Partial<Suspension> | undefined
  if (!s || typeof s !== "object" || typeof s.at !== "number") return null
  return {
    at: s.at,
    by: typeof s.by === "string" ? s.by : "",
    reason: typeof s.reason === "string" ? s.reason : undefined,
    previousDisabled: s.previousDisabled === true,
  }
}

async function findApp(
  ctx: QueryCtx | MutationCtx,
  clientId: string,
): Promise<RawApp | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "oauthApplication",
    where: [{ field: "clientId", value: clientId }],
  })) as RawApp | null
}

/** Les enregistrements techniques (1 ou 2) d'une application logique. */
async function appRecords(
  ctx: QueryCtx | MutationCtx,
  clientId: string,
): Promise<RawApp[]> {
  const doc = await findApp(ctx, clientId)
  if (!doc) return []
  const linked = parseMeta(doc.metadata).linkedClientId
  if (typeof linked !== "string" || linked === clientId) return [doc]
  const twin = await findApp(ctx, linked)
  return twin ? [doc, twin] : [doc]
}

const OWNER_ROW = v.object({
  clientId: v.string(),
  owner: v.union(PERSON, v.null()),
  suspended: v.union(
    v.null(),
    v.object({
      at: v.number(),
      reason: v.optional(v.string()),
      by: v.union(PERSON, v.null()),
    }),
  ),
})

/**
 * Propriétaire et suspension de chaque enregistrement OAuth, indexés par
 * `clientId`. Complète `oauthApps.listApps`, qui ne renvoie ni l'un ni
 * l'autre.
 */
export const listOwners = query({
  args: {},
  returns: v.array(OWNER_ROW),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const resolve = personResolver(ctx)
    const page = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "oauthApplication",
      paginationOpts: { cursor: null, numItems: 500 },
    })) as { page: RawApp[] }
    return await Promise.all(
      (page.page ?? []).map(async (doc) => {
        const suspension = suspensionOf(parseMeta(doc.metadata))
        return {
          clientId: doc.clientId ?? "",
          owner: doc.userId ? await resolve(doc.userId) : null,
          suspended: suspension
            ? {
                at: suspension.at,
                reason: suspension.reason,
                by: suspension.by ? await resolve(suspension.by) : null,
              }
            : null,
        }
      }),
    )
  },
})

/** Propriétaire et suspension d'une application (page de détail). */
export const getControl = query({
  args: { clientId: v.string() },
  returns: v.union(v.null(), OWNER_ROW),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const doc = await findApp(ctx, args.clientId)
    if (!doc) return null
    const resolve = personResolver(ctx)
    const suspension = suspensionOf(parseMeta(doc.metadata))
    return {
      clientId: args.clientId,
      owner: doc.userId ? await resolve(doc.userId) : null,
      suspended: suspension
        ? {
            at: suspension.at,
            reason: suspension.reason,
            by: suspension.by ? await resolve(suspension.by) : null,
          }
        : null,
    }
  },
})

async function writeRecord(
  ctx: MutationCtx,
  doc: RawApp,
  meta: Record<string, unknown>,
  disabled: boolean,
) {
  await ctx.runMutation(components.betterAuth.adapter.updateOne, {
    input: {
      model: "oauthApplication",
      where: [{ field: "_id", value: doc._id }],
      update: {
        metadata: JSON.stringify(meta),
        disabled,
        updatedAt: Date.now(),
      },
    },
  })
}

/**
 * Suspend une application (tous ses environnements). Idempotent : un
 * enregistrement déjà suspendu garde sa suspension d'origine, pour ne pas
 * écraser l'état à restaurer.
 */
export const suspend = mutation({
  args: { clientId: v.string(), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx)
    const records = await appRecords(ctx, args.clientId)
    if (records.length === 0) {
      throw new ConvexError({
        code: "APP_NOT_FOUND",
        message: "Application introuvable.",
      })
    }
    const reason = args.reason?.trim().slice(0, 500) || undefined
    let changed = false
    for (const doc of records) {
      const meta = parseMeta(doc.metadata)
      if (suspensionOf(meta)) continue
      const suspension: Suspension = {
        at: Date.now(),
        by: actor.userId,
        ...(reason ? { reason } : {}),
        previousDisabled: doc.disabled === true,
      }
      await writeRecord(ctx, doc, { ...meta, suspension }, true)
      changed = true
    }
    if (!changed) return null

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: actor.userId,
      action: "oauth_app_disabled",
      targetType: "app",
      targetId: args.clientId,
      metadata: { kind: "suspended", reason: reason ?? "" },
    })
    return null
  },
})

/**
 * Lève la suspension et restaure, enregistrement par enregistrement, l'état
 * `disabled` d'avant : une jumelle de production encore en attente de revue
 * reste désactivée.
 */
export const reactivate = mutation({
  args: { clientId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx)
    const records = await appRecords(ctx, args.clientId)
    if (records.length === 0) {
      throw new ConvexError({
        code: "APP_NOT_FOUND",
        message: "Application introuvable.",
      })
    }
    let changed = false
    for (const doc of records) {
      const meta = parseMeta(doc.metadata)
      const suspension = suspensionOf(meta)
      if (!suspension) continue
      const rest = { ...meta }
      delete rest.suspension
      await writeRecord(ctx, doc, rest, suspension.previousDisabled)
      changed = true
    }
    if (!changed) {
      throw new ConvexError({
        code: "NOT_SUSPENDED",
        message: "Cette application n'est pas suspendue.",
      })
    }

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: actor.userId,
      action: "oauth_app_modified",
      targetType: "app",
      targetId: args.clientId,
      metadata: { kind: "reactivated" },
    })
    return null
  },
})
