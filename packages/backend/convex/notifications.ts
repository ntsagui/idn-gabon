import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server"
import { authComponent } from "./auth"
import { requireAuth } from "./lib/auth"
import { NOTIFICATION_CATEGORIES } from "./schema"
import type { Doc } from "./_generated/dataModel"

/**
 * Notifications in-app + email (cf. §3.4 du cahier + ressources/SPECS_FEATURES_CITIZEN.md §4).
 *
 * Deux dispatchers :
 *   • `dispatchKyc` (existant) — templates KYC dédiés.
 *   • `dispatch` (générique) — pour les autres catégories (documents, security…).
 *
 * Côté lecture, l'UI a 4 tabs (Tout / Non lu / Sécurité / Documents) avec
 * regroupement temporel (« Aujourd'hui » / « Hier » / « Plus anciennes »).
 */

// ─────────────────────────────────────────────────────────────────────────
// Constantes / validators partagés
// ─────────────────────────────────────────────────────────────────────────

type Category = (typeof NOTIFICATION_CATEGORIES)[number]

const CATEGORY_VALIDATOR = v.union(
  ...NOTIFICATION_CATEGORIES.map((c) => v.literal(c)),
)

const KYC_KIND = v.union(
  v.literal("complement_requested"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("complement_provided"),
  v.literal("under_review"),
)

const KYC_IN_APP: Record<
  | "complement_requested"
  | "approved"
  | "rejected"
  | "complement_provided"
  | "under_review",
  { title: string; body: (detail: string | null) => string }
> = {
  complement_requested: {
    title: "Complément demandé pour votre vérification",
    body: (msg) =>
      msg
        ? `Le contrôleur a écrit : « ${msg} » — ré-uploadez la pièce concernée depuis votre espace.`
        : "Le contrôleur a besoin d'un complément avant de valider votre demande.",
  },
  approved: {
    title: "Vérification d'identité validée (Niveau 2)",
    body: () =>
      "Votre identité a été vérifiée. Plus de services administratifs sont accessibles depuis votre tableau de bord.",
  },
  rejected: {
    title: "Demande de vérification refusée",
    body: (reason) =>
      reason
        ? `Motif : ${reason}`
        : "Votre demande n'a pas pu être validée. Consultez le détail dans votre espace.",
  },
  complement_provided: {
    title: "Le citoyen a fourni le complément demandé",
    body: () =>
      "La demande est de retour dans votre file d'attente — vous pouvez reprendre l'examen.",
  },
  under_review: {
    title: "Votre vérification d'identité est en cours d'examen",
    body: () =>
      "Les contrôles automatiques n'ont pas permis de conclure : un agent va examiner votre dossier. Aucune action n'est attendue de votre part, vous serez notifié dès qu'une décision sera prise.",
  },
}

// Préférence par défaut quand la catégorie est absente du document
// `notificationPreference` (cas rétro-compat ou nouvelle catégorie).
const DEFAULT_PREF_VALUE: Record<Category, boolean> = {
  security: true,
  kyc: true,
  consent: true,
  comms: true,
  documents: true,
  ai: true,
  cv: true,
  system: true,
}

function getPref(
  prefs: Doc<"notificationPreference"> | null,
  channel: "email" | "inApp",
  category: Category,
): boolean {
  if (!prefs) return DEFAULT_PREF_VALUE[category]
  const matrix = (channel === "email" ? prefs.email : prefs.inApp) as Record<
    string,
    boolean | undefined
  >
  const v = matrix[category]
  return v === undefined ? DEFAULT_PREF_VALUE[category] : v
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatchers internes
// ─────────────────────────────────────────────────────────────────────────

/**
 * Dispatcher KYC historique — conservé pour ne pas casser `kyc.ts`
 * et les workflows existants.
 */
export const dispatchKyc = internalMutation({
  args: {
    userId: v.string(),
    kind: KYC_KIND,
    kycRequestId: v.id("kycRequest"),
    /** Message contrôleur (complement) ou motif (rejet). */
    detail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreference")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique()
    const wantsInApp = getPref(prefs, "inApp", "kyc")
    const wantsEmail = getPref(prefs, "email", "kyc")

    const copy = KYC_IN_APP[args.kind]
    const body = copy.body(args.detail ?? null)
    const now = Date.now()

    if (wantsInApp) {
      await ctx.db.insert("notification", {
        userId: args.userId,
        channel: "in_app",
        category: "kyc",
        title: copy.title,
        body,
        metadata: {
          kycRequestId: args.kycRequestId,
          kind: args.kind,
        },
        createdAt: now,
      })
      if (process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(0, internal.push.deliver.notification, {
          userId: args.userId,
          title: copy.title,
          body,
          url: "/kyc/request",
        })
      }
    }

    if (wantsEmail) {
      const user = await authComponent.getAnyUserById(ctx, args.userId)
      if (user?.email) {
        const recipientName = (user as { name?: string }).name ?? null
        await ctx.scheduler.runAfter(0, internal.email.dispatch.sendKyc, {
          to: user.email,
          kind: args.kind,
          recipientName,
          detail: args.detail ?? null,
        })
      }
    }
    return null
  },
})

/**
 * Dispatcher générique. Insère une ligne in-app (si autorisé par les
 * préférences) et envoie optionnellement un email via `sendGenericEmail`.
 */
export const dispatch = internalMutation({
  args: {
    userId: v.string(),
    category: CATEGORY_VALIDATOR,
    title: v.string(),
    body: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),
    sendEmail: v.optional(v.boolean()),
    emailSubject: v.optional(v.string()), // sinon = title
    /** Destination ouverte au clic sur la notification push. */
    pushUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const prefs = await ctx.db
      .query("notificationPreference")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique()

    const now = Date.now()
    if (getPref(prefs, "inApp", args.category)) {
      await ctx.db.insert("notification", {
        userId: args.userId,
        channel: "in_app",
        category: args.category,
        title: args.title,
        body: args.body,
        metadata: args.metadata,
        createdAt: now,
      })
      if (process.env.NODE_ENV !== "test") {
        await ctx.scheduler.runAfter(0, internal.push.deliver.notification, {
          userId: args.userId,
          title: args.title,
          body: args.body,
          url: args.pushUrl,
        })
      }
    }

    if (args.sendEmail && getPref(prefs, "email", args.category)) {
      const user = await authComponent.getAnyUserById(ctx, args.userId)
      if (user?.email) {
        const recipientName = (user as { name?: string }).name ?? null
        await ctx.scheduler.runAfter(0, internal.email.dispatch.sendGeneric, {
          to: user.email,
          subject: args.emailSubject ?? args.title,
          title: args.title,
          body: args.body,
          recipientName,
        })
      }
    }
    return null
  },
})

// ─────────────────────────────────────────────────────────────────────────
// Queries citoyen
// ─────────────────────────────────────────────────────────────────────────

const NOTIF_OUT = v.object({
  _id: v.id("notification"),
  title: v.string(),
  body: v.string(),
  category: CATEGORY_VALIDATOR,
  metadata: v.optional(v.record(v.string(), v.any())),
  readAt: v.optional(v.number()),
  createdAt: v.number(),
})

const FILTER_VALIDATOR = v.union(
  v.literal("all"),
  v.literal("unread"),
  CATEGORY_VALIDATOR,
)

function applyFilter(
  notif: Doc<"notification">,
  filter: "all" | "unread" | Category,
): boolean {
  if (filter === "all") return true
  if (filter === "unread") return !notif.readAt
  return notif.category === filter
}

function serializeNotif(d: Doc<"notification">) {
  return {
    _id: d._id,
    title: d.title,
    body: d.body,
    category: d.category,
    metadata: d.metadata,
    readAt: d.readAt,
    createdAt: d.createdAt,
  }
}

export const listMine = query({
  args: {
    limit: v.optional(v.number()),
    filter: v.optional(FILTER_VALIDATOR),
  },
  returns: v.array(NOTIF_OUT),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const limit = Math.min(args.limit ?? 50, 200)
    const filter = args.filter ?? "all"

    // On lit en `desc` puis on filtre côté JS — bornage par `limit` après filtre
    // pour éviter une lecture trop large. Acceptable pour V1 (par user, <few hundred).
    const docs = await ctx.db
      .query("notification")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .order("desc")
      .take(limit * 3) // marge pour absorber les filtrés (deletedAt, filter)
    const visible = docs.filter(
      (d) => d.deletedAt === undefined && applyFilter(d, filter),
    )
    return visible.slice(0, limit).map(serializeNotif)
  },
})

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    // Lecture bornée — on s'attend à peu d'éléments unread par user.
    const docs = await ctx.db
      .query("notification")
      .withIndex("by_userId_unread", (q) =>
        q.eq("userId", user.userId).eq("readAt", undefined),
      )
      .take(200)
    return docs.filter((d) => d.deletedAt === undefined).length
  },
})

const GROUPED_OUT = v.object({
  today: v.array(NOTIF_OUT),
  yesterday: v.array(NOTIF_OUT),
  earlier: v.array(NOTIF_OUT),
})

function startOfLocalDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export const groupedByDate = query({
  args: {
    limit: v.optional(v.number()),
    filter: v.optional(FILTER_VALIDATOR),
  },
  returns: GROUPED_OUT,
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const limit = Math.min(args.limit ?? 50, 200)
    const filter = args.filter ?? "all"

    const docs = await ctx.db
      .query("notification")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .order("desc")
      .take(limit * 3)
    const visible = docs
      .filter((d) => d.deletedAt === undefined && applyFilter(d, filter))
      .slice(0, limit)

    const now = Date.now()
    const todayStart = startOfLocalDay(now)
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

    const today: Doc<"notification">[] = []
    const yesterday: Doc<"notification">[] = []
    const earlier: Doc<"notification">[] = []
    for (const d of visible) {
      if (d.createdAt >= todayStart) today.push(d)
      else if (d.createdAt >= yesterdayStart) yesterday.push(d)
      else earlier.push(d)
    }
    return {
      today: today.map(serializeNotif),
      yesterday: yesterday.map(serializeNotif),
      earlier: earlier.map(serializeNotif),
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────
// Mutations citoyen
// ─────────────────────────────────────────────────────────────────────────

export const markAllRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    const docs = await ctx.db
      .query("notification")
      .withIndex("by_userId_unread", (q) =>
        q.eq("userId", user.userId).eq("readAt", undefined),
      )
      .take(500)
    const now = Date.now()
    for (const d of docs) {
      if (d.deletedAt === undefined) {
        await ctx.db.patch(d._id, { readAt: now })
      }
    }
    return null
  },
})

export const markRead = mutation({
  args: { notificationId: v.id("notification") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const notif = await ctx.db.get(args.notificationId)
    if (!notif || notif.userId !== user.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Notification introuvable.",
      })
    }
    if (!notif.readAt) {
      await ctx.db.patch(args.notificationId, { readAt: Date.now() })
    }
    return null
  },
})

// ─────────────────────────────────────────────────────────────────────────
// Effacement en masse (« Tout effacer »)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Nombre de notifications visitées (lues, et soft-deletées si besoin) par
 * transaction. Aligné sur `markAllRead` (500) : loin des plafonds Convex
 * (8 192 documents écrits, 16 384 lus, 1 s de calcul), et suffisant pour
 * servir la quasi-totalité des citoyens en une seule passe.
 */
const CLEAR_BATCH = 500

/**
 * Soft-delete un lot de notifications du citoyen `userId`, du plus récent
 * au plus ancien — ce que l'écran affiche disparaît dès la première passe —
 * en repartant de la borne `before` (exclue) si elle est fournie.
 *
 * POURQUOI UN FLUX (`for await`) ET PAS `.paginate()` : Convex n'autorise
 * qu'un seul appel paginé par exécution de fonction (erreur backend
 * `MultiplePaginatedDatabaseQueries`, rendue « Server Error » côté client).
 * La première version bouclait sur `.paginate({ numItems: 200 })` : dès
 * qu'un citoyen dépassait 200 notifications, la deuxième page levait
 * l'erreur et « Tout effacer » échouait — précisément pour les comptes qui
 * en avaient le plus besoin. Même correctif que `admin/duplicates.ts`.
 *
 * POURQUOI UN PLAFOND ET UNE BORNE : une mutation est une transaction aux
 * limites finies (documents lus et écrits, temps de calcul). On s'arrête
 * donc après `CLEAR_BATCH` documents et on rend la borne `createdAt` d'où
 * la passe suivante reprendra — l'index `by_userId` est trié par
 * `createdAt`, donc sans relire ce qui est déjà traité. L'arrêt se fait sur
 * un changement de `createdAt` : deux notifications émises à la même
 * milliseconde ne doivent pas être séparées par une borne stricte, sinon la
 * seconde échapperait à la passe suivante.
 *
 * @returns la borne (exclue) de la passe suivante, ou `null` si tout est
 *   effacé.
 */
async function clearBatch(
  ctx: MutationCtx,
  userId: string,
  deletedAt: number,
  before?: number,
): Promise<number | null> {
  const stream = ctx.db
    .query("notification")
    .withIndex("by_userId", (q) => {
      const mine = q.eq("userId", userId)
      return before === undefined ? mine : mine.lt("createdAt", before)
    })
    .order("desc")

  let visited = 0
  let lastCreatedAt: number | null = null
  for await (const d of stream) {
    if (visited >= CLEAR_BATCH && d.createdAt !== lastCreatedAt) {
      return lastCreatedAt
    }
    visited++
    lastCreatedAt = d.createdAt
    // Idempotent : une notification déjà effacée garde sa date d'effacement.
    if (d.deletedAt === undefined) {
      await ctx.db.patch(d._id, { deletedAt })
    }
  }
  return null
}

/**
 * Soft-delete toutes les notifications du citoyen courant. Utilisé par
 * le bouton « Tout effacer » du centre de notifications.
 *
 * Le premier lot est traité dans l'appel lui-même — l'écran se vide sans
 * attendre — et le reste, s'il y en a, est confié à `clearAllContinue`
 * (cf. guidelines.md § Query guidelines : lots + `scheduler.runAfter(0)`).
 * Une notification arrivée après le clic a un `createdAt` postérieur à la
 * borne : les passes suivantes ne l'effacent pas, le citoyen ne l'a jamais
 * vue.
 */
export const clearAll = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    const deletedAt = Date.now()
    const before = await clearBatch(ctx, user.userId, deletedAt)
    if (before !== null) {
      await ctx.scheduler.runAfter(0, internal.notifications.clearAllContinue, {
        userId: user.userId,
        deletedAt,
        before,
      })
    }
    return null
  },
})

/**
 * Suite de `clearAll` au-delà du premier lot : se replanifie tant qu'il
 * reste des notifications. Interne — `userId` vient de l'appel authentifié
 * initial, jamais du client — et `deletedAt` est propagé pour que tout ce
 * qu'un même clic efface porte la même date.
 */
export const clearAllContinue = internalMutation({
  args: {
    userId: v.string(),
    deletedAt: v.number(),
    before: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const before = await clearBatch(
      ctx,
      args.userId,
      args.deletedAt,
      args.before,
    )
    if (before !== null) {
      await ctx.scheduler.runAfter(0, internal.notifications.clearAllContinue, {
        ...args,
        before,
      })
    }
    return null
  },
})
