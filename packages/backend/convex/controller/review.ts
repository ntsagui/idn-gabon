import { v } from "convex/values"

import { query } from "../_generated/server"
import { requireController } from "../lib/auth"
import { DUPLICATE_SIGNALS, DUPLICATE_SIGNAL_STATUSES, KYC_STATUSES } from "../schema"
import { kycRef, level3Ref, profileCache, profileName } from "./helpers"

/**
 * Espace contrôleur — dossier complet d'une demande KYC pour l'examen.
 *
 * Complète `controller/queue.getForReview` (statut, pièces, scores) de ce
 * dont la décision a besoin : données déclarées face aux données lues sur la
 * pièce, signaux de doublon, demandes antérieures du même compte, lien avec
 * un parcours Niveau 3 et historique du dossier. Les décisions restent
 * celles de `controller/queue` (approve / requestComplement / reject), dont
 * les gardes d'intégrité sont testées.
 */

const STATUS = v.union(...KYC_STATUSES.map((s) => v.literal(s)))

const TIMELINE_LABELS: Record<string, string> = {
  kyc_submitted: "Pièces déposées par le citoyen",
  kyc_under_review: "Dossier placé en revue manuelle",
  kyc_complement_requested: "Complément demandé au citoyen",
  kyc_complement_provided: "Complément fourni par le citoyen",
  kyc_approved: "Dossier approuvé",
  kyc_rejected: "Dossier refusé",
  level3_document_track_opened: "Pièces rattachées à une demande Niveau 3",
}

export const dossier = query({
  args: { kycRequestId: v.id("kycRequest") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("kycRequest"),
      ref: v.string(),
      status: STATUS,
      documentType: v.string(),
      submittedAt: v.optional(v.number()),
      createdAt: v.number(),
      reviewedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      complementRequest: v.optional(
        v.object({ message: v.string(), requestedAt: v.number(), requestedBy: v.string() }),
      ),
      reviewer: v.union(
        v.null(),
        v.object({ name: v.string(), isMe: v.boolean() }),
      ),
      images: v.object({
        front: v.union(v.string(), v.null()),
        back: v.union(v.string(), v.null()),
        selfie: v.union(v.string(), v.null()),
      }),
      analysis: v.object({
        score: v.optional(v.number()),
        faceMatchScore: v.optional(v.number()),
        livenessVerdict: v.optional(
          v.union(v.literal("real"), v.literal("spoof"), v.literal("uncertain")),
        ),
        ocrAvailable: v.optional(v.boolean()),
        biometricAvailable: v.optional(v.boolean()),
        duplicateFlagged: v.optional(v.boolean()),
      }),
      citizen: v.object({
        idnId: v.optional(v.string()),
        loa: v.union(v.literal(1), v.literal(2), v.literal(3)),
        profileType: v.string(),
        accountCreatedAt: v.optional(v.number()),
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
      extracted: v.union(v.null(), v.record(v.string(), v.string())),
      duplicates: v.array(
        v.object({
          _id: v.id("duplicateSignal"),
          signal: v.union(...DUPLICATE_SIGNALS.map((s) => v.literal(s))),
          status: v.union(...DUPLICATE_SIGNAL_STATUSES.map((s) => v.literal(s))),
          score: v.optional(v.number()),
          detectedAt: v.number(),
          matched: v.union(
            v.null(),
            v.object({
              name: v.string(),
              idnId: v.optional(v.string()),
              loa: v.optional(v.number()),
            }),
          ),
        }),
      ),
      previousRequests: v.array(
        v.object({
          _id: v.id("kycRequest"),
          ref: v.string(),
          status: STATUS,
          documentType: v.string(),
          at: v.number(),
          rejectionReason: v.optional(v.string()),
        }),
      ),
      level3: v.union(
        v.null(),
        v.object({
          ref: v.string(),
          status: v.string(),
          scheduledAt: v.optional(v.number()),
        }),
      ),
      timeline: v.array(
        v.object({
          at: v.number(),
          label: v.string(),
          actor: v.string(),
          detail: v.optional(v.string()),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) return null
    const profileOf = profileCache(ctx)
    const profile = await profileOf(kyc.userId)

    const [front, back, selfie] = await Promise.all([
      kyc.documentImages.front ? ctx.storage.getUrl(kyc.documentImages.front) : null,
      kyc.documentImages.back ? ctx.storage.getUrl(kyc.documentImages.back) : null,
      kyc.selfieImage ? ctx.storage.getUrl(kyc.selfieImage) : null,
    ])

    let reviewer: { name: string; isMe: boolean } | null = null
    if (kyc.reviewerId) {
      const isMe = kyc.reviewerId === me.userId
      reviewer = {
        isMe,
        name: isMe ? "vous" : profileName(await profileOf(kyc.reviewerId)) || "un autre contrôleur",
      }
    }

    // Signaux de doublon portant sur ce compte, dossier courant d'abord.
    const signals = await ctx.db
      .query("duplicateSignal")
      .withIndex("by_userId", (q) => q.eq("userId", kyc.userId))
      .order("desc")
      .take(20)
    const duplicates = []
    for (const signal of signals) {
      const matchedProfile = signal.matchedUserId ? await profileOf(signal.matchedUserId) : null
      duplicates.push({
        _id: signal._id,
        signal: signal.signal,
        status: signal.status,
        score: signal.score,
        detectedAt: signal.detectedAt,
        matched: matchedProfile
          ? {
              name: profileName(matchedProfile) || "Compte sans identité déclarée",
              idnId: matchedProfile.idnId,
              loa: matchedProfile.loa,
            }
          : null,
      })
    }

    const others = await ctx.db
      .query("kycRequest")
      .withIndex("by_userId", (q) => q.eq("userId", kyc.userId))
      .order("desc")
      .take(10)
    const previousRequests = others
      .filter((row) => row._id !== kyc._id)
      .map((row) => ({
        _id: row._id,
        ref: kycRef(row._id),
        status: row.status,
        documentType: row.documentType,
        at: row.submittedAt ?? row.createdAt,
        rejectionReason: row.rejectionReason,
      }))

    const level3Rows = await ctx.db
      .query("level3Verification")
      .withIndex("by_userId", (q) => q.eq("userId", kyc.userId))
      .order("desc")
      .take(5)
    const linked = level3Rows.find((row) => row.kycRequestId === kyc._id)

    const audit = await ctx.db
      .query("auditLog")
      .withIndex("by_target", (q) => q.eq("targetType", "kyc").eq("targetId", kyc._id))
      .order("asc")
      .take(50)
    const timeline = []
    for (const entry of audit) {
      const label = TIMELINE_LABELS[entry.action]
      if (!label) continue
      const meta = (entry.metadata ?? {}) as Record<string, unknown>
      let actor = "Système"
      if (entry.actorId === kyc.userId) actor = "Citoyen"
      else if (entry.actorId === me.userId) actor = "Vous"
      else if (entry.actorId) actor = profileName(await profileOf(entry.actorId)) || "Contrôleur"
      if (entry.action === "kyc_approved" && meta.auto === true) actor = "Analyse automatique"
      const detail =
        typeof meta.reason === "string"
          ? meta.reason
          : typeof meta.message === "string"
            ? meta.message
            : meta.method === "level3_fused"
              ? "Pièces constatées pendant l'entretien Niveau 3"
              : undefined
      timeline.push({ at: entry.createdAt, label, actor, detail })
    }

    const pivot = profile?.pivot
    return {
      _id: kyc._id,
      ref: kycRef(kyc._id),
      status: kyc.status,
      documentType: kyc.documentType,
      submittedAt: kyc.submittedAt,
      createdAt: kyc.createdAt,
      reviewedAt: kyc.reviewedAt,
      rejectionReason: kyc.rejectionReason,
      complementRequest: kyc.complementRequest,
      reviewer,
      images: { front, back, selfie },
      analysis: {
        score: kyc.score,
        faceMatchScore: kyc.faceMatchScore,
        livenessVerdict: kyc.livenessVerdict,
        ocrAvailable: kyc.ocrAvailable,
        biometricAvailable: kyc.biometricAvailable,
        duplicateFlagged: kyc.duplicateFlagged,
      },
      citizen: {
        idnId: profile?.idnId,
        loa: profile?.loa ?? 1,
        profileType: profile?.profileType ?? "citizen",
        accountCreatedAt: profile?.createdAt,
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
      extracted: kyc.extractedFields ?? null,
      duplicates,
      previousRequests,
      level3: linked
        ? { ref: level3Ref(linked._id), status: linked.status, scheduledAt: linked.scheduledAt }
        : null,
      timeline,
    }
  },
})
