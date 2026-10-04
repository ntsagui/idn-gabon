import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { mutation } from "../functions"
import { KYC_STATUSES } from "../schema"
import { requireController } from "../lib/auth"

/**
 * Espace contrôleur — file de demandes KYC (§3.10 onglet 1).
 * MFA obligatoire (vérifiée au niveau Better Auth twoFactor).
 */

const PRIORITY_THRESHOLD_MS = 60 * 60 * 1000 // > 1h en attente → "haute"
const TARGET_LOA = 2 as const // KYC L2 — cf. workflow approveAuto

/**
 * Plafond de parcours d'une page de file. Borne le coût d'une requête :
 * au-delà, `capped` remonte à l'UI qui le dit explicitement au contrôleur
 * plutôt que de tronquer en silence. Si le volume dépasse durablement ce
 * seuil, l'étape suivante est un `searchIndex` sur un champ dénormalisé.
 */
const SCAN_CAP = 500
const MAX_PAGE_SIZE = 50

const kycStatusValidator = v.union(
  ...KYC_STATUSES.map((s) => v.literal(s)),
)

const QUEUE_ITEM = v.object({
  _id: v.id("kycRequest"),
  ref: v.string(),
  name: v.string(),
  documentType: v.string(),
  status: kycStatusValidator,
  targetLoa: v.union(v.literal(1), v.literal(2), v.literal(3)),
  priority: v.union(v.literal("haute"), v.literal("normale")),
  submittedAt: v.optional(v.number()),
  reviewerId: v.optional(v.string()),
})

/**
 * Convertit un Convex ID en référence courte type "KYC-XXX-XXX".
 * Stable (déterministe) — pas un identifiant cryptographique, juste un
 * affichage compact lisible par le contrôleur.
 */
function shortRef(id: string): string {
  const trimmed = id.replace(/[^a-z0-9]/gi, "").toUpperCase()
  const a = trimmed.slice(-6, -3) || "000"
  const b = trimmed.slice(-3) || "000"
  return `KYC-${a}-${b}`
}

/** Minuscules sans accents — « Ndoutoumé » se trouve en tapant « ndoutoume ». */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Variante sans séparateurs : un NIP ou une réf se cherchent avec ou sans espaces/tirets. */
function compact(value: string): string {
  return value.replace(/[\s-]/g, "")
}

/**
 * Ordre de parcours. Les files de travail restent en FIFO — le plus ancien
 * d'abord, c'est l'équité de traitement et le comportement historique. Les
 * statuts terminaux se lisent comme un historique : le plus récent d'abord.
 */
function orderFor(status: string | undefined): "asc" | "desc" {
  return status === "under_review" || status === "complement_required"
    ? "asc"
    : "desc"
}

function toQueueItem(doc: Doc<"kycRequest">, name: string, now: number) {
  const ageMs = now - (doc.submittedAt ?? doc._creationTime)
  return {
    _id: doc._id,
    ref: shortRef(doc._id),
    name,
    documentType: doc.documentType,
    status: doc.status,
    targetLoa: TARGET_LOA,
    priority: (ageMs > PRIORITY_THRESHOLD_MS ? "haute" : "normale") as
      | "haute"
      | "normale",
    submittedAt: doc.submittedAt,
    reviewerId: doc.reviewerId,
  }
}

/**
 * File de demandes paginée, filtrable par statut et cherchable.
 *
 * Un seul parcours borné à `SCAN_CAP` sert à la fois au total affiché
 * (« page X sur Y ») et à la tranche demandée. La jointure `userProfile`
 * — le vrai coût, une lecture par demande — n'a lieu que sur la tranche
 * renvoyée, sauf en recherche où il faut bien lire les noms pour filtrer.
 */
export const listForReview = query({
  args: {
    status: v.optional(kycStatusValidator),
    search: v.optional(v.string()),
    page: v.number(),
    pageSize: v.number(),
  },
  returns: v.object({
    items: v.array(QUEUE_ITEM),
    total: v.number(),
    capped: v.boolean(),
    /** Plafond de parcours, renvoyé pour que l'UI le cite sans le recopier. */
    scanCap: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireController(ctx)

    const status = args.status
    const pageSize = Math.min(Math.max(args.pageSize, 1), MAX_PAGE_SIZE)
    const page = Math.max(args.page, 0)
    const order = orderFor(status)

    const base = status
      ? ctx.db
          .query("kycRequest")
          .withIndex("by_status", (q) => q.eq("status", status))
      : ctx.db.query("kycRequest")
    const scanned = await base.order(order).take(SCAN_CAP + 1)

    const capped = scanned.length > SCAN_CAP
    // L'index ordonne par création de la ligne, pas par dépôt des pièces : un
    // dossier créé tôt mais déposé hier passerait devant un dépôt de 16 jours.
    // L'ancienneté affichée est celle du dépôt, l'ordre doit la suivre.
    const submitted = (doc: Doc<"kycRequest">) => doc.submittedAt ?? doc._creationTime
    const pool = (capped ? scanned.slice(0, SCAN_CAP) : scanned).sort((a, b) =>
      order === "asc" ? submitted(a) - submitted(b) : submitted(b) - submitted(a),
    )
    const now = Date.now()

    const withProfile = async (doc: Doc<"kycRequest">) => {
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", doc.userId))
        .unique()
      return { profile, doc }
    }

    const search = args.search?.trim()
    if (!search) {
      const slice = pool.slice(page * pageSize, page * pageSize + pageSize)
      const items = await Promise.all(
        slice.map(async (doc) => {
          const { profile } = await withProfile(doc)
          const firstName = profile?.pivot?.firstName ?? ""
          const lastName = profile?.pivot?.lastName ?? ""
          return toQueueItem(
            doc,
            [firstName, lastName].filter(Boolean).join(" ") || "—",
            now,
          )
        }),
      )
      return { items, total: pool.length, capped, scanCap: SCAN_CAP }
    }

    // Recherche : nom, prénom, NIP, identifiant IDN, référence KYC.
    // Chaque mot de la requête doit apparaître quelque part — « itoutou berny »
    // trouve autant que « berny itoutou ».
    const tokens = normalize(search).split(/\s+/).filter(Boolean)
    const enriched = await Promise.all(pool.map(withProfile))

    const matched = enriched.filter(({ doc, profile }) => {
      const firstName = profile?.pivot?.firstName ?? ""
      const lastName = profile?.pivot?.lastName ?? ""
      const haystack = normalize(
        [
          firstName,
          lastName,
          profile?.pivot?.nip ?? "",
          profile?.idnId ?? "",
          shortRef(doc._id),
        ]
          .filter(Boolean)
          .join(" "),
      )
      const compactHaystack = compact(haystack)
      return tokens.every(
        (token) =>
          haystack.includes(token) || compactHaystack.includes(compact(token)),
      )
    })

    const items = matched
      .slice(page * pageSize, page * pageSize + pageSize)
      .map(({ doc, profile }) => {
        const firstName = profile?.pivot?.firstName ?? ""
        const lastName = profile?.pivot?.lastName ?? ""
        return toQueueItem(
          doc,
          [firstName, lastName].filter(Boolean).join(" ") || "—",
          now,
        )
      })

    return { items, total: matched.length, capped, scanCap: SCAN_CAP }
  },
})

export const pendingCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    await requireController(ctx)
    const docs = await ctx.db
      .query("kycRequest")
      .withIndex("by_status", (q) => q.eq("status", "under_review"))
      .collect()
    return docs.length
  },
})

/**
 * Détail d'une demande pour le panneau d'examen.
 *
 * Piloté par l'identifiant sélectionné dans la liste. Remplace l'ancienne
 * `myCurrent`, qui devinait le dossier « en cours » en prenant le plus
 * récemment créé parmi ceux déjà réclamés par le contrôleur — donc jamais
 * celui sur lequel on venait de cliquer, la file étant lue en FIFO.
 */
export const getForReview = query({
  args: { kycRequestId: v.id("kycRequest") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("kycRequest"),
      ref: v.string(),
      documentType: v.string(),
      status: kycStatusValidator,
      reviewerId: v.optional(v.string()),
      reviewedAt: v.optional(v.number()),
      rejectionReason: v.optional(v.string()),
      complementRequest: v.optional(
        v.object({
          message: v.string(),
          requestedAt: v.number(),
          requestedBy: v.string(),
        }),
      ),
      docFrontUrl: v.union(v.string(), v.null()),
      docBackUrl: v.union(v.string(), v.null()),
      selfieUrl: v.union(v.string(), v.null()),
      score: v.optional(v.number()),
      faceMatchScore: v.optional(v.number()),
      livenessVerdict: v.optional(
        v.union(v.literal("real"), v.literal("spoof"), v.literal("uncertain")),
      ),
      ocrAvailable: v.optional(v.boolean()),
      biometricAvailable: v.optional(v.boolean()),
      /**
       * Le dossier a été retenu parce que le visage ou la pièce sont déjà
       * rattachés à un autre compte. Le contrôleur doit le voir : approuver à
       * la main sans le savoir annulerait la détection.
       */
      duplicateFlagged: v.optional(v.boolean()),
      /** `true` si le dossier est réclamé par un AUTRE contrôleur. */
      claimedByOther: v.boolean(),
      citizen: v.object({
        firstName: v.string(),
        lastName: v.string(),
        idnId: v.optional(v.string()),
        currentLoa: v.union(v.literal(1), v.literal(2), v.literal(3)),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) return null

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", kyc.userId))
      .unique()

    const docFrontUrl = kyc.documentImages.front
      ? await ctx.storage.getUrl(kyc.documentImages.front)
      : null
    const docBackUrl = kyc.documentImages.back
      ? await ctx.storage.getUrl(kyc.documentImages.back)
      : null
    const selfieUrl = kyc.selfieImage
      ? await ctx.storage.getUrl(kyc.selfieImage)
      : null

    return {
      _id: kyc._id,
      ref: shortRef(kyc._id),
      documentType: kyc.documentType,
      status: kyc.status,
      reviewerId: kyc.reviewerId,
      reviewedAt: kyc.reviewedAt,
      rejectionReason: kyc.rejectionReason,
      complementRequest: kyc.complementRequest,
      docFrontUrl,
      docBackUrl,
      selfieUrl,
      score: kyc.score,
      faceMatchScore: kyc.faceMatchScore,
      livenessVerdict: kyc.livenessVerdict,
      ocrAvailable: kyc.ocrAvailable,
      biometricAvailable: kyc.biometricAvailable,
      duplicateFlagged: kyc.duplicateFlagged,
      claimedByOther: Boolean(kyc.reviewerId && kyc.reviewerId !== me.userId),
      citizen: {
        firstName: profile?.pivot?.firstName ?? "",
        lastName: profile?.pivot?.lastName ?? "",
        idnId: profile?.idnId,
        currentLoa: profile?.loa ?? 1,
      },
    }
  },
})

export const claim = mutation({
  args: { kycRequestId: v.id("kycRequest") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const controller = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) throw new ConvexError({ code: "NOT_FOUND", message: "Demande introuvable." })
    if (kyc.reviewerId && kyc.reviewerId !== controller.userId) {
      throw new ConvexError({
        code: "ALREADY_CLAIMED",
        message: "Demande déjà assignée à un autre contrôleur.",
      })
    }
    // Cohérence d'état : on ne peut « prendre en charge » qu'une demande
    // encore dans la file d'examen — pas une demande déjà tranchée
    // (`approved`/`rejected`) ni pas encore soumise/en attente OCR
    // (`pending`/`submitted`). Inoffensif en soi (`claim` ne change que
    // `reviewerId`), mais évite d'assigner un dossier clos à un contrôleur
    // et prépare le terrain pour les gardes `approve`/`reject` ci-dessous.
    if (kyc.status !== "under_review") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cette demande n'est pas dans la file d'examen.",
      })
    }
    await ctx.db.patch(args.kycRequestId, {
      reviewerId: controller.userId,
      updatedAt: Date.now(),
    })
    return null
  },
})

export const approve = mutation({
  args: {
    kycRequestId: v.id("kycRequest"),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const controller = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) throw new ConvexError({ code: "NOT_FOUND", message: "Demande introuvable." })

    // Garde d'intégrité (four-eyes) : n'autorise l'approbation QUE depuis
    // `under_review` — empêche d'écraser une décision déjà terminale
    // (`approved`/`rejected`) ou d'agir sur une demande pas encore prête
    // (`pending`/`submitted`/`complement_required`). Exige aussi que ce soit
    // BIEN le contrôleur qui a `claim` le dossier (séparation des tâches :
    // l'UI `request-detail.tsx` verrouille les actions dès que
    // `claimedByOther` est vrai — cf. `getForReview`).
    if (kyc.status !== "under_review") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cette demande n'est pas en attente de décision.",
      })
    }
    if (kyc.reviewerId && kyc.reviewerId !== controller.userId) {
      throw new ConvexError({
        code: "NOT_CLAIMED",
        message: "Cette demande est assignée à un autre contrôleur.",
      })
    }

    const now = Date.now()
    await ctx.db.patch(args.kycRequestId, {
      status: "approved",
      reviewerId: controller.userId,
      reviewedAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("kycReview", {
      kycRequestId: args.kycRequestId,
      reviewerId: controller.userId,
      decision: "approved",
      notes: args.notes,
      createdAt: now,
    })

    // Upgrade LoA → 2
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", kyc.userId))
      .unique()
    if (profile) {
      await ctx.db.patch(profile._id, { loa: 2, updatedAt: now })
    }

    // L'empreinte faciale entre en galerie — même effet qu'une approbation
    // automatique. L'oublier ici créerait un angle mort exactement là où il
    // fait le plus de dégâts : les dossiers passés en revue humaine sont ceux
    // qui portent déjà un soupçon.
    await ctx.runMutation(internal.kyc.mutations.activateFaceTemplate, {
      kycRequestId: args.kycRequestId,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: controller.userId,
      action: "kyc_approved",
      targetType: "kyc",
      targetId: args.kycRequestId,
      metadata: { auto: false },
    })
    await ctx.runMutation(internal.notifications.dispatchKyc, {
      userId: kyc.userId,
      kind: "approved",
      kycRequestId: args.kycRequestId,
    })
    return null
  },
})

export const reject = mutation({
  args: {
    kycRequestId: v.id("kycRequest"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const controller = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) throw new ConvexError({ code: "NOT_FOUND", message: "Demande introuvable." })

    // Même garde d'intégrité que `approve` (four-eyes) — cf. commentaire
    // ci-dessus. Un rejet écrasant un `approved`/`rejected` déjà en place, ou
    // agissant sur une demande pas encore en revue, romprait la même
    // propriété d'intégrité que l'approbation non gardée.
    if (kyc.status !== "under_review") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cette demande n'est pas en attente de décision.",
      })
    }
    if (kyc.reviewerId && kyc.reviewerId !== controller.userId) {
      throw new ConvexError({
        code: "NOT_CLAIMED",
        message: "Cette demande est assignée à un autre contrôleur.",
      })
    }

    if (args.reason.trim().length < 5) {
      throw new ConvexError({
        code: "INVALID",
        message: "Motif de rejet trop court.",
      })
    }
    const now = Date.now()
    await ctx.db.patch(args.kycRequestId, {
      status: "rejected",
      reviewerId: controller.userId,
      reviewedAt: now,
      rejectionReason: args.reason.trim(),
      updatedAt: now,
    })
    await ctx.db.insert("kycReview", {
      kycRequestId: args.kycRequestId,
      reviewerId: controller.userId,
      decision: "rejected",
      notes: args.reason.trim(),
      createdAt: now,
    })
    await ctx.runMutation(internal.kyc.mutations.discardFaceTemplate, {
      kycRequestId: args.kycRequestId,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: controller.userId,
      action: "kyc_rejected",
      targetType: "kyc",
      targetId: args.kycRequestId,
      metadata: { reason: args.reason.trim() },
    })
    await ctx.runMutation(internal.notifications.dispatchKyc, {
      userId: kyc.userId,
      kind: "rejected",
      kycRequestId: args.kycRequestId,
      detail: args.reason.trim(),
    })
    return null
  },
})

export const requestComplement = mutation({
  args: {
    kycRequestId: v.id("kycRequest"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const controller = await requireController(ctx)
    const kyc = await ctx.db.get(args.kycRequestId)
    if (!kyc) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Demande introuvable.",
      })
    }

    // Garde d'état : une demande déjà tranchée (`approved`/`rejected`,
    // terminale) ne doit pas pouvoir être « rouverte » vers
    // `complement_required` — seul un dossier encore `under_review` peut en
    // sortir vers ce statut. Même contrôle de propriété que
    // `approve`/`reject` (four-eyes).
    if (kyc.status !== "under_review") {
      throw new ConvexError({
        code: "INVALID_STATE",
        message: "Cette demande n'est pas en attente de décision.",
      })
    }
    if (kyc.reviewerId && kyc.reviewerId !== controller.userId) {
      throw new ConvexError({
        code: "NOT_CLAIMED",
        message: "Cette demande est assignée à un autre contrôleur.",
      })
    }

    const message = args.message.trim()
    if (message.length < 5) {
      throw new ConvexError({
        code: "INVALID",
        message: "Précisez ce que doit fournir le citoyen (min. 5 caractères).",
      })
    }

    const now = Date.now()
    await ctx.db.patch(args.kycRequestId, {
      status: "complement_required",
      reviewerId: controller.userId,
      complementRequest: {
        message,
        requestedAt: now,
        requestedBy: controller.userId,
      },
      updatedAt: now,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: controller.userId,
      action: "kyc_complement_requested",
      targetType: "kyc",
      targetId: args.kycRequestId,
      metadata: { message },
    })
    await ctx.runMutation(internal.notifications.dispatchKyc, {
      userId: kyc.userId,
      kind: "complement_requested",
      kycRequestId: args.kycRequestId,
      detail: message,
    })
    return null
  },
})
