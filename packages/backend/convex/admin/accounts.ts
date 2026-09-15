import { ConvexError, v } from "convex/values"

import { components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import {
  action,
  internalQuery,
  type MutationCtx,
  type QueryCtx,
} from "../_generated/server"
import { mutation } from "../functions"
import { requireAdmin } from "../lib/auth"
import {
  ADMIN_PIN_CODE_TTL_MS,
  hashAdminPinCode,
} from "../lib/pinRecoveryCode"
import { signInMethods } from "../lib/signInMethods"

/**
 * Actions sensibles de l'admin sur un compte IDN.
 *
 * Séparé de `admin/users.ts` (lecture seule) pour que la frontière entre
 * consultation et destruction soit lisible d'un coup d'œil.
 *
 * Deux niveaux, volontairement distincts :
 *
 *   • `anonymizeUser` — purge les données personnelles mais laisse vivre le
 *     compte Better Auth. Le handle `@idn.ga` reste réservé, l'email ne peut
 *     pas être réattribué. C'est le mode « vrai citoyen » : réversible côté
 *     état civil, conforme au parcours RGPD §3.4.
 *
 *   • `deleteUserPermanently` — supprime en plus le compte Better Auth et la
 *     ligne `userProfile`. Le handle redevient disponible. C'est le mode
 *     « compte de test / doublon » : irréversible.
 *
 * Dans les deux cas les `auditLog` sont préservés — conservation 5 ans
 * (loi gabonaise 001/2011). Pour le hard delete, l'email et l'IDN sont
 * recopiés dans les métadonnées d'audit AVANT la purge : un journal qui ne
 * dit plus qui a été supprimé ne vaut rien.
 *
 * IMPORTANT : `mutation` est importée depuis `../functions` (et non
 * `_generated/server`) pour que les triggers tiennent les agrégats
 * `usersByLoa` / `usersByProfile` à jour lors du `ctx.db.delete()`. Sans
 * cela le tableau de bord admin dériverait en silence.
 */

const PASSWORD_RESET_CODE_TTL_MS = 15 * 60 * 1000

/**
 * Identifiant interne utilisé par emailOTP@1.6.x pour le parcours
 * `forget-password`. Il faut retirer l'ancien enregistrement avant d'en
 * créer un nouveau : sinon deux codes pourraient coexister et l'adapter ne
 * garantirait pas lequel sera vérifié.
 */
function passwordResetOtpIdentifier(email: string) {
  return `forget-password-otp-${email.toLowerCase()}`
}

/** Même empreinte SHA-256/base64url que `emailOTP({ storeOTP: "hashed" })`. */
async function hashPasswordResetCode(code: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code),
  )
  let binary = ""
  for (const byte of new Uint8Array(digest)) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")
}

/** Tirage uniforme sur 000000–999999 avec l'aléa cryptographique du runtime. */
function generateSixDigitCode() {
  const range = 1_000_000
  const uint32Size = 0x1_0000_0000
  const unbiasedLimit = uint32Size - (uint32Size % range)
  const random = new Uint32Array(1)
  do {
    crypto.getRandomValues(random)
  } while (random[0]! >= unbiasedLimit)
  return String(random[0]! % range).padStart(6, "0")
}

const WRONG_METHOD_MESSAGE = {
  pin: "Ce compte se connecte par mot de passe : utilisez le code provisoire de mot de passe.",
  password:
    "Ce compte se connecte par PIN : utilisez le code provisoire de PIN.",
} as const

/**
 * Garde-fous communs aux deux codes provisoires (mot de passe, PIN) : RBAC,
 * jamais son propre compte, compte existant et non anonymisé, jamais un
 * administrateur, code correspondant au moyen de connexion du compte (cf.
 * `lib/signInMethods.ts`), recopie de l'identifiant affiché. Résout la cible
 * côté serveur sans faire confiance aux informations affichées par le
 * navigateur.
 */
async function resolveRecoveryTarget(
  ctx: QueryCtx | MutationCtx,
  args: { userId: string; confirmIdentifier: string },
  method: "pin" | "password",
) {
  const admin = await requireAdmin(ctx)

  if (args.userId === admin.userId) {
    throw new ConvexError({
      code: "FORBIDDEN_SELF_RECOVERY",
      message:
        "Vous ne pouvez pas générer un code de récupération pour votre propre compte administrateur.",
    })
  }

  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", args.userId))
    .unique()
  if (!profile) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Compte introuvable.",
    })
  }
  if (profile.deletedAt !== undefined) {
    throw new ConvexError({
      code: "ALREADY_ANONYMIZED",
      message: "Un compte anonymisé ne peut pas être récupéré.",
    })
  }

  const roles = await ctx.db
    .query("userRole")
    .withIndex("by_userId", (q) => q.eq("userId", args.userId))
    .take(20)
  if (roles.some((row) => row.role === "admin" && !row.revokedAt)) {
    throw new ConvexError({
      code: "FORBIDDEN_ADMIN_TARGET",
      message:
        "La récupération d'un compte administrateur suit une procédure renforcée.",
    })
  }

  const activeRoles = roles.filter((row) => !row.revokedAt).map((row) => row.role)
  if (!signInMethods(profile.profileType, activeRoles)[method]) {
    throw new ConvexError({
      code: "RECOVERY_METHOD_NOT_USED",
      message: WRONG_METHOD_MESSAGE[method],
    })
  }

  const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: args.userId }],
  })) as { email?: string } | null
  const email = user?.email?.trim().toLowerCase() ?? ""
  if (!email) {
    throw new ConvexError({
      code: "AUTH_ACCOUNT_NOT_FOUND",
      message: "Le compte d'authentification est absent.",
    })
  }

  const expected = profile.idnId ?? email
  if (
    args.confirmIdentifier.trim().toUpperCase() !== expected.toUpperCase()
  ) {
    throw new ConvexError({
      code: "CONFIRMATION_MISMATCH",
      message: "L'identifiant saisi ne correspond pas à ce compte.",
    })
  }

  return { adminId: admin.userId, email, profile }
}

/**
 * Garde serveur appelée depuis l'action de génération.
 *
 * Une action Convex n'a pas accès à `ctx.db`; cette query interne réalise
 * donc l'autorisation RBAC et résout la cible sans faire confiance aux
 * informations affichées par le navigateur.
 */
export const preparePasswordResetCode = internalQuery({
  args: {
    userId: v.string(),
    confirmIdentifier: v.string(),
  },
  returns: v.object({
    adminId: v.string(),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const { adminId, email } = await resolveRecoveryTarget(
      ctx,
      args,
      "password",
    )
    return { adminId, email }
  },
})

/**
 * Génère un code provisoire à six chiffres sans déclencher d'email ni de
 * SMS. Le code emprunte exactement le stockage et la vérification du plugin
 * Better Auth emailOTP : il fonctionne donc dans `/reset-password`, expire
 * après 15 minutes, tolère au plus trois essais et disparaît au premier usage
 * réussi.
 *
 * Le code en clair n'est ni journalisé ni relisible. La réponse de cette
 * action est le seul endroit où l'opérateur peut le copier.
 */
export const generatePasswordResetCode = action({
  args: {
    userId: v.string(),
    confirmIdentifier: v.string(),
  },
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const target: { adminId: string; email: string } = await ctx.runQuery(
      internal.admin.accounts.preparePasswordResetCode,
      args,
    )
    const identifier = passwordResetOtpIdentifier(target.email)

    // Une nouvelle émission invalide immédiatement tout code précédent.
    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: "verification",
        where: [{ field: "identifier", value: identifier, operator: "eq" }],
      },
      paginationOpts: { numItems: 20, cursor: null },
    })

    const code = generateSixDigitCode()
    const now = Date.now()
    const expiresAt = now + PASSWORD_RESET_CODE_TTL_MS
    const codeHash = await hashPasswordResetCode(code)
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "verification",
        data: {
          identifier,
          value: `${codeHash}:0`,
          expiresAt,
          createdAt: now,
          updatedAt: now,
        },
      },
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: target.adminId,
      action: "admin_action",
      targetType: "user",
      targetId: args.userId,
      metadata: {
        kind: "password_reset_code_issued",
        channel: "admin_manual",
        expiresAt,
      },
    })

    return { code, expiresAt }
  },
})

/**
 * Code provisoire pour la récupération du PIN — pendant de
 * `generatePasswordResetCode` quand l'envoi automatique par SMS est bloqué
 * (carte « Récupération du PIN par SMS ») ou n'arrive pas.
 *
 * Contrairement au mot de passe, ce parcours n'appartient pas à Better Auth :
 * le code vit dans `pinRecoveryChallenge` (statut `issued`), sous empreinte
 * salée par l'utilisateur, et `pinRecovery.verifyAdminCode` le convertit en
 * jeton de réinitialisation — le même que la voie SMS, consommé par
 * `pinRecovery.resetPin`. Une nouvelle émission remplace la précédente ; le
 * code en clair n'est ni journalisé ni relisible : la réponse de cette
 * mutation est le seul endroit où l'opérateur peut le copier.
 */
export const generatePinResetCode = mutation({
  args: {
    userId: v.string(),
    confirmIdentifier: v.string(),
  },
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const target = await resolveRecoveryTarget(ctx, args, "pin")
    const now = Date.now()

    const previous = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(50)
    for (const row of previous) {
      if (row.status === "issued") await ctx.db.delete(row._id)
    }

    const code = generateSixDigitCode()
    const expiresAt = now + ADMIN_PIN_CODE_TTL_MS
    await ctx.db.insert("pinRecoveryChallenge", {
      requestId: crypto.randomUUID(),
      userId: args.userId,
      status: "issued",
      channel: "admin_code",
      codeHash: await hashAdminPinCode(args.userId, code),
      issuedBy: target.adminId,
      attempts: 0,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: target.adminId,
      action: "admin_action",
      targetType: "user",
      targetId: args.userId,
      metadata: {
        kind: "pin_reset_code_issued",
        channel: "admin_manual",
        expiresAt,
      },
    })

    return { code, expiresAt }
  },
})

/** Profil résolu + garde-fous passés. */
async function loadTarget(
  ctx: MutationCtx,
  userId: string,
  confirmIdnId: string,
) {
  const admin = await requireAdmin(ctx)

  if (userId === admin.userId) {
    throw new ConvexError({
      code: "FORBIDDEN_SELF_DELETE",
      message: "Vous ne pouvez pas supprimer votre propre compte.",
    })
  }

  const roles = await ctx.db
    .query("userRole")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect()
  if (roles.some((r) => r.role === "admin" && !r.revokedAt)) {
    throw new ConvexError({
      code: "FORBIDDEN_ADMIN_TARGET",
      message:
        "Ce compte porte le rôle administrateur. Retirez-lui ce rôle depuis Rôles & habilitations avant de le supprimer.",
    })
  }

  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (!profile) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Compte introuvable.",
    })
  }

  const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "_id", value: userId }],
  })) as { email?: string } | null
  const email = user?.email ?? ""

  // La modale seule ne suffit pas : l'action est irréversible, on exige la
  // recopie de l'identifiant affiché. À défaut d'IDN (profil incomplet),
  // c'est l'email qui fait foi.
  const expected = profile.idnId ?? email
  if (!expected || confirmIdnId.trim().toUpperCase() !== expected.toUpperCase()) {
    throw new ConvexError({
      code: "CONFIRMATION_MISMATCH",
      message: "L'identifiant saisi ne correspond pas à ce compte.",
    })
  }

  return { admin, profile, email }
}

export const anonymizeUser = mutation({
  args: {
    userId: v.string(),
    confirmIdnId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { admin, profile } = await loadTarget(
      ctx,
      args.userId,
      args.confirmIdnId,
    )

    if (profile.deletedAt) {
      throw new ConvexError({
        code: "ALREADY_ANONYMIZED",
        message: "Ce compte est déjà anonymisé.",
      })
    }

    // Toute la purge vit dans le parcours RGPD — on ne la duplique pas.
    // Différence avec le parcours citoyen : pas de cooldown 30 j, l'action
    // administrative est immédiate et non annulable par le citoyen.
    await ctx.runMutation(internal.privacy.deletion.anonymizeAccount, {
      userId: args.userId,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: admin.userId,
      action: "account_disabled",
      targetType: "user",
      targetId: args.userId,
      metadata: { kind: "admin_anonymize", reason: args.reason },
    })

    return null
  },
})

export const deleteUserPermanently = mutation({
  args: {
    userId: v.string(),
    confirmIdnId: v.string(),
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { admin, profile, email } = await loadTarget(
      ctx,
      args.userId,
      args.confirmIdnId,
    )
    const idnId = profile.idnId

    // 1. Enfants de tables que `purgeUserData` supprime sans purger leur
    //    descendance : les capturer AVANT l'anonymisation, sinon leurs
    //    parents auront disparu et on ne saura plus les retrouver.
    const kycReviewIds: Array<Id<"kycReview">> = []
    const kycRequests = await ctx.db
      .query("kycRequest")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const r of kycRequests) {
      const reviews = await ctx.db
        .query("kycReview")
        .withIndex("by_kycRequest", (q) => q.eq("kycRequestId", r._id))
        .collect()
      kycReviewIds.push(...reviews.map((x) => x._id))
    }

    // 2. Purge applicative + storage + révocation des sessions.
    await ctx.runMutation(internal.privacy.deletion.anonymizeAccount, {
      userId: args.userId,
    })

    for (const id of kycReviewIds) await ctx.db.delete(id)

    // 3. Tables user-scoped qu'`anonymizeAccount` n'atteint pas : elles
    //    survivent volontairement à une anonymisation (le compte existe
    //    encore), mais une suppression définitive qui les laisserait en
    //    place fabriquerait exactement les orphelins qu'elle prétend éviter.
    const apiKeys = await ctx.db
      .query("developerApiKey")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const k of apiKeys) await ctx.db.delete(k._id)

    const signatures = await ctx.db
      .query("documentSignature")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const s of signatures) await ctx.db.delete(s._id)

    const verifications = await ctx.db
      .query("level3Verification")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const verif of verifications) {
      const reviews = await ctx.db
        .query("level3Review")
        .withIndex("by_verificationId", (q) => q.eq("verificationId", verif._id))
        .collect()
      for (const r of reviews) await ctx.db.delete(r._id)
      await ctx.db.delete(verif._id)
    }

    const delegations = await ctx.db
      .query("delegatedIdentity")
      .withIndex("by_targetUserId", (q) => q.eq("targetUserId", args.userId))
      .collect()
    for (const d of delegations) await ctx.db.delete(d._id)

    // 4. La ligne de profil elle-même — via le wrapper à triggers, pour que
    //    les agrégats se décrémentent.
    await ctx.db.delete(profile._id)

    // 5. Better Auth : enfants d'abord, parent ensuite.
    for (const model of [
      "session",
      "account",
      "twoFactor",
      "oauthAccessToken",
      "oauthConsent",
    ] as const) {
      await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
        input: {
          model,
          where: [{ field: "userId", value: args.userId, operator: "eq" }],
        },
        paginationOpts: { numItems: 200, cursor: null },
      })
    }
    await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: args.userId }],
      },
    })

    // 6. Seule trace restante — d'où la recopie de l'email et de l'IDN.
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: admin.userId,
      action: "admin_action",
      targetType: "user",
      targetId: args.userId,
      metadata: {
        kind: "account_hard_deleted",
        email,
        idnId,
        reason: args.reason,
      },
    })

    return null
  },
})
