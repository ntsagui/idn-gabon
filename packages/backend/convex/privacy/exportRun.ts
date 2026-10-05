import { v } from "convex/values"

import { internal } from "../_generated/api"
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "../_generated/server"

/**
 * Export RGPD (loi 001/2011 + RGPD art. 20).
 *
 * Flux :
 *   1. `privacy.requestDataExport` schedule cette action.
 *   2. `runDataExport` lit toutes les tables user-scoped via des
 *      internal queries (pas de PII traversée par action), sérialise
 *      en JSON, écrit le blob dans `_storage`.
 *   3. Génère l'URL Convex (permanente — on planifie la suppression
 *      du blob 24h plus tard).
 *   4. Envoie un email avec le lien via le serveur mail IDN.
 *
 * L'utilisateur peut redemander un export après 24h (cf.
 * `rateLimiter.dataExport`).
 */

const EXPORT_TTL_MS = 24 * 60 * 60 * 1000

export const runDataExport = internalAction({
  args: { userId: v.string(), email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Collecte des données user-scoped via une query interne.
    const payload = await ctx.runQuery(
      internal.privacy.exportRun.collectExportPayload,
      { userId: args.userId },
    )

    const json = JSON.stringify(
      {
        meta: {
          generatedAt: new Date().toISOString(),
          userId: args.userId,
          source: "identite.ga · IDN data export RGPD",
        },
        data: payload,
      },
      null,
      2,
    )
    const blob = new Blob([json], { type: "application/json" })
    const storageId = await ctx.storage.store(blob)
    const url = await ctx.storage.getUrl(storageId)

    await ctx.runMutation(internal.privacy.exportRun.sendExportEmail, {
      to: args.email,
      downloadUrl: url ?? "",
      storageId,
    })

    // Planifie la suppression du blob 24h plus tard pour limiter
    // l'exposition du lien.
    await ctx.scheduler.runAfter(
      EXPORT_TTL_MS,
      internal.privacy.exportRun.purgeExportBlob,
      { storageId },
    )

    return null
  },
})

export const collectExportPayload = internalQuery({
  args: { userId: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = args.userId

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique()

    const kycRequests = await ctx.db
      .query("kycRequest")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const cards = await ctx.db
      .query("walletCard")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const accounts = await ctx.db
      .query("iboiteAccount")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const letters = await ctx.db
      .query("iboiteLetter")
      .withIndex("by_user_folder", (q) => q.eq("userId", userId))
      .collect()

    const messages = await ctx.db
      .query("iboiteMessage")
      .withIndex("by_user_folder", (q) => q.eq("userId", userId))
      .collect()

    const documents = await ctx.db
      .query("documentItem")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const cvs = await ctx.db
      .query("citizenCv")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    const notifications = await ctx.db
      .query("notification")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .take(500)

    const preferences = await ctx.db
      .query("userPreference")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()

    // L'empreinte du PIN ne quitte jamais le serveur : l'archive circule par
    // un lien non authentifié, et un PIN à 6 chiffres se retrouve hors ligne
    // en essayant le million de combinaisons contre son empreinte.
    const exportedProfile = profile ? (({ pinHash: _pinHash, ...rest }) => rest)(profile) : null

    return {
      profile: exportedProfile,
      kycRequests,
      walletCards: cards,
      iboite: { accounts, letters, messages },
      documents,
      cvs,
      notifications,
      preferences,
    }
  },
})

export const sendExportEmail = internalMutation({
  args: {
    to: v.string(),
    downloadUrl: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const linkLine = args.downloadUrl
      ? `Lien de téléchargement (valable 24h) :\n${args.downloadUrl}`
      : "Lien indisponible — contactez privacy@identite.ga pour récupérer votre archive."
    await ctx.scheduler.runAfter(0, internal.email.dispatch.sendGeneric, {
      to: args.to,
      subject: "Votre archive de données IDN",
      title: "Votre export de données est prêt",
      body:
        "Conformément au RGPD et à la loi gabonaise 001/2011, voici l'archive JSON de toutes les données associées à votre compte Identité Numérique.\n\n" +
        linkLine +
        "\n\nL'archive contient votre profil, vos demandes KYC, vos cartes iCarte, vos courriers et messages iBoîte, vos documents iDoc, vos CV et vos préférences. Les blobs (photos, pièces jointes) ne sont pas inclus dans ce premier export — contactez privacy@identite.ga si vous en avez besoin.\n\nSi vous n'êtes pas à l'origine de cette demande, contactez immédiatement le 1407.",
      recipientName: null,
    })
    return null
  },
})

export const purgeExportBlob = internalMutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.storageId)
    } catch {}
    return null
  },
})
