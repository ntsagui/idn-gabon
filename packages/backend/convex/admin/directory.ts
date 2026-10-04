import { v } from "convex/values"

import { components } from "../_generated/api"
import type { Doc } from "../_generated/dataModel"
import { query, type QueryCtx } from "../_generated/server"
import { requireAdmin } from "../lib/auth"
import { normalizeIdentityPart } from "../lib/identity"
import { KYC_STATUSES, PROFILE_TYPES, ROLES } from "../schema"

/**
 * Annuaire des comptes de la console admin : recherche, filtres (niveau,
 * profil, rôle, statut KYC, état du compte), tri et pagination numérotée en
 * une seule query.
 *
 * Même stratégie que `admin/users.listProfiles` : un balayage plafonné de
 * `userProfile` (aucun index ne donne à la fois le nombre de pages, la
 * recherche par nom et la combinaison de filtres). Les tables jointes —
 * `userRole` et `kycRequest` — sont lues une fois et indexées en mémoire.
 * Seule la page affichée est enrichie par Better Auth (email, nom).
 *
 * `truncated` prévient l'interface quand un plafond est atteint : le résultat
 * est alors partiel, et la console le dit au lieu de mentir en silence.
 */

const PROFILE_SCAN_LIMIT = 2000
const KYC_SCAN_LIMIT = 4000
const ROLE_SCAN_LIMIT = 1000

const PROFILE_TYPE = v.union(...PROFILE_TYPES.map((t) => v.literal(t)))
const ROLE = v.union(...ROLES.map((r) => v.literal(r)))
const KYC_STATUS = v.union(...KYC_STATUSES.map((s) => v.literal(s)))

const SORT = v.union(
  v.literal("newest"),
  v.literal("oldest"),
  v.literal("name"),
  v.literal("loa"),
)

const IDN_ID_RE = /^GA-[0-9A-Z]{4}-[0-9A-Z]{4}$/i
const NIP_RE = /^\d{14}$/

type Role = (typeof ROLES)[number]
type KycStatus = (typeof KYC_STATUSES)[number]

const ACCOUNT_ROW = v.object({
  userId: v.string(),
  name: v.optional(v.string()),
  email: v.string(),
  idnId: v.optional(v.string()),
  profileType: PROFILE_TYPE,
  loa: v.number(),
  roles: v.array(ROLE),
  kycStatus: v.union(KYC_STATUS, v.null()),
  deletedAt: v.optional(v.number()),
  createdAt: v.number(),
})

export const listAccounts = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    q: v.optional(v.string()),
    loa: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
    profileType: v.optional(PROFILE_TYPE),
    role: v.optional(v.union(ROLE, v.literal("none"))),
    kycStatus: v.optional(v.union(KYC_STATUS, v.literal("none"))),
    state: v.optional(v.union(v.literal("active"), v.literal("deleted"))),
    sort: v.optional(SORT),
  },
  returns: v.object({
    rows: v.array(ACCOUNT_ROW),
    page: v.number(),
    pageCount: v.number(),
    total: v.number(),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const pageSize = Math.min(Math.max(Math.trunc(args.pageSize), 1), 100)

    const [profiles, roleRows, kycRows] = await Promise.all([
      args.loa !== undefined
        ? ctx.db
            .query("userProfile")
            .withIndex("by_loa", (i) => i.eq("loa", args.loa!))
            .order("desc")
            .take(PROFILE_SCAN_LIMIT)
        : ctx.db.query("userProfile").order("desc").take(PROFILE_SCAN_LIMIT),
      ctx.db.query("userRole").take(ROLE_SCAN_LIMIT),
      ctx.db.query("kycRequest").order("desc").take(KYC_SCAN_LIMIT),
    ])

    const rolesByUser = new Map<string, Role[]>()
    for (const row of roleRows) {
      if (row.revokedAt !== undefined) continue
      const list = rolesByUser.get(row.userId) ?? []
      list.push(row.role)
      rolesByUser.set(row.userId, list)
    }

    // Lecture du plus récent au plus ancien : le premier dossier rencontré
    // pour un compte est son dossier courant.
    const kycByUser = new Map<string, KycStatus>()
    for (const row of kycRows) {
      if (!kycByUser.has(row.userId)) kycByUser.set(row.userId, row.status)
    }

    const emailMatches = await resolveEmailMatches(ctx, args.q)
    const matchesQuery = buildQueryMatcher(args.q, emailMatches)

    const filtered = profiles.filter((p) => {
      if (args.profileType && p.profileType !== args.profileType) return false
      if (args.state === "active" && p.deletedAt !== undefined) return false
      if (args.state === "deleted" && p.deletedAt === undefined) return false
      const roles = rolesByUser.get(p.userId) ?? []
      if (args.role === "none" && roles.length > 0) return false
      if (args.role && args.role !== "none" && !roles.includes(args.role))
        return false
      const kyc = kycByUser.get(p.userId) ?? null
      if (args.kycStatus === "none" && kyc !== null) return false
      if (
        args.kycStatus &&
        args.kycStatus !== "none" &&
        kyc !== args.kycStatus
      )
        return false
      return matchesQuery(p)
    })

    sortProfiles(filtered, args.sort ?? "newest")

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
    const page = Math.min(Math.max(Math.trunc(args.page), 0), pageCount - 1)
    const slice = filtered.slice(page * pageSize, page * pageSize + pageSize)

    const rows = await Promise.all(
      slice.map(async (p) => {
        const user = (await ctx
          .runQuery(components.betterAuth.adapter.findOne, {
            model: "user",
            where: [{ field: "_id", value: p.userId }],
          })
          .catch(() => null)) as { email?: string; name?: string } | null
        const pivotName = p.pivot
          ? `${p.pivot.firstName} ${p.pivot.lastName}`.trim()
          : undefined
        const authName =
          user?.name && user.name !== user.email ? user.name : undefined
        return {
          userId: p.userId,
          name: pivotName || authName,
          email: user?.email ?? "",
          idnId: p.idnId,
          profileType: p.profileType,
          loa: p.loa,
          roles: rolesByUser.get(p.userId) ?? [],
          kycStatus: kycByUser.get(p.userId) ?? null,
          deletedAt: p.deletedAt,
          createdAt: p.createdAt,
        }
      }),
    )

    return {
      rows,
      page,
      pageCount,
      total: filtered.length,
      truncated:
        profiles.length === PROFILE_SCAN_LIMIT ||
        kycRows.length === KYC_SCAN_LIMIT ||
        roleRows.length === ROLE_SCAN_LIMIT,
    }
  },
})

/**
 * Une saisie contenant « @ » vise une adresse : l'email vit côté Better Auth,
 * on résout donc d'abord les comptes correspondants. L'adapter ne gère pas la
 * casse : Better Auth stocke les emails en minuscules.
 */
async function resolveEmailMatches(
  ctx: QueryCtx,
  raw: string | undefined,
): Promise<Set<string> | null> {
  const q = raw?.trim() ?? ""
  if (!q.includes("@")) return null
  const users = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "user",
    where: [{ field: "email", value: q.toLowerCase(), operator: "contains" }],
    paginationOpts: { numItems: 200, cursor: null },
  })) as { page: Array<{ _id: string }> }
  return new Set(users.page.map((u) => u._id))
}

function buildQueryMatcher(
  raw: string | undefined,
  emailMatches: Set<string> | null,
): (p: Doc<"userProfile">) => boolean {
  const q = raw?.trim() ?? ""
  if (q.length < 2) return () => true
  if (emailMatches) return (p) => emailMatches.has(p.userId)
  if (IDN_ID_RE.test(q)) {
    const id = q.toUpperCase()
    return (p) => p.idnId === id
  }
  if (NIP_RE.test(q)) return (p) => p.pivot?.nip === q
  const needle = normalizeIdentityPart(q)
  const upper = q.toUpperCase()
  return (p) => {
    if (p.idnId?.startsWith(upper)) return true
    if (!p.pivot) return false
    return normalizeIdentityPart(
      `${p.pivot.firstName} ${p.pivot.lastName}`,
    ).includes(needle)
  }
}

function sortProfiles(
  rows: Doc<"userProfile">[],
  sort: "newest" | "oldest" | "name" | "loa",
) {
  switch (sort) {
    case "oldest":
      rows.sort((a, b) => a.createdAt - b.createdAt)
      return
    case "loa":
      rows.sort((a, b) => b.loa - a.loa || b.createdAt - a.createdAt)
      return
    case "name": {
      // Les comptes sans identité pivot n'ont pas de nom civil : ils
      // passent après les comptes nommés plutôt que d'être triés sur l'email.
      const key = (p: Doc<"userProfile">) =>
        p.pivot
          ? normalizeIdentityPart(`${p.pivot.lastName} ${p.pivot.firstName}`)
          : null
      rows.sort((a, b) => {
        const ka = key(a)
        const kb = key(b)
        if (ka === null && kb === null) return b.createdAt - a.createdAt
        if (ka === null) return 1
        if (kb === null) return -1
        return ka.localeCompare(kb, "fr")
      })
      return
    }
    default:
      rows.sort((a, b) => b.createdAt - a.createdAt)
  }
}

/**
 * Population du registre, comptée sur la table elle-même — même source et
 * même plafond que `listAccounts`, pour que le compteur de navigation,
 * l'en-tête de page et le total de la liste non filtrée disent le même
 * nombre.
 *
 * POURQUOI PAS L'AGRÉGAT `usersByLoa` : il n'est juste que si chaque écriture
 * de `userProfile` passe par les triggers de `functions.ts`. Une seule
 * écriture hors trigger (script, réparation manuelle) le fait dériver, et la
 * console afficherait alors « 135 comptes » au-dessus d'une liste de 134.
 */
export const countAccounts = query({
  args: {},
  returns: v.object({
    total: v.number(),
    byLoa: v.object({ loa1: v.number(), loa2: v.number(), loa3: v.number() }),
    deleted: v.number(),
    truncated: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx)
    const profiles = await ctx.db.query("userProfile").take(PROFILE_SCAN_LIMIT)
    const byLoa = { loa1: 0, loa2: 0, loa3: 0 }
    let deleted = 0
    for (const p of profiles) {
      if (p.loa === 1) byLoa.loa1++
      else if (p.loa === 2) byLoa.loa2++
      else byLoa.loa3++
      if (p.deletedAt !== undefined) deleted++
    }
    return {
      total: profiles.length,
      byLoa,
      deleted,
      truncated: profiles.length === PROFILE_SCAN_LIMIT,
    }
  },
})

/**
 * Compte sans profil citoyen — typiquement un opérateur créé par
 * `admin/operators.createOperator`, qui n'a qu'un compte Better Auth et des
 * rôles. `users.getProfile` renvoie `null` pour lui ; cette query permet à la
 * fiche de l'afficher (rôles, sessions, historique) au lieu d'une page 404.
 */
export const getAccountBasics = query({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      userId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
      emailVerified: v.boolean(),
      createdAt: v.optional(v.number()),
      roles: v.array(v.object({ role: ROLE, assignedAt: v.number() })),
    }),
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx)
    const user = (await ctx
      .runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "_id", value: args.userId }],
      })
      .catch(() => null)) as {
      email?: string
      name?: string
      emailVerified?: boolean
      createdAt?: number | Date
    } | null
    if (!user) return null
    const roles = await ctx.db
      .query("userRole")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(20)
    const created = user.createdAt
    return {
      userId: args.userId,
      email: user.email ?? "",
      name: user.name && user.name !== user.email ? user.name : undefined,
      emailVerified: user.emailVerified === true,
      createdAt:
        created instanceof Date ? created.getTime() : (created ?? undefined),
      roles: roles
        .filter((r) => r.revokedAt === undefined)
        .map((r) => ({ role: r.role, assignedAt: r.assignedAt })),
    }
  },
})
