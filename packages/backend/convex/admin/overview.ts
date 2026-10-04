import { v } from "convex/values"

import { query } from "../_generated/server"
import { requireAdmin } from "../lib/auth"
import { PERSON, personResolver } from "./people"

/**
 * Tableau de bord de la console : série de connexions lisible et file des
 * codes provisoires en cours de validité.
 */

const DAY_MS = 24 * 60 * 60 * 1000
const LOGIN_SCAN_LIMIT = 8000

/**
 * Connexions réussies par jour, découpées sur le fuseau de l'opérateur.
 *
 * `admin/dashboard.getDailyLogins` découpe à minuit UTC et ne lit que les
 * 5 000 dernières connexions sans borne de date ; ici le parcours est borné
 * par l'index (`by_action` + `createdAt`) et le décalage horaire vient du
 * navigateur, pour que la barre « aujourd'hui » corresponde à la journée de
 * celui qui la lit.
 *
 * Seules les connexions réussies sont journalisées (`login_success`) : aucune
 * série « échecs » n'est proposée tant que `login_failure` n'est pas écrit.
 */
export const loginActivity = query({
  args: {
    days: v.number(),
    /** `Date.prototype.getTimezoneOffset()` du navigateur, en minutes. */
    tzOffsetMinutes: v.number(),
  },
  returns: v.object({
    buckets: v.array(v.object({ day: v.number(), count: v.number() })),
    last24h: v.number(),
    previous24h: v.number(),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const days = Math.min(Math.max(Math.trunc(args.days), 1), 90)
    const offsetMs = Math.trunc(args.tzOffsetMinutes) * 60 * 1000
    const now = Date.now()

    // Minuit local exprimé en temps universel.
    const localNow = now - offsetMs
    const startOfTodayUtc = localNow - (localNow % DAY_MS) + offsetMs
    const firstBucket = startOfTodayUtc - (days - 1) * DAY_MS
    const scanFrom = Math.min(firstBucket, now - 2 * DAY_MS)

    const docs = await ctx.db
      .query("auditLog")
      .withIndex("by_action", (q) =>
        q.eq("action", "login_success").gte("createdAt", scanFrom),
      )
      .order("desc")
      .take(LOGIN_SCAN_LIMIT)

    const buckets = new Array<number>(days).fill(0)
    let last24h = 0
    let previous24h = 0
    for (const d of docs) {
      const age = now - d.createdAt
      if (age < DAY_MS) last24h++
      else if (age < 2 * DAY_MS) previous24h++
      if (d.createdAt < firstBucket) continue
      const idx = Math.floor((d.createdAt - firstBucket) / DAY_MS)
      if (idx >= 0 && idx < days) buckets[idx] = (buckets[idx] ?? 0) + 1
    }

    return {
      buckets: buckets.map((count, i) => ({
        day: firstBucket + i * DAY_MS,
        count,
      })),
      last24h,
      previous24h,
      truncated: docs.length === LOGIN_SCAN_LIMIT,
    }
  },
})

/**
 * Codes provisoires (mot de passe et PIN) remis par un agent et encore
 * valables. Source : l'audit `admin_action` écrit à chaque émission, qui
 * porte l'échéance mais jamais la valeur du code.
 *
 * Un code peut avoir été consommé avant son échéance : la liste dit « émis
 * et non expiré », pas « non utilisé ». La durée de vie maximale est de
 * 15 minutes, on ne lit donc que la dernière heure.
 */
export const activeRecoveryCodes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("auditLog"),
      kind: v.union(v.literal("password"), v.literal("pin")),
      account: PERSON,
      issuedBy: v.union(PERSON, v.null()),
      issuedAt: v.number(),
      expiresAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const now = Date.now()
    const rows = await ctx.db
      .query("auditLog")
      .withIndex("by_action", (q) =>
        q.eq("action", "admin_action").gte("createdAt", now - 60 * 60 * 1000),
      )
      .order("desc")
      .take(500)

    const person = personResolver(ctx)
    const seen = new Set<string>()
    const result = []
    for (const r of rows) {
      const kind =
        r.metadata?.kind === "password_reset_code_issued"
          ? ("password" as const)
          : r.metadata?.kind === "pin_reset_code_issued"
            ? ("pin" as const)
            : null
      const expiresAt = r.metadata?.expiresAt
      if (!kind || typeof expiresAt !== "number" || expiresAt <= now) continue
      // Une nouvelle émission invalide la précédente du même type.
      const key = `${kind}:${r.targetId}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({
        _id: r._id,
        kind,
        account: await person(r.targetId),
        issuedBy: r.actorId ? await person(r.actorId) : null,
        issuedAt: r.createdAt,
        expiresAt,
      })
    }
    return result
  },
})
