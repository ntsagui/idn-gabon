import { ConvexError, v } from "convex/values"

import { internalQuery, mutation, query } from "./_generated/server"
import {
  getCurrentAuthUser,
  requireAuth,
  requireVerifiedAuth,
} from "./lib/auth"
import { assessIdentityCollision } from "./lib/duplicateGuard"
import { raiseDuplicateFlags } from "./lib/duplicateFlags"
import { derivePivotKeys, normalizeNipKey } from "./lib/identity"
import { internal } from "./_generated/api"

/**
 * Profil citoyen (§3.3 — Mon compte).
 *
 * - getCurrentUser : agrège user Better Auth + userProfile + dernière KYC approved
 * - updatePivot     : modifie identité pivot (audit log)
 * - generateUploadUrl : storage pour photo de profil (signed URL Convex)
 * - setProfilePhoto : pose la ref photo après upload
 */

/**
 * Lookup du profil par userId Better Auth — utilisé par le handler HTTP
 * /api/auth/oauth2/userinfo (http.ts) pour enrichir les claims OIDC avec
 * les données pivot stockées dans userProfile (en plus des claims standards
 * fournis par better-auth qui n'a accès qu'aux champs de sa propre table user).
 */
export const getForUserinfo = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.object({
      profileType: v.string(),
      loa: v.number(),
      idnId: v.optional(v.string()),
      pivot: v.optional(
        v.object({
          firstName: v.string(),
          lastName: v.string(),
          dateOfBirth: v.string(),
          gender: v.string(),
          birthPlace: v.string(),
          nationality: v.string(),
          phone: v.optional(v.string()),
          nip: v.optional(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique()
    if (!profile) return null
    return {
      profileType: profile.profileType,
      loa: profile.loa,
      idnId: profile.idnId,
      pivot: profile.pivot,
    }
  },
})

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      userId: v.string(),
      email: v.string(),
      emailVerified: v.boolean(),
      roles: v.array(v.string()),
      profile: v.union(
        v.object({
          loa: v.number(),
          profileType: v.string(),
          idnId: v.optional(v.string()),
          pivot: v.optional(
            v.object({
              firstName: v.string(),
              lastName: v.string(),
              dateOfBirth: v.string(),
              gender: v.string(),
              birthPlace: v.string(),
              nationality: v.string(),
              phone: v.optional(v.string()),
              nip: v.optional(v.string()),
            }),
          ),
          photoStorageRef: v.optional(v.id("_storage")),
          photoUrl: v.union(v.string(), v.null()),
          pinConfigured: v.boolean(),
          phoneVerifiedAt: v.union(v.number(), v.null()),
          verifiedAt: v.union(v.number(), v.null()),
          verifiedDocumentTypes: v.array(v.string()),
        }),
        v.null(),
      ),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const auth = await getCurrentAuthUser(ctx)
    if (!auth) return null

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", auth.userId))
      .unique()

    if (!profile) {
      return {
        userId: auth.userId,
        email: auth.email,
        emailVerified: auth.emailVerified,
        roles: auth.roles,
        profile: null,
      }
    }

    // Photo profil : URL signée si ref présente
    const photoUrl = profile.photoStorageRef
      ? await ctx.storage.getUrl(profile.photoStorageRef)
      : null

    // Dernière KYC approuvée (pour verifiedAt + documents)
    const approvedKycs = await ctx.db
      .query("kycRequest")
      .withIndex("by_userId_status", (q) =>
        q.eq("userId", auth.userId).eq("status", "approved"),
      )
      .order("desc")
      .collect()

    const latestApproved = approvedKycs[0]
    const verifiedAt = latestApproved?.reviewedAt ?? null
    const verifiedDocumentTypes = Array.from(
      new Set(approvedKycs.map((k) => k.documentType)),
    )

    return {
      userId: auth.userId,
      email: auth.email,
      emailVerified: auth.emailVerified,
      roles: auth.roles,
      profile: {
        loa: profile.loa,
        profileType: profile.profileType,
        idnId: profile.idnId,
        pivot: profile.pivot,
        photoStorageRef: profile.photoStorageRef,
        photoUrl,
        pinConfigured: Boolean(profile.pinHash),
        phoneVerifiedAt: profile.phoneVerifiedAt ?? null,
        verifiedAt,
        verifiedDocumentTypes,
      },
    }
  },
})

export const updatePivot = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(),
    gender: v.union(
      v.literal("M"),
      v.literal("F"),
      v.literal("O"),
      v.literal("N"),
    ),
    birthPlace: v.string(),
    nationality: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_NOT_FOUND",
        message: "Profil introuvable.",
      })
    }

    // Préserve les champs non touchés par updatePivot (phone, nip).
    const existingPhone = profile.pivot?.phone
    const existingNip = profile.pivot?.nip

    // Même garde qu'à l'inscription. Sans elle, le contrôle du signup se
    // contourne en deux temps : s'inscrire sous une identité quelconque, puis
    // la réécrire ici vers l'identité visée.
    //
    // `excludeUserId` est ce qui préserve le parcours légitime : corriger une
    // faute de frappe dans son propre nom ne doit pas se heurter à sa propre
    // identité.
    const { pivotKey, nipKey, phoneKey } = derivePivotKeys({
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      nip: existingNip,
      phone: existingPhone,
      nationality: args.nationality,
    })
    const collision = await assessIdentityCollision(ctx, {
      pivotKey,
      excludeUserId: user.userId,
    })
    if (collision.verdict === "refuse") {
      throw new ConvexError({
        code: "IDENTITY_ALREADY_VERIFIED",
        message:
          "Une identité vérifiée correspond déjà à ces informations. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
      })
    }

    await ctx.db.patch(profile._id, {
      pivot: {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        dateOfBirth: args.dateOfBirth,
        gender: args.gender,
        birthPlace: args.birthPlace.trim(),
        nationality: args.nationality.trim().toUpperCase(),
        ...(existingPhone ? { phone: existingPhone } : {}),
        ...(existingNip ? { nip: existingNip } : {}),
      },
      pivotKey,
      nipKey,
      phoneKey,
      updatedAt: Date.now(),
    })

    if (collision.matches.length > 0) {
      await raiseDuplicateFlags(ctx, user.userId, collision.matches)
    }

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "account_modified",
      targetType: "user",
      targetId: user.userId,
      metadata: { field: "pivot" },
    })
    return null
  },
})

export const updateNip = mutation({
  args: { nip: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)

    const nip = args.nip.trim()
    if (!/^[A-Za-z0-9]{14}$/.test(nip)) {
      throw new ConvexError({
        code: "INVALID_NIP",
        message:
          "Le NIP doit contenir exactement 14 caractères (chiffres ou lettres).",
      })
    }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_NOT_FOUND",
        message: "Profil introuvable.",
      })
    }
    if (!profile.pivot) {
      throw new ConvexError({
        code: "PROFILE_NOT_FOUND",
        message: "Identité pivot introuvable.",
      })
    }

    const nipKey = normalizeNipKey(nip)
    const collision = await assessIdentityCollision(ctx, {
      nipKey,
      excludeUserId: user.userId,
    })
    if (collision.verdict === "refuse") {
      throw new ConvexError({
        code: "NIP_ALREADY_VERIFIED",
        message:
          "Ce NIP est déjà rattaché à une identité vérifiée. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
      })
    }

    await ctx.db.patch(profile._id, {
      pivot: { ...profile.pivot, nip },
      nipKey,
      updatedAt: Date.now(),
    })

    if (collision.matches.length > 0) {
      await raiseDuplicateFlags(ctx, user.userId, collision.matches)
    }

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "account_modified",
      targetType: "user",
      targetId: user.userId,
      metadata: { field: "nip" },
    })
    return null
  },
})

export const generateProfilePhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAuth(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const setProfilePhoto = mutation({
  args: { storageRef: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_NOT_FOUND",
        message: "Profil introuvable.",
      })
    }

    // Optionnel : supprimer l'ancienne photo
    if (profile.photoStorageRef) {
      await ctx.storage.delete(profile.photoStorageRef)
    }

    await ctx.db.patch(profile._id, {
      photoStorageRef: args.storageRef,
      updatedAt: Date.now(),
    })

    await ctx.db.insert("userDocument", {
      userId: user.userId,
      type: "profilePhoto",
      storageRef: args.storageRef,
      mimeType: "image/jpeg", // TODO(idn): détecter dynamiquement
      sha256: "", // TODO(idn): calculer côté client
      createdAt: Date.now(),
    })

    return null
  },
})
