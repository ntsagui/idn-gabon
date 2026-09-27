import { components } from "../_generated/api"
import type { MutationCtx, QueryCtx } from "../_generated/server"

/**
 * Coquilles d'inscription : comptes Better Auth créés par `signUp.email` dont
 * la finalisation (`onboarding.completeSignup`) n'a jamais abouti.
 *
 * POURQUOI ELLES EXISTENT. Les parcours d'inscription (web, mobile, parcours
 * embarqué des partenaires) créent le compte Better Auth AVANT d'appeler
 * `completeSignup` : la mutation est authentifiée et a besoin de la session.
 * Quand `completeSignup` refuse (identité déjà vérifiée, NIP déjà rattaché…),
 * la transaction est annulée mais le compte Better Auth, lui, reste. Son mot
 * de passe interne a été jeté, il n'a ni PIN ni profil : personne ne peut s'y
 * connecter, et l'adresse `@idn.ga` choisie est perdue pour tout le monde.
 *
 * Une seule définition de « coquille », partagée par la réparation d'incident
 * (`_dev/repairEmbeddedSignupOrphans`) et l'abandon en libre-service
 * (`onboarding.abandonIncompleteSignup`) : si les deux divergeaient, l'une
 * finirait par supprimer un compte que l'autre juge réel.
 */

export const IDN_DOMAIN = "@idn.ga"

export type BetterAuthUser = {
  _id: string
  email: string
  emailVerified: boolean
  createdAt: number
}

type ReadCtx = Pick<QueryCtx, "db" | "runQuery">

type BetterAuthPage = { page: Array<Record<string, unknown>> }

async function findMany(
  ctx: ReadCtx,
  model:
    | "session"
    | "account"
    | "twoFactor"
    | "oauthApplication"
    | "oauthAccessToken"
    | "oauthConsent",
  userId: string,
): Promise<Array<Record<string, unknown>>> {
  const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model,
    where: [{ field: "userId", value: userId, operator: "eq" }],
    paginationOpts: { numItems: 200, cursor: null },
  })) as BetterAuthPage
  return result.page
}

export async function findBetterAuthUserByEmail(
  ctx: ReadCtx,
  email: string,
): Promise<BetterAuthUser | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", value: email, operator: "eq" }],
  })) as BetterAuthUser | null
}

export async function findBetterAuthUserById(
  ctx: ReadCtx,
  userId: string,
): Promise<BetterAuthUser | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: userId, operator: "eq" }],
  })) as BetterAuthUser | null
}

export type IncompleteSignupInspection = {
  eligible: boolean
  reasons: string[]
  sessionCount: number
  accountCount: number
}

/**
 * Liste les raisons pour lesquelles `user` N'EST PAS une coquille supprimable.
 * Aucune raison = supprimable.
 *
 * `createdWithin` borne la date de création : la réparation d'incident vise
 * une fenêtre passée, l'abandon en libre-service une inscription en cours.
 * Un compte plus ancien peut appartenir à un autre tunnel, historique ou non.
 */
export async function inspectIncompleteSignup(
  ctx: ReadCtx,
  user: BetterAuthUser,
  opts: {
    expectedEmail?: string
    createdWithin: { from: number; to: number }
  },
): Promise<IncompleteSignupInspection> {
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique()
  const roles = await ctx.db
    .query("userRole")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .take(1)
  const targetAudit = await ctx.db
    .query("auditLog")
    .withIndex("by_target", (q) =>
      q.eq("targetType", "user").eq("targetId", user._id),
    )
    .take(20)

  const [
    sessions,
    accounts,
    twoFactors,
    oauthApplications,
    accessTokens,
    consents,
  ] = await Promise.all([
    findMany(ctx, "session", user._id),
    findMany(ctx, "account", user._id),
    findMany(ctx, "twoFactor", user._id),
    findMany(ctx, "oauthApplication", user._id),
    findMany(ctx, "oauthAccessToken", user._id),
    findMany(ctx, "oauthConsent", user._id),
  ])

  const email = user.email.toLowerCase()
  const reasons: string[] = []
  if (!email.endsWith(IDN_DOMAIN)) reasons.push("NOT_IDN_ADDRESS")
  if (opts.expectedEmail !== undefined && email !== opts.expectedEmail) {
    reasons.push("EMAIL_MISMATCH")
  }
  // `completeSignup` vérifie l'adresse dans la même transaction que la
  // création du profil : une adresse vérifiée a donc été finalisée un jour,
  // ou vient de l'ancien tunnel par OTP. Dans les deux cas, pas une coquille.
  if (user.emailVerified) reasons.push("EMAIL_ALREADY_VERIFIED")
  if (
    user.createdAt < opts.createdWithin.from ||
    user.createdAt >= opts.createdWithin.to
  ) {
    reasons.push("OUTSIDE_CREATION_WINDOW")
  }
  if (profile) reasons.push("PROFILE_EXISTS")
  if (roles.length > 0) reasons.push("ROLE_EXISTS")
  if (targetAudit.some((entry) => entry.action === "account_created")) {
    reasons.push("ACCOUNT_CREATED_AUDIT_EXISTS")
  }
  if (accounts.some((account) => account.providerId !== "credential")) {
    reasons.push("NON_CREDENTIAL_ACCOUNT_EXISTS")
  }
  if (twoFactors.length > 0) reasons.push("TWO_FACTOR_EXISTS")
  if (oauthApplications.length > 0) reasons.push("OAUTH_APPLICATION_EXISTS")
  if (accessTokens.length > 0) reasons.push("OAUTH_ACCESS_TOKEN_EXISTS")
  if (consents.length > 0) reasons.push("OAUTH_CONSENT_EXISTS")

  return {
    eligible: reasons.length === 0,
    reasons,
    sessionCount: sessions.length,
    accountCount: accounts.length,
  }
}

/**
 * Supprime une coquille : sessions, comptes, vérifications en attente, puis
 * l'utilisateur Better Auth. À n'appeler qu'après `inspectIncompleteSignup`
 * dans la MÊME transaction — c'est ce qui garantit qu'un profil créé entre
 * les deux ne peut pas être orphelin de son compte.
 */
export async function deleteIncompleteSignup(
  ctx: Pick<MutationCtx, "runMutation">,
  user: Pick<BetterAuthUser, "_id" | "email">,
): Promise<void> {
  for (const model of ["session", "account"] as const) {
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model,
        where: [{ field: "userId", value: user._id, operator: "eq" }],
      },
      paginationOpts: { numItems: 200, cursor: null },
    })
  }
  await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
    input: {
      model: "verification",
      where: [
        { field: "identifier", value: user.email.toLowerCase(), operator: "eq" },
      ],
    },
    paginationOpts: { numItems: 200, cursor: null },
  })
  await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
    input: {
      model: "user",
      where: [{ field: "_id", value: user._id }],
    },
  })
}
