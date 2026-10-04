import { v } from "convex/values"

import type { Doc } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { requireController } from "../lib/auth"
import { kycRef, level3Ref, profileCache, profileName } from "./helpers"
import { formatVerificationCode } from "./officialActModel"

/**
 * Espace contrôleur — historique des contrôles, filtrable et exportable.
 *
 * Lit le journal d'audit (append-only) des actions dont le contrôleur
 * courant est l'auteur : décisions KYC, entretiens Niveau 3, agenda,
 * contrôles terrain et vérifications d'actes. La même réponse alimente le
 * tableau et l'export CSV : ce qui est exporté est exactement ce qui est
 * affiché avec les mêmes filtres.
 */

export const ACTIVITY_TYPES = ["kyc", "level3", "agenda", "scan", "signature"] as const
export const ACTIVITY_OUTCOMES = ["approved", "complement", "rejected", "info"] as const

type ActivityType = (typeof ACTIVITY_TYPES)[number]
type ActivityOutcome = (typeof ACTIVITY_OUTCOMES)[number]

const SCAN_LIMIT = 3000
const RESULT_LIMIT = 1000

const ROW = v.object({
  _id: v.id("auditLog"),
  at: v.number(),
  type: v.union(...ACTIVITY_TYPES.map((t) => v.literal(t))),
  outcome: v.union(...ACTIVITY_OUTCOMES.map((o) => v.literal(o))),
  label: v.string(),
  subject: v.string(),
  subjectId: v.optional(v.string()),
  reference: v.string(),
  location: v.optional(v.string()),
  detail: v.optional(v.string()),
  kycRequestId: v.optional(v.id("kycRequest")),
  verificationId: v.optional(v.id("level3Verification")),
})

type Classified = { type: ActivityType; outcome: ActivityOutcome; label: string }

const SIGNATURE_LABELS: Record<string, Classified> = {
  valid: { type: "signature", outcome: "approved", label: "Acte authentique" },
  revoked: { type: "signature", outcome: "rejected", label: "Acte révoqué" },
  superseded: { type: "signature", outcome: "rejected", label: "Acte remplacé" },
  unknown: { type: "signature", outcome: "rejected", label: "Code d'acte inconnu" },
}

function classify(entry: Doc<"auditLog">): Classified | null {
  const meta = (entry.metadata ?? {}) as Record<string, unknown>
  switch (entry.action) {
    case "kyc_approved":
      // Effet d'un entretien Niveau 3 validé, déjà inscrit comme tel.
      if (meta.method === "level3_fused") return null
      return { type: "kyc", outcome: "approved", label: "Dossier KYC approuvé" }
    case "kyc_complement_requested":
      return { type: "kyc", outcome: "complement", label: "Complément demandé" }
    case "kyc_rejected":
      return { type: "kyc", outcome: "rejected", label: "Dossier KYC refusé" }
    case "level3_interview_started":
      return { type: "level3", outcome: "info", label: "Entretien vidéo ouvert" }
    case "level3_approved":
      return { type: "level3", outcome: "approved", label: "Niveau 3 accordé" }
    case "level3_rejected":
      return { type: "level3", outcome: "rejected", label: "Niveau 3 refusé" }
    case "level3_availability_created":
      return { type: "agenda", outcome: "info", label: "Disponibilité publiée" }
    case "level3_scheduled":
      return { type: "agenda", outcome: "info", label: "Rendez-vous planifié" }
    case "level3_appointment_cancelled":
      return { type: "agenda", outcome: "info", label: "Rendez-vous annulé" }
    case "identity_check_performed":
      return { type: "scan", outcome: "approved", label: "Identité vérifiée sur présentation" }
    case "signature_verified":
      return SIGNATURE_LABELS[String(meta.kind)] ?? null
    default:
      return null
  }
}

export const list = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    type: v.optional(v.union(...ACTIVITY_TYPES.map((t) => v.literal(t)))),
    outcome: v.optional(v.union(...ACTIVITY_OUTCOMES.map((o) => v.literal(o)))),
  },
  returns: v.object({ rows: v.array(ROW), capped: v.boolean() }),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const getProfile = profileCache(ctx)

    const entries = await ctx.db
      .query("auditLog")
      .withIndex("by_actor", (q) => {
        const base = q.eq("actorId", me.userId)
        if (args.from !== undefined && args.to !== undefined) {
          return base.gte("createdAt", args.from).lt("createdAt", args.to)
        }
        if (args.from !== undefined) return base.gte("createdAt", args.from)
        if (args.to !== undefined) return base.lt("createdAt", args.to)
        return base
      })
      .order("desc")
      .take(SCAN_LIMIT)

    const rows = []
    let capped = entries.length === SCAN_LIMIT
    for (const entry of entries) {
      const kind = classify(entry)
      if (!kind) continue
      if (args.type && kind.type !== args.type) continue
      if (args.outcome && kind.outcome !== args.outcome) continue
      if (rows.length >= RESULT_LIMIT) {
        capped = true
        break
      }

      const meta = (entry.metadata ?? {}) as Record<string, unknown>
      const text = (key: string) => (typeof meta[key] === "string" ? (meta[key] as string) : undefined)
      let subject = ""
      let subjectId: string | undefined
      let reference = entry.targetId
      let kycRequestId: Doc<"kycRequest">["_id"] | undefined
      let verificationId: Doc<"level3Verification">["_id"] | undefined
      let detail: string | undefined

      if (kind.type === "kyc") {
        const id = ctx.db.normalizeId("kycRequest", entry.targetId)
        reference = kycRef(entry.targetId)
        if (id) {
          kycRequestId = id
          const kyc = await ctx.db.get(id)
          if (kyc) {
            const profile = await getProfile(kyc.userId)
            subject = profileName(profile)
            subjectId = profile?.idnId
          }
        }
        detail = text("reason") ?? text("message")
      } else if (kind.type === "level3" || (kind.type === "agenda" && entry.action !== "level3_availability_created")) {
        const id = ctx.db.normalizeId("level3Verification", entry.targetId)
        reference = level3Ref(entry.targetId)
        if (id) {
          verificationId = id
          const verification = await ctx.db.get(id)
          if (verification) {
            const profile = await getProfile(verification.userId)
            subject = profileName(profile)
            subjectId = profile?.idnId
          }
        }
        detail = text("reason") ?? text("notes")
        if (!detail && typeof meta.scheduledAt === "number") {
          detail = `Rendez-vous du ${new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Africa/Libreville",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(meta.scheduledAt)}`
        }
      } else if (kind.type === "agenda") {
        reference = "Agenda"
        const slots = typeof meta.slots === "number" ? meta.slots : undefined
        subject = slots ? `${slots} créneau${slots > 1 ? "x" : ""}` : ""
        if (typeof meta.startsAt === "number" && typeof meta.endsAt === "number") {
          const fmt = new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Africa/Libreville",
            dateStyle: "medium",
            timeStyle: "short",
          })
          const end = new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Africa/Libreville",
            timeStyle: "short",
          })
          detail = `${fmt.format(meta.startsAt)} – ${end.format(meta.endsAt)}`
        }
      } else if (kind.type === "scan") {
        subjectId = text("idnId")
        reference = subjectId ?? entry.targetId
        if (subjectId) {
          const profile = await ctx.db
            .query("userProfile")
            .withIndex("by_idnId", (q) => q.eq("idnId", subjectId!))
            .unique()
          subject = profileName(profile)
        }
        if (typeof meta.loa === "number") detail = `Niveau ${meta.loa} présenté`
      } else {
        reference = formatVerificationCode(entry.targetId)
        subject = text("documentNumber") ?? ""
        subjectId = text("issuerName")
        detail = text("typeLabel")
      }

      rows.push({
        _id: entry._id,
        at: entry.createdAt,
        type: kind.type,
        outcome: kind.outcome,
        label: kind.label,
        subject,
        subjectId,
        reference,
        location: text("location"),
        detail,
        kycRequestId,
        verificationId,
      })
    }
    return { rows, capped }
  },
})
