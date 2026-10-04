import { v } from "convex/values"

import { query } from "../_generated/server"
import { requireController } from "../lib/auth"

/**
 * Espace contrôleur — contrôle terrain par QR de présentation.
 *
 * La vérification cryptographique reste `presentation.verifyToken`
 * (HMAC-SHA256, expiration 30 s, audit `identity_check_performed`,
 * notification de transparence au titulaire). Cette requête complète le
 * résultat avec ce que le jeton ne porte pas, pour que l'agent compare la
 * personne en face de lui : la photo d'identité et l'état actuel du compte.
 *
 * Garde d'accès : la photo n'est rendue que si CE contrôleur a vérifié un
 * jeton de CE titulaire dans les 15 dernières minutes. Sans cette condition,
 * un identifiant IDN suffirait à obtenir le visage de n'importe qui.
 */

const CHECK_WINDOW_MS = 15 * 60 * 1000

export const holder = query({
  args: { idnId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      photoUrl: v.union(v.string(), v.null()),
      photoSource: v.union(v.literal("profile"), v.literal("kyc_selfie"), v.null()),
      currentLoa: v.union(v.literal(1), v.literal(2), v.literal(3)),
      accountState: v.union(
        v.literal("active"),
        v.literal("deletion_pending"),
        v.literal("deleted"),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const me = await requireController(ctx)
    const now = Date.now()
    const checks = await ctx.db
      .query("auditLog")
      .withIndex("by_actor", (q) =>
        q
          .eq("actorId", me.userId)
          .gte("createdAt", now - CHECK_WINDOW_MS),
      )
      .order("desc")
      .take(200)
    const check = checks.find(
      (entry) =>
        entry.action === "identity_check_performed" &&
        (entry.metadata as { idnId?: unknown } | undefined)?.idnId === args.idnId,
    )
    if (!check) return null

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_idnId", (q) => q.eq("idnId", args.idnId))
      .unique()
    if (!profile || profile.userId !== check.targetId) return null

    let photoUrl: string | null = null
    let photoSource: "profile" | "kyc_selfie" | null = null
    if (profile.photoStorageRef) {
      photoUrl = await ctx.storage.getUrl(profile.photoStorageRef)
      if (photoUrl) photoSource = "profile"
    }
    if (!photoUrl) {
      const approved = await ctx.db
        .query("kycRequest")
        .withIndex("by_userId_status", (q) =>
          q.eq("userId", profile.userId).eq("status", "approved"),
        )
        .order("desc")
        .first()
      if (approved?.selfieImage) {
        photoUrl = await ctx.storage.getUrl(approved.selfieImage)
        if (photoUrl) photoSource = "kyc_selfie"
      }
    }

    return {
      photoUrl,
      photoSource,
      currentLoa: profile.loa,
      accountState: profile.deletedAt
        ? ("deleted" as const)
        : profile.deletionRequestedAt
          ? ("deletion_pending" as const)
          : ("active" as const),
    }
  },
})
