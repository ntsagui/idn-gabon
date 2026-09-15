import { ConvexError, v } from "convex/values"

import { components, internal } from "./_generated/api"
import { action, type MutationCtx } from "./_generated/server"
import { internalMutation, mutation } from "./functions"
import {
  BirdVerifyError,
  checkBirdSmsCode,
  sendBirdSmsCode,
} from "./lib/birdVerify"
import {
  constantTimeEqual,
  derivePinHash,
  hashOpaqueSecret,
  PIN_REGEX,
} from "./lib/pin"
import {
  ADMIN_PIN_CODE_MAX_ATTEMPTS,
  hashAdminPinCode,
} from "./lib/pinRecoveryCode"
import { assessAutomaticSmsRecovery } from "./lib/pinRecoveryEligibility"
import { rateLimiter } from "./rateLimiter"

const IDN_DOMAIN = "@idn.ga"
const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const CODE_REGEX = /^\d{6}$/
const CODE_TTL_MS = 10 * 60 * 1000
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000
const MAX_LOCAL_ATTEMPTS = 5

type PreparedReset = {
  phone: string | null
  expiresAt: number
}

type VerificationAttempt = {
  phone: string
}

/**
 * Démarre une demande sans révéler si l'identifiant, le profil ou le numéro
 * existent. La forme de la réponse reste identique dans tous ces cas.
 */
export const requestReset = action({
  args: { identifier: v.string() },
  returns: v.object({ requestId: v.string(), expiresAt: v.number() }),
  handler: async (
    ctx,
    args,
  ): Promise<{ requestId: string; expiresAt: number }> => {
    const email = normalizeIdnEmail(args.identifier)
    const requestId = crypto.randomUUID()
    const expiresAt = Date.now() + CODE_TTL_MS
    const prepared: PreparedReset = await ctx.runMutation(
      internal.pinRecovery.prepareReset,
      { email, requestId, expiresAt },
    )

    if (prepared.phone) {
      try {
        const sent = await sendBirdSmsCode(prepared.phone, requestId)
        await ctx.runMutation(internal.pinRecovery.markSent, {
          requestId,
          birdExpiresAt: sent.expiresAt ?? undefined,
        })
      } catch (error) {
        console.error("[pin-recovery] SMS delivery failed", {
          requestId,
          status: error instanceof BirdVerifyError ? error.status : null,
        })
      }
    } else {
      // Un digest factice réduit l'écart de travail entre une demande réelle
      // et un identifiant inconnu, sans appeler un service SMS facturable.
      await hashOpaqueSecret(`${requestId}:${email}`)
    }

    return { requestId, expiresAt }
  },
})

/** Vérifie le code Bird et remet un jeton de réinitialisation à usage unique. */
export const verifyCode = action({
  args: { requestId: v.string(), code: v.string() },
  returns: v.object({
    verified: v.boolean(),
    resetToken: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{ verified: boolean; resetToken: string | null }> => {
    if (!CODE_REGEX.test(args.code) || args.requestId.length < 16) {
      return { verified: false, resetToken: null }
    }

    const attempt: VerificationAttempt | null = await ctx.runMutation(
      internal.pinRecovery.takeVerificationAttempt,
      { requestId: args.requestId },
    )
    if (!attempt) {
      await hashOpaqueSecret(`${args.requestId}:${args.code}`)
      return { verified: false, resetToken: null }
    }

    try {
      const codeFingerprint = await hashOpaqueSecret(args.code)
      const result = await checkBirdSmsCode(
        attempt.phone,
        args.code,
        `idn-pin-check-${args.requestId}-${codeFingerprint.slice(0, 16)}`,
      )
      if (!result.success) {
        return { verified: false, resetToken: null }
      }

      const resetToken = randomOpaqueToken()
      const resetTokenHash = await hashOpaqueSecret(resetToken)
      const issued: boolean = await ctx.runMutation(
        internal.pinRecovery.issueResetToken,
        {
          requestId: args.requestId,
          resetTokenHash,
          resetTokenExpiresAt: Date.now() + RESET_TOKEN_TTL_MS,
        },
      )
      return issued
        ? { verified: true, resetToken }
        : { verified: false, resetToken: null }
    } catch (error) {
      console.error("[pin-recovery] SMS check failed", {
        requestId: args.requestId,
        status: error instanceof BirdVerifyError ? error.status : null,
      })
      return { verified: false, resetToken: null }
    }
  },
})

/**
 * Voie de secours : le code provisoire remis par un agent habilité depuis la
 * console (`admin/accounts.generatePinResetCode`) remplace le SMS quand
 * l'envoi automatique est bloqué (numéro absent ou partagé, registre trop
 * grand…) ou n'arrive pas. Il aboutit au même jeton de réinitialisation que
 * la voie SMS, consommé par `resetPin`.
 *
 * La réponse a la même forme pour un identifiant inconnu, un code jamais
 * émis, périmé, épuisé ou faux : rien n'indique au client lequel de ces cas
 * s'applique. Chaque essai, bon ou mauvais, est décompté sur le code.
 */
export const verifyAdminCode = mutation({
  args: { identifier: v.string(), code: v.string() },
  returns: v.object({
    verified: v.boolean(),
    requestId: v.union(v.string(), v.null()),
    resetToken: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const refused = { verified: false, requestId: null, resetToken: null }
    const email = normalizeIdnEmail(args.identifier)
    if (!CODE_REGEX.test(args.code)) return refused

    // Même quota que la vérification SMS, par identifiant : enchaîner les
    // émissions ne multiplie pas les essais.
    await rateLimiter.limit(ctx, "pinRecoveryVerify", {
      key: await hashOpaqueSecret(`admin-code:${email}`),
      throws: true,
    })

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: email, operator: "eq" }],
    })) as { _id: string } | null
    const challenge = user ? await latestIssuedChallenge(ctx, user._id) : null
    if (
      !user ||
      !challenge ||
      !challenge.codeHash ||
      challenge.expiresAt <= Date.now() ||
      challenge.attempts >= ADMIN_PIN_CODE_MAX_ATTEMPTS
    ) {
      // Travail équivalent à une vraie comparaison.
      await hashOpaqueSecret(`${email}:${args.code}`)
      return refused
    }

    await ctx.db.patch(challenge._id, {
      attempts: challenge.attempts + 1,
      updatedAt: Date.now(),
    })
    const supplied = await hashAdminPinCode(user._id, args.code)
    if (!constantTimeEqual(supplied, challenge.codeHash)) return refused

    const resetToken = randomOpaqueToken()
    const resetTokenExpiresAt = Date.now() + RESET_TOKEN_TTL_MS
    await ctx.db.patch(challenge._id, {
      status: "verified",
      codeHash: undefined,
      resetTokenHash: await hashOpaqueSecret(resetToken),
      resetTokenExpiresAt,
      expiresAt: resetTokenExpiresAt,
      updatedAt: Date.now(),
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user._id,
      action: "otp_verified",
      targetType: "user",
      targetId: user._id,
      metadata: { channel: "admin_code", purpose: "pin_recovery" },
    })
    return { verified: true, requestId: challenge.requestId, resetToken }
  },
})

/** Prépare la ligne opaque et résout le téléphone uniquement côté serveur. */
export const prepareReset = internalMutation({
  args: {
    email: v.string(),
    requestId: v.string(),
    expiresAt: v.number(),
  },
  returns: v.object({
    phone: v.union(v.string(), v.null()),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const limiterKey = await hashOpaqueSecret(args.email)
    await rateLimiter.limit(ctx, "pinRecoverySend", {
      key: limiterKey,
      throws: true,
    })

    const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: args.email, operator: "eq" }],
    })) as { _id: string; emailVerified?: boolean } | null

    const profile = user
      ? await ctx.db
          .query("userProfile")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique()
      : null
    const recovery =
      profile && user
        ? await assessAutomaticSmsRecovery(
            ctx,
            profile,
            user.emailVerified === true,
          )
        : null
    const phone = recovery?.eligible ? recovery.phone : null
    const now = Date.now()

    await ctx.db.insert("pinRecoveryChallenge", {
      requestId: args.requestId,
      ...(phone && user ? { userId: user._id, phone } : {}),
      status: "pending",
      attempts: 0,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    return { phone, expiresAt: args.expiresAt }
  },
})

export const markSent = internalMutation({
  args: {
    requestId: v.string(),
    birdExpiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    if (!challenge || challenge.status !== "pending" || !challenge.userId) {
      return null
    }

    const expiresAt =
      args.birdExpiresAt && args.birdExpiresAt > Date.now()
        ? args.birdExpiresAt
        : challenge.expiresAt
    await ctx.db.patch(challenge._id, {
      status: "sent",
      expiresAt,
      updatedAt: Date.now(),
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: challenge.userId,
      action: "otp_sent",
      targetType: "user",
      targetId: challenge.userId,
      metadata: { channel: "sms", purpose: "pin_recovery" },
    })
    return null
  },
})

export const takeVerificationAttempt = internalMutation({
  args: { requestId: v.string() },
  returns: v.union(v.object({ phone: v.string() }), v.null()),
  handler: async (ctx, args) => {
    const limiterKey = await hashOpaqueSecret(args.requestId)
    await rateLimiter.limit(ctx, "pinRecoveryVerify", {
      key: limiterKey,
      throws: true,
    })

    const challenge = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    if (
      !challenge ||
      challenge.status !== "sent" ||
      !challenge.phone ||
      challenge.expiresAt <= Date.now() ||
      challenge.attempts >= MAX_LOCAL_ATTEMPTS
    ) {
      return null
    }

    await ctx.db.patch(challenge._id, {
      attempts: challenge.attempts + 1,
      updatedAt: Date.now(),
    })
    return { phone: challenge.phone }
  },
})

export const issueResetToken = internalMutation({
  args: {
    requestId: v.string(),
    resetTokenHash: v.string(),
    resetTokenExpiresAt: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const challenge = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    if (
      !challenge ||
      challenge.status !== "sent" ||
      !challenge.userId ||
      challenge.expiresAt <= Date.now()
    ) {
      return false
    }

    await ctx.db.patch(challenge._id, {
      status: "verified",
      resetTokenHash: args.resetTokenHash,
      resetTokenExpiresAt: args.resetTokenExpiresAt,
      expiresAt: args.resetTokenExpiresAt,
      updatedAt: Date.now(),
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: challenge.userId,
      action: "otp_verified",
      targetType: "user",
      targetId: challenge.userId,
      metadata: { channel: "sms", purpose: "pin_recovery" },
    })
    return true
  },
})

/** Remplace le PIN, consomme le jeton et ferme toutes les sessions existantes. */
export const resetPin = mutation({
  args: {
    requestId: v.string(),
    resetToken: v.string(),
    newPin: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!PIN_REGEX.test(args.newPin)) {
      throw new ConvexError({
        code: "INVALID_PIN",
        message: "Le PIN doit contenir exactement 6 chiffres.",
      })
    }

    const challenge = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .unique()
    const suppliedTokenHash = await hashOpaqueSecret(args.resetToken)
    if (
      !challenge ||
      challenge.status !== "verified" ||
      !challenge.userId ||
      !challenge.resetTokenHash ||
      !challenge.resetTokenExpiresAt ||
      challenge.resetTokenExpiresAt <= Date.now() ||
      !constantTimeEqual(suppliedTokenHash, challenge.resetTokenHash)
    ) {
      throw new ConvexError({
        code: "INVALID_RESET_TOKEN",
        message: "Cette demande a expiré. Recommencez la récupération.",
      })
    }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", challenge.userId!))
      .unique()
    if (!profile || profile.deletedAt) {
      throw new ConvexError({
        code: "INVALID_RESET_TOKEN",
        message: "Cette demande a expiré. Recommencez la récupération.",
      })
    }

    const pinHash = await derivePinHash(args.newPin, challenge.userId)
    if (pinHash === profile.pinHash) {
      throw new ConvexError({
        code: "SAME_PIN",
        message: "Choisissez un PIN différent de l'ancien.",
      })
    }

    const sessions = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "session",
        where: [{ field: "userId", value: challenge.userId, operator: "eq" }],
        paginationOpts: { numItems: 200, cursor: null },
      },
    )) as { page: Array<{ _id: string }> }
    for (const session of sessions.page) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "session",
          where: [{ field: "_id", value: session._id, operator: "eq" }],
        },
      })
    }

    await ctx.db.patch(profile._id, { pinHash, updatedAt: Date.now() })
    // Un PIN modifié ferme toutes les demandes en cours du compte, celle-ci
    // comprise : un code provisoire encore valable après coup serait une
    // seconde porte d'entrée.
    const pending = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_userId", (q) => q.eq("userId", challenge.userId!))
      .take(50)
    for (const row of pending) {
      await ctx.db.delete(row._id)
    }
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: challenge.userId,
      action: "pin_changed",
      targetType: "user",
      targetId: challenge.userId,
      metadata: {
        method:
          challenge.channel === "admin_code"
            ? "admin_code_recovery"
            : "sms_recovery",
      },
    })
    if (sessions.page.length > 0) {
      await ctx.runMutation(internal.audit.recordAudit, {
        actorId: challenge.userId,
        action: "session_revoked_global",
        targetType: "session",
        targetId: challenge.userId,
        metadata: { reason: "pin_recovery" },
      })
    }
    return null
  },
})

/** Supprime les demandes et numéros éphémères arrivés à expiration. */
export const pruneExpired = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", Date.now()))
      .take(200)
    for (const challenge of expired) {
      await ctx.db.delete(challenge._id)
    }
    return { deleted: expired.length }
  },
})

/** Le code provisoire courant du compte : une émission remplace la précédente. */
async function latestIssuedChallenge(
  ctx: Pick<MutationCtx, "db">,
  userId: string,
) {
  const rows = await ctx.db
    .query("pinRecoveryChallenge")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(50)
  return rows
    .filter((row) => row.status === "issued")
    .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
}

function normalizeIdnEmail(identifier: string): string {
  const raw = identifier.trim().toLowerCase()
  const handle = raw.endsWith(IDN_DOMAIN)
    ? raw.slice(0, -IDN_DOMAIN.length)
    : raw
  if (handle.length < 3 || handle.length > 32 || !HANDLE_REGEX.test(handle)) {
    throw new ConvexError({
      code: "INVALID_IDENTIFIER",
      message: "Saisissez un identifiant IDN valide.",
    })
  }
  return `${handle}${IDN_DOMAIN}`
}

function randomOpaqueToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
