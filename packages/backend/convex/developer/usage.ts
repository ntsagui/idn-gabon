import { v } from "convex/values"

import { components } from "../_generated/api"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { getCurrentAuthUser } from "../lib/auth"

/**
 * Portail développeur — usage réel des applications.
 *
 * IDN ne journalise pas (encore) chaque requête HTTP entrante : il n'existe
 * donc pas de « nombre d'appels API » fiable à afficher. Ce module agrège
 * uniquement ce qui est réellement enregistré, sans extrapolation :
 *
 *   • jetons OAuth émis (`oauthAccessToken`, composant Better Auth) — un jeton
 *     correspond à une connexion réussie d'un usager via l'application ;
 *   • consentements actifs (`oauthConsent`) — usagers ayant autorisé l'app ;
 *   • livraisons de webhooks (`webhookDeliveries`) — succès et échecs, ces
 *     derniers étant la seule source d'« erreurs » mesurée côté IDN ;
 *   • dernière utilisation des clés API (`developerApiKey.lastUsedAt`).
 *
 * Les jours sont découpés à l'heure de Libreville (UTC+1, sans heure d'été).
 * Les lectures sont bornées : au-delà, `truncated` passe à true et l'interface
 * le signale au lieu de présenter un total faux.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const LIBREVILLE_OFFSET_MS = 60 * 60 * 1000
const MAX_APPS = 50
const MAX_TOKENS_PER_APP = 1000
const MAX_CONSENTS_PER_APP = 1000
const MAX_ENDPOINTS_PER_APP = 20
const MAX_DELIVERIES_PER_ENDPOINT = 1000

type OAuthAppDoc = {
  clientId?: string | null
  name?: string | null
  metadata?: string | null
  disabled?: boolean | null
  createdAt?: number | null
}

type TimestampedDoc = {
  createdAt?: number | Date | null
  consentGiven?: boolean | null
}

type Page<T> = { page: T[]; isDone?: boolean }

/** Clé de jour `AAAA-MM-JJ` à l'heure de Libreville. */
export function dayKey(timestamp: number): string {
  return new Date(timestamp + LIBREVILLE_OFFSET_MS).toISOString().slice(0, 10)
}

/** Liste ordonnée des `days` derniers jours, aujourd'hui inclus. */
export function lastDays(now: number, days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * DAY_MS))
  return out
}

/** Début (UTC) du premier jour de la fenêtre, à l'heure de Libreville. */
export function windowStart(now: number, days: number): number {
  const first = lastDays(now, days)[0]!
  return Date.parse(`${first}T00:00:00.000Z`) - LIBREVILLE_OFFSET_MS
}

const toMs = (value: number | Date | null | undefined): number => {
  if (!value) return 0
  return value instanceof Date ? value.getTime() : value
}

const envOf = (raw: string | null | undefined): "sandbox" | "production" => {
  try {
    const parsed = JSON.parse(raw ?? "{}") as { env?: unknown }
    return parsed.env === "production" ? "production" : "sandbox"
  } catch {
    return "sandbox"
  }
}

async function findByClientId<T>(
  ctx: QueryCtx,
  model: "oauthAccessToken" | "oauthConsent",
  clientId: string,
  limit: number,
): Promise<Page<T>> {
  try {
    return (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model,
      where: [{ field: "clientId", value: clientId, operator: "eq" }],
      paginationOpts: { numItems: limit, cursor: null },
    })) as Page<T>
  } catch {
    return { page: [], isDone: true }
  }
}

const DAILY_VALIDATOR = v.object({
  date: v.string(),
  tokens: v.number(),
  deliveriesSucceeded: v.number(),
  deliveriesFailed: v.number(),
})

const APP_USAGE_VALIDATOR = v.object({
  clientId: v.string(),
  name: v.string(),
  env: v.union(v.literal("sandbox"), v.literal("production")),
  disabled: v.boolean(),
  tokens: v.number(),
  activeConsents: v.number(),
  deliveriesSucceeded: v.number(),
  deliveriesFailed: v.number(),
  lastActivityAt: v.union(v.number(), v.null()),
})

export const overview = query({
  args: {
    days: v.union(v.literal(7), v.literal(30), v.literal(90)),
    clientId: v.optional(v.string()),
  },
  returns: v.object({
    days: v.number(),
    since: v.number(),
    totals: v.object({
      tokens: v.number(),
      activeConsents: v.number(),
      deliveriesSucceeded: v.number(),
      deliveriesFailed: v.number(),
    }),
    daily: v.array(DAILY_VALIDATOR),
    apps: v.array(APP_USAGE_VALIDATOR),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now()
    const since = windowStart(now, args.days)
    const keys = lastDays(now, args.days)
    const daily = new Map(
      keys.map((date) => [
        date,
        { date, tokens: 0, deliveriesSucceeded: 0, deliveriesFailed: 0 },
      ]),
    )
    const empty = {
      days: args.days,
      since,
      totals: {
        tokens: 0,
        activeConsents: 0,
        deliveriesSucceeded: 0,
        deliveriesFailed: 0,
      },
      daily: [...daily.values()],
      apps: [],
      truncated: false,
    }

    // Lecture gracieuse, comme developer/apps.listMine : rien tant que la
    // session ou le rôle développeur ne sont pas en place.
    const user = await getCurrentAuthUser(ctx)
    if (!user || !user.roles.includes("developer")) return empty

    let owned: Page<OAuthAppDoc>
    try {
      owned = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "oauthApplication",
        where: [{ field: "userId", value: user.userId, operator: "eq" }],
        paginationOpts: { numItems: MAX_APPS, cursor: null },
      })) as Page<OAuthAppDoc>
    } catch {
      return empty
    }
    let truncated = owned.isDone === false

    const apps = owned.page.filter(
      (doc): doc is OAuthAppDoc & { clientId: string } =>
        typeof doc.clientId === "string" &&
        doc.clientId.length > 0 &&
        (args.clientId === undefined || doc.clientId === args.clientId),
    )

    const apiKeys = await ctx.db
      .query("developerApiKey")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .order("desc")
      .take(100)

    const totals = { ...empty.totals }
    const perApp = []
    for (const app of apps) {
      const clientId = app.clientId
      let lastActivityAt = 0

      const tokens = await findByClientId<TimestampedDoc>(
        ctx,
        "oauthAccessToken",
        clientId,
        MAX_TOKENS_PER_APP,
      )
      if (tokens.isDone === false) truncated = true
      let tokenCount = 0
      for (const token of tokens.page) {
        const at = toMs(token.createdAt)
        lastActivityAt = Math.max(lastActivityAt, at)
        if (at < since) continue
        const bucket = daily.get(dayKey(at))
        if (!bucket) continue
        bucket.tokens++
        tokenCount++
      }

      const consents = await findByClientId<TimestampedDoc>(
        ctx,
        "oauthConsent",
        clientId,
        MAX_CONSENTS_PER_APP,
      )
      if (consents.isDone === false) truncated = true
      const activeConsents = consents.page.filter(
        (consent) => consent.consentGiven !== false,
      ).length

      let succeeded = 0
      let failed = 0
      const endpoints = await ctx.db
        .query("webhookEndpoints")
        .withIndex("by_appClientId_and_createdAt", (q) =>
          q.eq("appClientId", clientId),
        )
        .order("desc")
        .take(MAX_ENDPOINTS_PER_APP)
      for (const endpoint of endpoints) {
        if (endpoint.developerUserId !== user.userId) continue
        lastActivityAt = Math.max(
          lastActivityAt,
          endpoint.lastSuccessAt ?? 0,
          endpoint.lastFailureAt ?? 0,
        )
        const deliveries = await ctx.db
          .query("webhookDeliveries")
          .withIndex("by_endpointId_and_createdAt", (q) =>
            q.eq("endpointId", endpoint._id).gte("createdAt", since),
          )
          .take(MAX_DELIVERIES_PER_ENDPOINT + 1)
        if (deliveries.length > MAX_DELIVERIES_PER_ENDPOINT) truncated = true
        for (const delivery of deliveries.slice(
          0,
          MAX_DELIVERIES_PER_ENDPOINT,
        )) {
          const bucket = daily.get(dayKey(delivery.createdAt))
          if (!bucket) continue
          if (delivery.status === "succeeded") {
            bucket.deliveriesSucceeded++
            succeeded++
          } else if (delivery.status === "failed") {
            bucket.deliveriesFailed++
            failed++
          }
        }
      }

      for (const key of apiKeys) {
        if (key.appClientId === clientId && key.lastUsedAt) {
          lastActivityAt = Math.max(lastActivityAt, key.lastUsedAt)
        }
      }

      totals.tokens += tokenCount
      totals.activeConsents += activeConsents
      totals.deliveriesSucceeded += succeeded
      totals.deliveriesFailed += failed
      perApp.push({
        clientId,
        name: app.name ?? clientId,
        env: envOf(app.metadata),
        disabled: Boolean(app.disabled),
        tokens: tokenCount,
        activeConsents,
        deliveriesSucceeded: succeeded,
        deliveriesFailed: failed,
        lastActivityAt: lastActivityAt > 0 ? lastActivityAt : null,
      })
    }

    return {
      days: args.days,
      since,
      totals,
      daily: [...daily.values()],
      apps: perApp,
      truncated,
    }
  },
})
