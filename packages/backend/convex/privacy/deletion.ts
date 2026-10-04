import { v } from "convex/values";

import { components, internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "../_generated/server";
import { authComponent, createAuth } from "../auth";

/**
 * Anonymisation effective des comptes en fin de cooldown (30 j).
 *
 * Le cron `Process scheduled deletions` (cf. crons.ts) appelle
 * `processScheduledDeletions` une fois par jour. Pour chaque
 * `userProfile.deletionScheduledAt <= now` (et `deletedAt` toujours
 * vide), on dispatch une mutation interne `anonymizeAccount` qui :
 *   1. Révoque toutes les sessions Better Auth
 *   2. Supprime les données personnelles user-scoped (KYC, iCarte,
 *      iBoîte, iCV, iDoc, notifications, préférences, sessions
 *      cross-device, rôles)
 *   3. Vide le pivot + référence photo du profil
 *   4. Marque `deletedAt` (soft-delete RGPD §3.4)
 *
 * Les logs d'audit (`auditLog`) sont **préservés** sans modification
 * — conservation 5 ans obligatoire (loi gabonaise 001/2011), mais
 * détachés de toute donnée personnelle exploitable.
 */

export const processScheduledDeletions = internalAction({
  args: {},
  returns: v.object({
    processed: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const due = (await ctx.runQuery(
      internal.privacy.deletion.listDueDeletions,
      { now },
    )) as Array<{ userId: string }>;

    for (const item of due) {
      try {
        await ctx.runMutation(internal.privacy.deletion.anonymizeAccount, {
          userId: item.userId,
        });
      } catch (err) {
        console.error("[privacy] anonymizeAccount failed", item.userId, err);
      }
    }

    return { processed: due.length };
  },
});

export const listDueDeletions = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.object({ userId: v.string() })),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("userProfile")
      .withIndex("by_deletionScheduledAt", (q) =>
        q.lte("deletionScheduledAt", args.now),
      )
      .take(100);
    return rows
      .filter((p) => p.deletionScheduledAt !== undefined && !p.deletedAt)
      .map((p) => ({ userId: p.userId }));
  },
});

export const anonymizeAccount = internalMutation({
  args: { userId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile) return null;
    if (profile.deletedAt) return null;

    await purgeUserData(ctx, args.userId);
    await anonymizeProfile(ctx, profile._id);
    await revokeAllSessions(ctx, args.userId);

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: args.userId,
      action: "account_disabled",
      targetType: "user",
      targetId: args.userId,
      metadata: { kind: "deletion_executed" },
    });

    return null;
  },
});

/* -------------------------------------------------------------------------- */
/*  Internals                                                                 */
/* -------------------------------------------------------------------------- */

async function anonymizeProfile(ctx: MutationCtx, profileId: any) {
  const now = Date.now();
  const profile = await ctx.db.get(profileId);
  if (!profile) return;

  if ((profile as any).photoStorageRef) {
    try {
      await ctx.storage.delete((profile as any).photoStorageRef);
    } catch {}
  }

  await ctx.db.patch(profileId, {
    pivot: undefined,
    // Clés de rapprochement anti-doublon. Les effacer n'est pas cosmétique :
    // tant qu'elles subsistent, l'identité d'un citoyen ayant exercé son droit
    // à l'effacement continuerait de bloquer une réinscription — la sienne, en
    // premier lieu.
    pivotKey: undefined,
    nipKey: undefined,
    phoneKey: undefined,
    photoStorageRef: undefined,
    pinHash: undefined,
    phoneVerifiedAt: undefined,
    idnId: undefined,
    deletionRequestedAt: undefined,
    deletionScheduledAt: undefined,
    deletedAt: now,
    updatedAt: now,
  });
}

async function purgeUserData(ctx: MutationCtx, userId: string) {
  /* ---- KYC ---- */
  const kycRequests = await ctx.db
    .query("kycRequest")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const r of kycRequests) {
    const refs = [
      r.documentImages?.front,
      r.documentImages?.back,
      r.selfieImage,
    ].filter(Boolean) as any[];
    for (const id of refs) {
      try {
        await ctx.storage.delete(id);
      } catch {}
    }
    await ctx.db.delete(r._id);
  }

  /* ---- Biométrie (galerie de déduplication) ---- */
  // Même ordre de sensibilité que le KYC ci-dessus, donc traité juste après.
  const templates = await ctx.db
    .query("faceTemplate")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const t of templates) await ctx.db.delete(t._id);

  /* ---- Signaux de doublon ---- */
  // Deux directions, deux traitements distincts.
  // 1. Les signaux PORTANT SUR ce compte disparaissent avec lui.
  const ownFlags = await ctx.db
    .query("duplicateSignal")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const f of ownFlags) await ctx.db.delete(f._id);

  // 2. Les signaux POINTANT VERS ce compte depuis un autre sont conservés mais
  //    dépointés. Les supprimer laisserait le compte survivant signalé sans
  //    qu'on sache plus pourquoi ; les laisser en l'état conserverait la
  //    référence à une personne effacée, c'est-à-dire une donnée personnelle
  //    résiduelle d'un tiers.
  const inboundFlags = await ctx.db
    .query("duplicateSignal")
    .withIndex("by_matchedUserId", (q) => q.eq("matchedUserId", userId))
    .collect();
  for (const f of inboundFlags) {
    await ctx.db.patch(f._id, {
      matchedUserId: undefined,
      status: "superseded",
      resolvedAt: Date.now(),
    });
  }

  /* ---- userDocument (storageRef) ---- */
  const docs = await ctx.db
    .query("userDocument")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const d of docs) {
    try {
      await ctx.storage.delete(d.storageRef);
    } catch {}
    await ctx.db.delete(d._id);
  }

  /* ---- notifications + préférences ---- */
  const notifs = await ctx.db
    .query("notification")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const n of notifs) await ctx.db.delete(n._id);

  const notifPrefs = await ctx.db
    .query("notificationPreference")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const p of notifPrefs) await ctx.db.delete(p._id);

  const pushSubscriptions = await ctx.db
    .query("pushSubscription")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100);
  for (const subscription of pushSubscriptions)
    await ctx.db.delete(subscription._id);

  const userPrefs = await ctx.db
    .query("userPreference")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const p of userPrefs) await ctx.db.delete(p._id);

  /* ---- iCarte ---- */
  const cards = await ctx.db
    .query("walletCard")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const c of cards) await ctx.db.delete(c._id);

  /* ---- iBoîte ---- */
  // Lettres + pièces jointes (storage)
  const letters = await ctx.db
    .query("iboiteLetter")
    .withIndex("by_user_folder", (q) => q.eq("userId", userId))
    .collect();
  for (const l of letters) {
    const atts = await ctx.db
      .query("iboiteLetterAttachment")
      .withIndex("by_letter", (q) => q.eq("letterId", l._id))
      .collect();
    for (const a of atts) {
      try {
        await ctx.storage.delete(a.storageRef);
      } catch {}
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(l._id);
  }
  // Colis
  const packages = await ctx.db
    .query("iboitePackage")
    .withIndex("by_user_status", (q) => q.eq("userId", userId))
    .collect();
  for (const p of packages) await ctx.db.delete(p._id);
  // Messages internes
  const messages = await ctx.db
    .query("iboiteMessage")
    .withIndex("by_user_folder", (q) => q.eq("userId", userId))
    .collect();
  for (const m of messages) await ctx.db.delete(m._id);
  // Comptes iBoîte
  const accounts = await ctx.db
    .query("iboiteAccount")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const acc of accounts) await ctx.db.delete(acc._id);

  /* ---- Vault E2E (dormant) ---- */
  const vaultItems = await ctx.db
    .query("vaultItem")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const it of vaultItems) {
    try {
      await ctx.storage.delete(it.contentRef);
    } catch {}
    await ctx.db.delete(it._id);
  }
  const vaultKeys = await ctx.db
    .query("vaultKey")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const k of vaultKeys) await ctx.db.delete(k._id);

  /* ---- iDoc ---- */
  const docItems = await ctx.db
    .query("documentItem")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const it of docItems) {
    try {
      await ctx.storage.delete(it.contentRef);
    } catch {}
    await ctx.db.delete(it._id);
  }
  const expNotices = await ctx.db
    .query("vaultExpirationNotice")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const n of expNotices) await ctx.db.delete(n._id);

  /* ---- iCV ---- */
  const cvs = await ctx.db
    .query("citizenCv")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const c of cvs) await ctx.db.delete(c._id);
  const cvExports = await ctx.db
    .query("citizenCvExport")
    .withIndex("by_user_cv", (q) => q.eq("userId", userId))
    .collect();
  for (const e of cvExports) {
    try {
      await ctx.storage.delete(e.storageRef);
    } catch {}
    await ctx.db.delete(e._id);
  }
  const cvAiJobs = await ctx.db
    .query("citizenCvAiJob")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const j of cvAiJobs) await ctx.db.delete(j._id);

  /* ---- Cross-device + rôles ---- */
  // crossDeviceSession est indexé par sessionCode/expiresAt (pas par
  // userId) — filter table-scan (volume bas par utilisateur, OK pour
  // un cron one-shot).
  const cdSessions = await ctx.db
    .query("crossDeviceSession")
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();
  for (const s of cdSessions) await ctx.db.delete(s._id);

  const phoneChanges = await ctx.db
    .query("phoneChangeChallenge")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const challenge of phoneChanges) await ctx.db.delete(challenge._id);

  const roles = await ctx.db
    .query("userRole")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const r of roles) await ctx.db.delete(r._id);
}

async function revokeAllSessions(ctx: MutationCtx, userId: string) {
  const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "session",
    where: [{ field: "userId", value: userId, operator: "eq" }],
    paginationOpts: { numItems: 200, cursor: null },
  })) as { page: Array<{ token: string }> };

  const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
  for (const s of raw.page) {
    try {
      await auth.api.revokeSession({ body: { token: s.token }, headers });
    } catch {}
  }
}
