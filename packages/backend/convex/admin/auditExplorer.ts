import { v } from "convex/values"

import { components } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"
import { query, type QueryCtx } from "../_generated/server"
import { requireAdmin } from "../lib/auth"
import { AUDIT_ACTIONS } from "../schema"
import { PERSON, personResolver } from "./people"

/**
 * Journal d'audit de la console : filtres combinables (catégorie ou action,
 * acteur, période), noms résolus, détail d'un événement et historique d'un
 * compte.
 *
 * `admin/auditLogs.list` ne combine pas ses filtres (un seul index à la fois)
 * et ne renvoie que des identifiants bruts. Ici on choisit l'index le plus
 * sélectif — action, puis acteur, puis date — et on applique le reste en
 * mémoire sur un parcours plafonné. Quand le plafond est atteint avant d'avoir
 * rempli la page, `truncated` le signale.
 */

type Action = (typeof AUDIT_ACTIONS)[number]

const ACTION = v.union(...AUDIT_ACTIONS.map((a) => v.literal(a)))

/** Regroupement métier des actions, pour le filtre « Type ». */
export const AUDIT_CATEGORIES = {
  auth: [
    "login_success",
    "login_failure",
    "login_lockout",
    "session_revoked",
    "session_revoked_global",
    "partner_token_exchanged",
  ],
  otp: ["otp_sent", "otp_verified", "otp_expired"],
  account: [
    "account_created",
    "account_modified",
    "account_disabled",
    "password_changed",
    "email_changed",
    "pin_changed",
    "signup_abandoned",
  ],
  kyc: [
    "kyc_submitted",
    "kyc_under_review",
    "kyc_complement_requested",
    "kyc_complement_provided",
    "kyc_approved",
    "kyc_rejected",
    "level3_requested",
    "level3_document_track_opened",
    "level3_claimed",
    "level3_availability_created",
    "level3_scheduled",
    "level3_rescheduled",
    "level3_interview_started",
    "level3_approved",
    "level3_rejected",
    "level3_cancelled",
    "level3_appointment_cancelled",
  ],
  apps: [
    "consent_granted",
    "consent_revoked",
    "oauth_app_created",
    "oauth_app_modified",
    "oauth_app_disabled",
    "delegation_enabled",
    "delegation_disabled",
    "delegated_identity_created",
    "delegated_identity_claimed",
    "delegated_claim_code_failed",
  ],
  admin: ["admin_action", "role_assigned", "role_revoked"],
  duplicates: [
    "duplicate_flagged",
    "duplicate_flag_resolved",
    "signup_blocked_duplicate",
  ],
  controller: [
    "identity_check_performed",
    "signature_verified",
    "document_signed",
    "presentation_minted",
  ],
} as const satisfies Record<string, readonly Action[]>

type Category = keyof typeof AUDIT_CATEGORIES

const CATEGORY = v.union(
  ...(Object.keys(AUDIT_CATEGORIES) as Category[]).map((c) => v.literal(c)),
)

const SCAN_LIMIT = 3000

const TARGET = v.object({
  type: v.string(),
  id: v.string(),
  person: v.optional(PERSON),
  appName: v.optional(v.string()),
})

const EVENT_ROW = v.object({
  _id: v.id("auditLog"),
  action: ACTION,
  actor: v.union(PERSON, v.null()),
  target: TARGET,
  ip: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.any())),
  createdAt: v.number(),
})

const IDN_ID_RE = /^GA-[0-9A-Z]{4}-[0-9A-Z]{4}$/i

/**
 * Résout la saisie « acteur » : un email, un ID IDN ou un identifiant
 * technique. Renvoie `null` si rien ne correspond.
 */
async function resolveActor(
  ctx: QueryCtx,
  raw: string,
): Promise<string | null> {
  const q = raw.trim()
  if (q.includes("@")) {
    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: q.toLowerCase() }],
    })) as { _id: string } | null
    return user?._id ?? null
  }
  if (IDN_ID_RE.test(q)) {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_idnId", (i) => i.eq("idnId", q.toUpperCase()))
      .first()
    return profile?.userId ?? null
  }
  return q || null
}

function appNameResolver(ctx: QueryCtx) {
  const cache = new Map<string, Promise<string | undefined>>()
  return (clientId: string) => {
    let hit = cache.get(clientId)
    if (!hit) {
      hit = (
        ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: "oauthApplication",
          where: [{ field: "clientId", value: clientId }],
        }) as Promise<{ name?: string | null } | null>
      )
        .then((doc) => doc?.name ?? undefined)
        .catch(() => undefined)
      cache.set(clientId, hit)
    }
    return hit
  }
}

async function present(ctx: QueryCtx, docs: Doc<"auditLog">[]) {
  const person = personResolver(ctx)
  const appName = appNameResolver(ctx)
  return await Promise.all(
    docs.map(async (d) => ({
      _id: d._id,
      action: d.action,
      actor: d.actorId ? await person(d.actorId) : null,
      target: {
        type: d.targetType,
        id: d.targetId,
        ...(d.targetType === "user" && d.targetId
          ? { person: await person(d.targetId) }
          : {}),
        ...(d.targetType === "app" && d.targetId
          ? { appName: await appName(d.targetId) }
          : {}),
      },
      ip: d.ip,
      metadata: d.metadata,
      createdAt: d.createdAt,
    })),
  )
}

export const listEvents = query({
  args: {
    category: v.optional(CATEGORY),
    action: v.optional(ACTION),
    actor: v.optional(v.string()),
    /** Borne basse incluse (ms). */
    dateFrom: v.optional(v.number()),
    /** Borne haute exclue (ms). */
    dateTo: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    rows: v.array(EVENT_ROW),
    truncated: v.boolean(),
    actorNotFound: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 200), 1), 500)
    const from = args.dateFrom ?? 0
    const to = args.dateTo ?? Number.MAX_SAFE_INTEGER

    let actorId: string | null = null
    if (args.actor?.trim()) {
      actorId = await resolveActor(ctx, args.actor)
      if (!actorId) return { rows: [], truncated: false, actorNotFound: true }
    }

    const allowed: ReadonlySet<string> | null = args.action
      ? new Set([args.action])
      : args.category
        ? new Set<string>(AUDIT_CATEGORIES[args.category])
        : null

    const source = args.action
      ? ctx.db
          .query("auditLog")
          .withIndex("by_action", (q) =>
            q
              .eq("action", args.action!)
              .gte("createdAt", from)
              .lt("createdAt", to),
          )
      : actorId
        ? ctx.db
            .query("auditLog")
            .withIndex("by_actor", (q) =>
              q
                .eq("actorId", actorId!)
                .gte("createdAt", from)
                .lt("createdAt", to),
            )
        : ctx.db
            .query("auditLog")
            .withIndex("by_createdAt", (q) =>
              q.gte("createdAt", from).lt("createdAt", to),
            )

    const matched: Doc<"auditLog">[] = []
    let scanned = 0
    let truncated = false
    for await (const doc of source.order("desc")) {
      scanned++
      if (
        (!allowed || allowed.has(doc.action)) &&
        (!actorId || doc.actorId === actorId)
      ) {
        matched.push(doc)
        if (matched.length >= limit) break
      }
      if (scanned >= SCAN_LIMIT) {
        truncated = matched.length < limit
        break
      }
    }

    return {
      rows: await present(ctx, matched),
      truncated,
      actorNotFound: false,
    }
  },
})

/** Détail complet d'un événement (sans la signature, seulement sa présence). */
export const getEvent = query({
  args: { id: v.id("auditLog") },
  returns: v.union(
    v.null(),
    v.object({
      ...EVENT_ROW.fields,
      targetType: v.string(),
      userAgent: v.optional(v.string()),
      signed: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const doc = await ctx.db.get(args.id)
    if (!doc) return null
    const [row] = await present(ctx, [doc])
    return {
      ...row!,
      targetType: doc.targetType,
      userAgent: doc.userAgent,
      signed: Boolean(doc.signature),
    }
  },
})

/**
 * Historique d'audit d'un compte : ce qu'il a fait (acteur) et ce qui lui a
 * été fait (cible), fusionnés et dédoublonnés.
 */
export const listForUser = query({
  args: { userId: v.string(), limit: v.optional(v.number()) },
  returns: v.array(EVENT_ROW),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 50), 1), 200)
    const [asActor, asTarget] = await Promise.all([
      ctx.db
        .query("auditLog")
        .withIndex("by_actor", (q) => q.eq("actorId", args.userId))
        .order("desc")
        .take(limit),
      ctx.db
        .query("auditLog")
        .withIndex("by_target", (q) =>
          q.eq("targetType", "user").eq("targetId", args.userId),
        )
        .order("desc")
        .take(limit),
    ])
    const merged = [
      ...new Map([...asActor, ...asTarget].map((d) => [d._id, d])).values(),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
    return await present(ctx, merged)
  },
})

/**
 * Historique d'une application : événements dont la cible est l'un de ses
 * enregistrements techniques (Sandbox et Production).
 */
export const listForApp = query({
  args: { clientIds: v.array(v.string()), limit: v.optional(v.number()) },
  returns: v.array(EVENT_ROW),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const limit = Math.min(Math.max(Math.trunc(args.limit ?? 30), 1), 100)
    const ids = [...new Set(args.clientIds)].slice(0, 4)
    const batches = await Promise.all(
      ids.map((id) =>
        ctx.db
          .query("auditLog")
          .withIndex("by_target", (q) =>
            q.eq("targetType", "app").eq("targetId", id),
          )
          .order("desc")
          .take(limit),
      ),
    )
    const merged = batches
      .flat()
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)
    return await present(ctx, merged)
  },
})
