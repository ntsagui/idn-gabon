import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { query } from "../_generated/server"
import { mutation } from "../functions"
import { requireController } from "../lib/auth"
import {
  canJoinScheduledInterview,
  formatLibrevilleAppointment,
  joinOpensAt,
  LEVEL3_MAX_BOOKING_HORIZON_MS,
  LEVEL3_REMINDER_LEAD_MS,
} from "../level3/schedulingPolicy"
import { latestKycRow } from "../verification/requestFlow"
import {
  type DocumentTrackStatus,
  isDocumentTrackReadyForBooking,
} from "../verification/requestPolicy"
import { level3Ref, profileCache, profileName, profileOf } from "./helpers"

/**
 * Espace contrôleur — agenda des entretiens Niveau 3.
 *
 * Complète `level3/scheduling.ts` (publication et retrait de disponibilités,
 * réservation par le citoyen) avec ce que le contrôleur fait lui-même :
 *   - voir sa semaine (créneaux libres et réservés, avec la personne) ;
 *   - planifier une demande en attente sur l'un de ses créneaux libres
 *     (citoyen joint par téléphone, guichet) ;
 *   - annuler un rendez-vous avec un motif communiqué au citoyen ;
 *   - ouvrir la salle d'entretien avec le dossier de la personne.
 * La décision d'entretien reste `level3.approve` / `level3.reject`
 * (`applyLevel3Decision`, implémentation unique).
 */

const SLOT_STATUS = v.union(v.literal("available"), v.literal("booked"), v.literal("cancelled"))
const VERIFICATION_STATUS = v.union(
  v.literal("waiting_controller"),
  v.literal("claimed"),
  v.literal("in_interview"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("cancelled"),
)

const CITIZEN = v.object({
  name: v.string(),
  idnId: v.optional(v.string()),
  loa: v.union(v.literal(1), v.literal(2), v.literal(3)),
})

function citizenOf(profile: Doc<"userProfile"> | null) {
  return {
    name: profileName(profile) || "Citoyen IDN",
    idnId: profile?.idnId,
    loa: profile?.loa ?? 1,
  }
}

/** Même critère que la réservation citoyen (`level3/scheduling.book`). */
async function documentTrack(ctx: Pick<QueryCtx, "db">, verification: Doc<"level3Verification">) {
  const profile = await profileOf(ctx, verification.userId)
  const loa = profile?.loa ?? 1
  const kyc = verification.kycRequestId
    ? await ctx.db.get(verification.kycRequestId)
    : await latestKycRow(ctx, verification.userId)
  const status = kyc ? (kyc.status as DocumentTrackStatus) : null
  return { profile, status, ready: isDocumentTrackReadyForBooking(loa, status) }
}

export const planning = query({
  args: { from: v.number(), to: v.number() },
  returns: v.object({
    slots: v.array(
      v.object({
        _id: v.id("level3AppointmentSlot"),
        startsAt: v.number(),
        endsAt: v.number(),
        status: SLOT_STATUS,
        booking: v.union(
          v.null(),
          v.object({
            verificationId: v.id("level3Verification"),
            ref: v.string(),
            status: VERIFICATION_STATUS,
            canJoin: v.boolean(),
            joinOpensAt: v.number(),
            citizen: CITIZEN,
          }),
        ),
      }),
    ),
    waiting: v.array(
      v.object({
        verificationId: v.id("level3Verification"),
        ref: v.string(),
        requestedAt: v.number(),
        citizen: CITIZEN,
        documentStatus: v.union(v.string(), v.null()),
        documentsReady: v.boolean(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const now = Date.now()
    const from = Math.max(args.from, now - 60 * 24 * 60 * 60 * 1000)
    const to = Math.min(args.to, now + LEVEL3_MAX_BOOKING_HORIZON_MS)
    const getProfile = profileCache(ctx)

    const rows = await ctx.db
      .query("level3AppointmentSlot")
      .withIndex("by_controllerId_and_startsAt", (q) =>
        q.eq("controllerId", me.userId).gte("startsAt", from).lt("startsAt", to),
      )
      .take(400)

    const slots = []
    for (const slot of rows) {
      if (slot.status === "cancelled") continue
      let booking = null
      if (slot.status === "booked" && slot.verificationId) {
        const verification = await ctx.db.get(slot.verificationId)
        if (verification) {
          booking = {
            verificationId: verification._id,
            ref: level3Ref(verification._id),
            status: verification.status,
            canJoin:
              (verification.status === "claimed" || verification.status === "in_interview") &&
              canJoinScheduledInterview(slot.startsAt, slot.endsAt, now),
            joinOpensAt: joinOpensAt(slot.startsAt) ?? slot.startsAt,
            citizen: citizenOf(await getProfile(verification.userId)),
          }
        }
      }
      slots.push({
        _id: slot._id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status: slot.status,
        booking,
      })
    }

    const waitingRows = await ctx.db
      .query("level3Verification")
      .withIndex("by_status", (q) => q.eq("status", "waiting_controller"))
      .order("asc")
      .take(50)
    const waiting = []
    for (const verification of waitingRows) {
      const track = await documentTrack(ctx, verification)
      waiting.push({
        verificationId: verification._id,
        ref: level3Ref(verification._id),
        requestedAt: verification.requestedAt,
        citizen: citizenOf(track.profile),
        documentStatus: track.status,
        documentsReady: track.ready,
      })
    }

    return { slots, waiting }
  },
})

/**
 * Le contrôleur place une demande en attente sur l'un de SES créneaux libres.
 * Mêmes effets que la réservation par le citoyen : créneau réservé, demande
 * prise en charge, citoyen notifié, rappel planifié la veille.
 */
export const assignSlot = mutation({
  args: {
    verificationId: v.id("level3Verification"),
    slotId: v.id("level3AppointmentSlot"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const verification = await ctx.db.get(args.verificationId)
    if (!verification) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Demande introuvable." })
    }
    if (verification.status !== "waiting_controller") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cette demande a déjà un rendez-vous ou n'est plus active.",
      })
    }
    const slot = await ctx.db.get(args.slotId)
    if (!slot || slot.controllerId !== me.userId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Créneau introuvable." })
    }
    const now = Date.now()
    if (slot.status !== "available" || slot.startsAt < now) {
      throw new ConvexError({ code: "UNAVAILABLE", message: "Ce créneau n'est plus disponible." })
    }
    const track = await documentTrack(ctx, verification)
    if ((track.profile?.loa ?? 1) >= 3) {
      throw new ConvexError({
        code: "ALREADY_VERIFIED",
        message: "Cette personne est déjà vérifiée au Niveau 3.",
      })
    }
    if (!track.ready) {
      throw new ConvexError({
        code: "DOCUMENTS_REQUIRED",
        message: "Les pièces de cette personne ne sont pas encore soumises : l'entretien ne pourrait pas être instruit.",
      })
    }

    await ctx.db.patch(slot._id, {
      status: "booked",
      verificationId: verification._id,
      bookedUserId: verification.userId,
      updatedAt: now,
    })
    await ctx.db.patch(verification._id, {
      status: "claimed",
      controllerId: me.userId,
      handledVia: "controller_app",
      appointmentSlotId: slot._id,
      scheduledAt: slot.startsAt,
      scheduledEndAt: slot.endsAt,
      reminderSentAt: undefined,
      claimedAt: now,
      updatedAt: now,
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: me.userId,
      action: "level3_scheduled",
      targetType: "kyc",
      targetId: verification._id,
      metadata: { scheduledAt: slot.startsAt, controllerId: me.userId, by: "controller" },
    })
    const controllerName = profileName(await profileOf(ctx, me.userId)) || "un contrôleur IDN"
    await ctx.runMutation(internal.notifications.dispatch, {
      userId: verification.userId,
      category: "kyc",
      title: "Entretien Niveau 3 planifié",
      body: `Votre entretien avec ${controllerName} est prévu ${formatLibrevilleAppointment(slot.startsAt)} (heure de Libreville).`,
      metadata: { level3VerificationId: verification._id, scheduledAt: slot.startsAt },
      sendEmail: true,
      pushUrl: "/kyc?target=3",
    })
    const reminderAt = slot.startsAt - LEVEL3_REMINDER_LEAD_MS
    if (reminderAt > now + 60_000) {
      await ctx.scheduler.runAt(reminderAt, internal.level3.scheduling.sendReminder, {
        verificationId: verification._id,
        expectedScheduledAt: slot.startsAt,
      })
    }
    return null
  },
})

/**
 * Annulation d'un rendez-vous par le contrôleur. La demande Niveau 3 n'est
 * PAS close : elle revient en attente de créneau et le citoyen reçoit le
 * motif. Le créneau est retiré (le contrôleur n'est plus disponible) ; s'il
 * l'est à nouveau, il republie une disponibilité.
 */
export const cancelAppointment = mutation({
  args: { verificationId: v.id("level3Verification"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const reason = args.reason.trim()
    if (reason.length < 5) {
      throw new ConvexError({ code: "INVALID", message: "Précisez le motif de l'annulation." })
    }
    const verification = await ctx.db.get(args.verificationId)
    if (!verification || verification.controllerId !== me.userId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Rendez-vous introuvable." })
    }
    if (verification.status !== "claimed") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message:
          verification.status === "in_interview"
            ? "L'entretien a commencé : concluez-le par une décision."
            : "Ce rendez-vous ne peut plus être annulé.",
      })
    }
    const now = Date.now()
    const scheduledAt = verification.scheduledAt
    if (verification.appointmentSlotId) {
      const slot = await ctx.db.get(verification.appointmentSlotId)
      if (slot && slot.verificationId === verification._id) {
        await ctx.db.patch(slot._id, {
          status: "cancelled",
          verificationId: undefined,
          bookedUserId: undefined,
          updatedAt: now,
        })
      }
    }
    await ctx.db.patch(verification._id, {
      status: "waiting_controller",
      controllerId: undefined,
      appointmentSlotId: undefined,
      scheduledAt: undefined,
      scheduledEndAt: undefined,
      reminderSentAt: undefined,
      claimedAt: undefined,
      updatedAt: now,
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: me.userId,
      action: "level3_appointment_cancelled",
      targetType: "kyc",
      targetId: verification._id,
      metadata: { reason, ...(scheduledAt ? { scheduledAt } : {}) },
    })
    await ctx.runMutation(internal.notifications.dispatch, {
      userId: verification.userId,
      category: "kyc",
      title: "Entretien Niveau 3 annulé",
      body: scheduledAt
        ? `Votre entretien du ${formatLibrevilleAppointment(scheduledAt)} est annulé : ${reason}. Choisissez un nouveau créneau depuis votre espace.`
        : `Votre entretien est annulé : ${reason}. Choisissez un nouveau créneau depuis votre espace.`,
      metadata: { level3VerificationId: verification._id },
      sendEmail: true,
      pushUrl: "/kyc?target=3",
    })
    return null
  },
})

/** Dossier présenté dans la salle d'entretien, à côté de la vidéo. */
export const interview = query({
  args: { verificationId: v.id("level3Verification") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("level3Verification"),
      ref: v.string(),
      status: VERIFICATION_STATUS,
      assignedToMe: v.boolean(),
      scheduledAt: v.optional(v.number()),
      scheduledEndAt: v.optional(v.number()),
      canJoin: v.boolean(),
      joinOpensAt: v.optional(v.number()),
      interviewStartedAt: v.optional(v.number()),
      decidedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      entryLoa: v.optional(v.number()),
      citizen: v.object({
        name: v.string(),
        idnId: v.optional(v.string()),
        loa: v.union(v.literal(1), v.literal(2), v.literal(3)),
        declared: v.union(
          v.null(),
          v.object({
            firstName: v.string(),
            lastName: v.string(),
            dateOfBirth: v.string(),
            gender: v.string(),
            birthPlace: v.string(),
            nationality: v.string(),
            nip: v.optional(v.string()),
          }),
        ),
      }),
      documents: v.union(
        v.null(),
        v.object({
          kycRequestId: v.id("kycRequest"),
          documentType: v.string(),
          status: v.string(),
          front: v.union(v.string(), v.null()),
          back: v.union(v.string(), v.null()),
          selfie: v.union(v.string(), v.null()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const verification = await ctx.db.get(args.verificationId)
    if (!verification) return null
    const profile = await profileOf(ctx, verification.userId)
    const kyc = verification.kycRequestId
      ? await ctx.db.get(verification.kycRequestId)
      : await latestKycRow(ctx, verification.userId)
    const pivot = profile?.pivot
    const now = Date.now()
    return {
      _id: verification._id,
      ref: level3Ref(verification._id),
      status: verification.status,
      assignedToMe: verification.controllerId === me.userId,
      scheduledAt: verification.scheduledAt,
      scheduledEndAt: verification.scheduledEndAt,
      canJoin:
        (verification.status === "claimed" || verification.status === "in_interview") &&
        canJoinScheduledInterview(verification.scheduledAt, verification.scheduledEndAt, now),
      joinOpensAt: joinOpensAt(verification.scheduledAt),
      interviewStartedAt: verification.interviewStartedAt,
      decidedAt: verification.decidedAt,
      rejectionReason: verification.rejectionReason,
      entryLoa: verification.entryLoa,
      citizen: {
        ...citizenOf(profile),
        declared: pivot
          ? {
              firstName: pivot.firstName,
              lastName: pivot.lastName,
              dateOfBirth: pivot.dateOfBirth,
              gender: pivot.gender,
              birthPlace: pivot.birthPlace,
              nationality: pivot.nationality,
              nip: pivot.nip,
            }
          : null,
      },
      documents: kyc
        ? {
            kycRequestId: kyc._id,
            documentType: kyc.documentType,
            status: kyc.status,
            front: kyc.documentImages.front ? await ctx.storage.getUrl(kyc.documentImages.front) : null,
            back: kyc.documentImages.back ? await ctx.storage.getUrl(kyc.documentImages.back) : null,
            selfie: kyc.selfieImage ? await ctx.storage.getUrl(kyc.selfieImage) : null,
          }
        : null,
    }
  },
})
