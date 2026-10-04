import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import { action, type MutationCtx } from "./_generated/server"
import { internalMutation } from "./functions"
import {
  BirdVerifyError,
  checkBirdSmsCode,
  sendBirdSmsCode,
} from "./lib/birdVerify"
import { requireVerifiedAuthInAction } from "./lib/auth"
import { hashOpaqueSecret } from "./lib/pin"
import { normalizeRecoveryPhone } from "./lib/phone"
import {
  isPhoneRegistryReady,
  isPhoneUsedByAnotherProfile,
} from "./lib/phoneRegistry"
import { rateLimiter } from "./rateLimiter"

const CODE_REGEX = /^\d{6}$/
const CODE_TTL_MS = 10 * 60 * 1000
const MAX_LOCAL_ATTEMPTS = 5

type PreparedChange = {
  phone: string
  expiresAt: number
  maskedPhone: string
}

type VerificationAttempt = {
  phone: string
}

/** Envoie un code au nouveau numéro sans modifier le profil. */
export const requestChange = action({
  args: { phone: v.string() },
  returns: v.object({
    requestId: v.string(),
    expiresAt: v.number(),
    maskedPhone: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    requestId: string
    expiresAt: number
    maskedPhone: string
  }> => {
    const user = await requireVerifiedAuthInAction(ctx)
    const requestId = crypto.randomUUID()
    const prepared: PreparedChange = await ctx.runMutation(
      internal.phoneChange.prepareChange,
      {
        userId: user.userId,
        rawPhone: args.phone,
        requestId,
        expiresAt: Date.now() + CODE_TTL_MS,
      },
    )

    try {
      const sent = await sendBirdSmsCode(
        prepared.phone,
        requestId,
        "phone_change",
      )
      await ctx.runMutation(internal.phoneChange.markSent, {
        userId: user.userId,
        requestId,
        birdExpiresAt: sent.expiresAt ?? undefined,
      })
    } catch (error) {
      await ctx.runMutation(internal.phoneChange.discard, {
        userId: user.userId,
        requestId,
      })
      console.error("[phone-change] SMS delivery failed", {
        requestId,
        status: error instanceof BirdVerifyError ? error.status : null,
      })
      throw new ConvexError({
        code: "SMS_DELIVERY_FAILED",
        message: "Le code n'a pas pu être envoyé. Réessayez dans un instant.",
      })
    }

    return {
      requestId,
      expiresAt: prepared.expiresAt,
      maskedPhone: prepared.maskedPhone,
    }
  },
})

/** Vérifie le code Bird puis remplace le numéro dans le profil. */
export const verifyChange = action({
  args: { requestId: v.string(), code: v.string() },
  returns: v.object({
    verified: v.boolean(),
    phone: v.union(v.string(), v.null()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    verified: boolean
    phone: string | null
  }> => {
    const user = await requireVerifiedAuthInAction(ctx)
    if (!CODE_REGEX.test(args.code) || args.requestId.length < 16) {
      return { verified: false, phone: null }
    }

    const attempt: VerificationAttempt | null = await ctx.runMutation(
      internal.phoneChange.takeVerificationAttempt,
      { userId: user.userId, requestId: args.requestId },
    )
    if (!attempt) return { verified: false, phone: null }

    try {
      const codeFingerprint = await hashOpaqueSecret(args.code)
      const result = await checkBirdSmsCode(
        attempt.phone,
        args.code,
        `idn-phone-change-check-${args.requestId}-${codeFingerprint.slice(0, 16)}`,
      )
      if (!result.success) return { verified: false, phone: null }

      const confirmed: boolean = await ctx.runMutation(
        internal.phoneChange.confirmChange,
        { userId: user.userId, requestId: args.requestId },
      )
      return confirmed
        ? { verified: true, phone: attempt.phone }
        : { verified: false, phone: null }
    } catch (error) {
      console.error("[phone-change] SMS check failed", {
        requestId: args.requestId,
        status: error instanceof BirdVerifyError ? error.status : null,
      })
      return { verified: false, phone: null }
    }
  },
})

export const prepareChange = internalMutation({
  args: {
    userId: v.string(),
    rawPhone: v.string(),
    requestId: v.string(),
    expiresAt: v.number(),
  },
  returns: v.object({
    phone: v.string(),
    expiresAt: v.number(),
    maskedPhone: v.string(),
  }),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "phoneChangeSend", {
      key: args.userId,
      throws: true,
    })

    const profile = await getActiveProfile(ctx, args.userId)
    const phone = normalizeRecoveryPhone(
      args.rawPhone,
      profile.pivot?.nationality,
    )
    if (!phone) {
      throw new ConvexError({
        code: "INVALID_PHONE",
        message:
          "Saisissez un numéro gabonais ou français valide, avec son indicatif.",
      })
    }

    const currentPhone = normalizeRecoveryPhone(
      profile.pivot?.phone,
      profile.pivot?.nationality,
    )
    if (currentPhone === phone && profile.phoneVerifiedAt !== undefined) {
      throw new ConvexError({
        code: "PHONE_UNCHANGED",
        message: "Ce numéro est déjà associé et vérifié sur votre profil.",
      })
    }
    await assertPhoneAvailable(ctx, phone, profile._id)

    const previous = await ctx.db
      .query("phoneChangeChallenge")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const challenge of previous) await ctx.db.delete(challenge._id)

    const now = Date.now()
    await ctx.db.insert("phoneChangeChallenge", {
      requestId: args.requestId,
      userId: args.userId,
      phone,
      status: "pending",
      attempts: 0,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    return {
      phone,
      expiresAt: args.expiresAt,
      maskedPhone: maskPhone(phone),
    }
  },
})

export const markSent = internalMutation({
  args: {
    userId: v.string(),
    requestId: v.string(),
    birdExpiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await findOwnedChallenge(ctx, args)
    if (!challenge || challenge.status !== "pending") return null

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
      actorId: args.userId,
      action: "otp_sent",
      targetType: "user",
      targetId: args.userId,
      metadata: { channel: "sms", purpose: "phone_change" },
    })
    return null
  },
})

export const discard = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const challenge = await findOwnedChallenge(ctx, args)
    if (challenge) await ctx.db.delete(challenge._id)
    return null
  },
})

export const takeVerificationAttempt = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  returns: v.union(v.object({ phone: v.string() }), v.null()),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "phoneChangeVerify", {
      key: args.userId,
      throws: true,
    })

    const challenge = await findOwnedChallenge(ctx, args)
    if (
      !challenge ||
      challenge.status !== "sent" ||
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

export const confirmChange = internalMutation({
  args: { userId: v.string(), requestId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const challenge = await findOwnedChallenge(ctx, args)
    if (
      !challenge ||
      challenge.status !== "sent" ||
      challenge.expiresAt <= Date.now()
    ) {
      return false
    }

    const profile = await getActiveProfile(ctx, args.userId)
    await assertPhoneAvailable(ctx, challenge.phone, profile._id)
    if (!profile.pivot) {
      throw new ConvexError({
        code: "PROFILE_INCOMPLETE",
        message: "Complétez votre identité avant d'ajouter un téléphone.",
      })
    }

    const now = Date.now()
    await ctx.db.patch(profile._id, {
      pivot: { ...profile.pivot, phone: challenge.phone },
      phoneKey: challenge.phone,
      phoneVerifiedAt: now,
      updatedAt: now,
    })

    const challenges = await ctx.db
      .query("phoneChangeChallenge")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    for (const row of challenges) await ctx.db.delete(row._id)

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: args.userId,
      action: "otp_verified",
      targetType: "user",
      targetId: args.userId,
      metadata: { channel: "sms", purpose: "phone_change" },
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: args.userId,
      action: "account_modified",
      targetType: "user",
      targetId: args.userId,
      metadata: { field: "phone", verified: true },
    })
    return true
  },
})

export const pruneExpired = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("phoneChangeChallenge")
      .withIndex("by_expiresAt", (q) => q.lte("expiresAt", Date.now()))
      .take(200)
    for (const challenge of expired) await ctx.db.delete(challenge._id)
    return { deleted: expired.length }
  },
})

type MutationDbCtx = Pick<MutationCtx, "db">

async function getActiveProfile(
  ctx: MutationDbCtx,
  userId: string,
): Promise<Doc<"userProfile">> {
  const profile = await ctx.db
    .query("userProfile")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (!profile || profile.deletedAt !== undefined) {
    throw new ConvexError({
      code: "PROFILE_NOT_FOUND",
      message: "Profil introuvable.",
    })
  }
  return profile
}

async function assertPhoneAvailable(
  ctx: MutationDbCtx,
  phone: string,
  currentProfileId: Id<"userProfile">,
): Promise<void> {
  if (!(await isPhoneRegistryReady(ctx))) {
    throw new ConvexError({
      code: "PHONE_CHECK_UNAVAILABLE",
      message: "La vérification du numéro est indisponible pour le moment.",
    })
  }

  if (await isPhoneUsedByAnotherProfile(ctx, phone, currentProfileId)) {
    throw new ConvexError({
      code: "PHONE_ALREADY_USED",
      message: "Ce numéro est déjà associé à un autre compte.",
    })
  }
}

async function findOwnedChallenge(
  ctx: MutationDbCtx,
  args: { userId: string; requestId: string },
): Promise<Doc<"phoneChangeChallenge"> | null> {
  const challenge = await ctx.db
    .query("phoneChangeChallenge")
    .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
    .unique()
  return challenge?.userId === args.userId ? challenge : null
}

function maskPhone(phone: string): string {
  if (phone.length <= 6) return phone
  return `${phone.slice(0, 4)}••••${phone.slice(-3)}`
}
