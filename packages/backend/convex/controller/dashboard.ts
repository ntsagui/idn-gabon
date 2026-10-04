import { v } from "convex/values"

import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { requireController } from "../lib/auth"
import { canJoinScheduledInterview } from "../level3/schedulingPolicy"
import { level3Ref, profileName, profileOf, startOfLibrevilleDay } from "./helpers"

/**
 * Espace contrôleur — compteurs et tableau de bord.
 *
 * UNE source pour tous les compteurs de l'interface : la pastille de
 * navigation, l'en-tête de la file et la liste par défaut lisent le même
 * parcours d'index (`kycRequest.by_status = under_review`, plafonné comme la
 * liste). L'ancien en-tête additionnait les demandes Niveau 3 en attente et
 * annonçait « 4 en attente » au-dessus d'une liste de 2.
 */

/** Même plafond que `controller/queue.listForReview`. */
const SCAN_CAP = 500
const DAY_MS = 24 * 60 * 60 * 1000

async function underReview(ctx: QueryCtx) {
  const rows = await ctx.db
    .query("kycRequest")
    .withIndex("by_status", (q) => q.eq("status", "under_review"))
    .order("asc")
    .take(SCAN_CAP + 1)
  return { rows: rows.slice(0, SCAN_CAP), capped: rows.length > SCAN_CAP }
}

async function myBookedSlots(ctx: QueryCtx, controllerId: string, from: number, to: number) {
  const slots = await ctx.db
    .query("level3AppointmentSlot")
    .withIndex("by_controllerId_and_startsAt", (q) =>
      q.eq("controllerId", controllerId).gte("startsAt", from).lt("startsAt", to),
    )
    .take(200)
  return slots.filter((slot) => slot.status === "booked" && slot.verificationId)
}

export const counts = query({
  args: {},
  returns: v.object({
    queue: v.number(),
    queueCapped: v.boolean(),
    appointmentsToday: v.number(),
  }),
  handler: async (ctx) => {
    const me = await requireController(ctx)
    const { rows, capped } = await underReview(ctx)
    const dayStart = startOfLibrevilleDay(Date.now())
    const booked = await myBookedSlots(ctx, me.userId, dayStart, dayStart + DAY_MS)
    return { queue: rows.length, queueCapped: capped, appointmentsToday: booked.length }
  },
})

const NEXT_APPOINTMENT = v.object({
  verificationId: v.id("level3Verification"),
  ref: v.string(),
  name: v.string(),
  idnId: v.optional(v.string()),
  scheduledAt: v.number(),
  scheduledEndAt: v.number(),
  status: v.string(),
  canJoin: v.boolean(),
})

export const summary = query({
  args: {},
  returns: v.object({
    queue: v.object({
      toReview: v.number(),
      capped: v.boolean(),
      complementRequired: v.number(),
      oldestSubmittedAt: v.optional(v.number()),
      /** Dossiers à examiner par ancienneté de dépôt. */
      byAge: v.object({
        under1d: v.number(),
        d1to3: v.number(),
        d3to7: v.number(),
        over7d: v.number(),
      }),
      next: v.optional(
        v.object({
          kycRequestId: v.id("kycRequest"),
          name: v.string(),
          submittedAt: v.number(),
        }),
      ),
    }),
    level3: v.object({
      waitingForSlot: v.number(),
      appointmentsToday: v.number(),
      upcoming: v.array(NEXT_APPOINTMENT),
    }),
    activity: v.object({
      today: v.object({
        kycDecisions: v.number(),
        interviews: v.number(),
        identityChecks: v.number(),
        signatureChecks: v.number(),
      }),
      last30d: v.object({
        approved: v.number(),
        complement: v.number(),
        rejected: v.number(),
      }),
    }),
  }),
  handler: async (ctx) => {
    const me = await requireController(ctx)
    const now = Date.now()
    const dayStart = startOfLibrevilleDay(now)

    // ── File KYC ─────────────────────────────────────────────────────────
    const { rows, capped } = await underReview(ctx)
    const byAge = { under1d: 0, d1to3: 0, d3to7: 0, over7d: 0 }
    let oldest: (typeof rows)[number] | undefined
    for (const row of rows) {
      const submittedAt = row.submittedAt ?? row._creationTime
      const age = now - submittedAt
      if (age < DAY_MS) byAge.under1d++
      else if (age < 3 * DAY_MS) byAge.d1to3++
      else if (age < 7 * DAY_MS) byAge.d3to7++
      else byAge.over7d++
      if (!oldest || submittedAt < (oldest.submittedAt ?? oldest._creationTime)) oldest = row
    }
    const complement = await ctx.db
      .query("kycRequest")
      .withIndex("by_status", (q) => q.eq("status", "complement_required"))
      .take(SCAN_CAP)
    const nextProfile = oldest ? await profileOf(ctx, oldest.userId) : null

    // ── Niveau 3 ─────────────────────────────────────────────────────────
    const waiting = await ctx.db
      .query("level3Verification")
      .withIndex("by_status", (q) => q.eq("status", "waiting_controller"))
      .take(SCAN_CAP)
    const today = await myBookedSlots(ctx, me.userId, dayStart, dayStart + DAY_MS)
    const coming = await myBookedSlots(ctx, me.userId, now - 60 * 60 * 1000, now + 14 * DAY_MS)
    const upcoming = []
    for (const slot of coming) {
      if (upcoming.length >= 4) break
      if (slot.endsAt + 30 * 60 * 1000 < now) continue
      const verification = await ctx.db.get(slot.verificationId!)
      if (
        !verification ||
        (verification.status !== "claimed" && verification.status !== "in_interview")
      ) {
        continue
      }
      const profile = await profileOf(ctx, verification.userId)
      upcoming.push({
        verificationId: verification._id,
        ref: level3Ref(verification._id),
        name: profileName(profile) || "Citoyen IDN",
        idnId: profile?.idnId,
        scheduledAt: slot.startsAt,
        scheduledEndAt: slot.endsAt,
        status: verification.status,
        canJoin: canJoinScheduledInterview(slot.startsAt, slot.endsAt, now),
      })
    }

    // ── Activité du contrôleur ───────────────────────────────────────────
    const recent = await ctx.db
      .query("auditLog")
      .withIndex("by_actor", (q) =>
        q.eq("actorId", me.userId).gte("createdAt", now - 30 * DAY_MS),
      )
      .take(3000)
    const activity = {
      today: { kycDecisions: 0, interviews: 0, identityChecks: 0, signatureChecks: 0 },
      last30d: { approved: 0, complement: 0, rejected: 0 },
    }
    for (const entry of recent) {
      const isToday = entry.createdAt >= dayStart
      const auto = (entry.metadata as { method?: unknown } | undefined)?.method === "level3_fused"
      switch (entry.action) {
        case "kyc_approved":
          // L'approbation « fusionnée » est l'effet d'un entretien Niveau 3,
          // déjà compté comme entretien : ne pas la compter deux fois.
          if (auto) break
          activity.last30d.approved++
          if (isToday) activity.today.kycDecisions++
          break
        case "kyc_rejected":
          activity.last30d.rejected++
          if (isToday) activity.today.kycDecisions++
          break
        case "kyc_complement_requested":
          activity.last30d.complement++
          if (isToday) activity.today.kycDecisions++
          break
        case "level3_approved":
        case "level3_rejected":
          if (isToday) activity.today.interviews++
          break
        case "identity_check_performed":
          if (isToday) activity.today.identityChecks++
          break
        case "signature_verified":
          if (isToday) activity.today.signatureChecks++
          break
      }
    }

    return {
      queue: {
        toReview: rows.length,
        capped,
        complementRequired: complement.length,
        oldestSubmittedAt: oldest ? (oldest.submittedAt ?? oldest._creationTime) : undefined,
        byAge,
        next: oldest
          ? {
              kycRequestId: oldest._id,
              name: profileName(nextProfile) || "Citoyen IDN",
              submittedAt: oldest.submittedAt ?? oldest._creationTime,
            }
          : undefined,
      },
      level3: {
        waitingForSlot: waiting.length,
        appointmentsToday: today.length,
        upcoming,
      },
      activity,
    }
  },
})
