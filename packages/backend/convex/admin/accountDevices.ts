import { v } from "convex/values"

import { components } from "../_generated/api"
import { query } from "../_generated/server"
import { requireAdmin } from "../lib/auth"

/**
 * Sessions et appareils d'un compte, vus depuis la console admin.
 *
 * Lecture seule : le support doit pouvoir répondre à « depuis quel appareil
 * suis-je connecté ? » ou « pourquoi ne reçois-je pas d'alerte ? » sans voir
 * de secret. Les jetons de session, clés Web Push et jetons Expo ne quittent
 * jamais le serveur ; seuls l'appareil, l'adresse IP et les dates remontent.
 */

type SessionDoc = {
  _id: string
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date | number
  updatedAt?: Date | number
  expiresAt: Date | number
}

function ts(value: Date | number | null | undefined): number {
  if (!value) return 0
  return value instanceof Date ? value.getTime() : value
}

/** Libellé lisible « Appareil · Navigateur » (même règle que sessions.ts). */
export function describeUserAgent(ua: string | null | undefined): string {
  if (!ua) return "Appareil inconnu"
  let device = "Appareil"
  if (/iPhone/i.test(ua)) device = "iPhone"
  else if (/iPad/i.test(ua)) device = "iPad"
  else if (/Android/i.test(ua)) device = "Android"
  else if (/Macintosh/i.test(ua)) device = "Mac"
  else if (/Windows/i.test(ua)) device = "Windows"
  else if (/Linux/i.test(ua)) device = "Linux"

  let browser = "Navigateur"
  if (/Edg\//.test(ua)) browser = "Edge"
  else if (/Chrome\//.test(ua)) browser = "Chrome"
  else if (/Firefox\//.test(ua)) browser = "Firefox"
  else if (/Safari\//.test(ua)) browser = "Safari"
  else if (/okhttp|Expo|CFNetwork/i.test(ua)) browser = "Application IDN"

  return `${device} · ${browser}`
}

export const listForUser = query({
  args: { userId: v.string() },
  returns: v.object({
    sessions: v.array(
      v.object({
        id: v.string(),
        device: v.string(),
        ipAddress: v.union(v.string(), v.null()),
        createdAt: v.number(),
        lastSeenAt: v.number(),
        expiresAt: v.number(),
      }),
    ),
    devices: v.array(
      v.object({
        id: v.string(),
        kind: v.union(v.literal("web"), v.literal("ios"), v.literal("android")),
        label: v.string(),
        registeredAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const now = Date.now()

    const [raw, webPush, nativePush] = await Promise.all([
      (
        ctx.runQuery(components.betterAuth.adapter.findMany, {
          model: "session",
          where: [{ field: "userId", value: args.userId, operator: "eq" }],
          paginationOpts: { numItems: 100, cursor: null },
        }) as Promise<{ page: SessionDoc[] }>
      ).catch(() => ({ page: [] as SessionDoc[] })),
      ctx.db
        .query("pushSubscription")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .take(50),
      ctx.db
        .query("nativePushSubscription")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .take(50),
    ])

    const sessions = raw.page
      .filter((s) => ts(s.expiresAt) > now)
      .map((s) => ({
        id: s._id,
        device: describeUserAgent(s.userAgent),
        ipAddress: s.ipAddress ?? null,
        createdAt: ts(s.createdAt),
        lastSeenAt: ts(s.updatedAt) || ts(s.createdAt),
        expiresAt: ts(s.expiresAt),
      }))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)

    const devices = [
      ...webPush.map((d) => ({
        id: d._id as string,
        kind: "web" as const,
        label: describeUserAgent(d.userAgent),
        registeredAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      ...nativePush.map((d) => ({
        id: d._id as string,
        kind: d.platform,
        label: d.deviceName ?? (d.platform === "ios" ? "iPhone" : "Android"),
        registeredAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt)

    return { sessions, devices }
  },
})
