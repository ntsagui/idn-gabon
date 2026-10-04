import { ConvexError, v } from "convex/values"

import { components, internal } from "./_generated/api"
import { internalQuery, query } from "./_generated/server"
import { mutation } from "./functions"
import { authComponent } from "./auth"
import {
  getCurrentAuthUser,
  requireAuth,
  requireVerifiedAuth,
} from "./lib/auth"
import { assessIdentityCollision } from "./lib/duplicateGuard"
import { raiseDuplicateFlags } from "./lib/duplicateFlags"
import { derivePivotKeys } from "./lib/identity"
import {
  deleteIncompleteSignup,
  findBetterAuthUserById,
  inspectIncompleteSignup,
} from "./lib/incompleteSignup"
import { generateIdnId } from "./lib/idnId"
import { derivePinHash, PIN_REGEX } from "./lib/pin"
import { PROFILE_TYPES } from "./schema"

/**
 * Onboarding citoyen (§3.2 du cahier).
 *
 * Le sign-up email/password + envoi OTP + vérification email sont gérés
 * par Better Auth (routes /api/auth/sign-up/email, /api/auth/email-otp/*).
 * Ici on couvre les ÉTAPES IDN-spécifiques :
 *   • Sélection du profil (citizen / resident / visitor / developer)
 *   • Identité pivot (nom, prénom, ddn, genre, lieu, nationalité)
 *   • PIN à 6 chiffres (PBKDF2-SHA256, 600k itérations)
 *
 * À la création du userProfile, on initialise aussi userPreference et
 * notificationPreference avec les valeurs par défaut.
 */

export const selectProfile = mutation({
  args: {
    profileType: v.union(...PROFILE_TYPES.map((t) => v.literal(t))),
  },
  returns: v.object({ profileId: v.id("userProfile") }),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)

    const existing = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()

    if (existing) {
      const now = Date.now()
      await ctx.db.patch(existing._id, {
        profileType: args.profileType,
        updatedAt: now,
      })
      return { profileId: existing._id }
    }

    // Ce point d'entrée appartenait à l'ancien tunnel en plusieurs mutations :
    // il créait le profil avant que le PIN existe. Le laisser actif permettrait
    // encore à un ancien client de produire un profil impossible à connecter.
    throw new ConvexError({
      code: "ONBOARDING_FLOW_UPDATED",
      message: "Mettez l'application à jour pour terminer l'inscription.",
    })
  },
})

export const setIdentityPivot = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.string(), // ISO YYYY-MM-DD
    gender: v.union(
      v.literal("M"),
      v.literal("F"),
      v.literal("O"),
      v.literal("N"),
    ),
    birthPlace: v.string(),
    nationality: v.string(),
    phone: v.optional(v.string()),
    nip: v.optional(v.string()),
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
        code: "PROFILE_REQUIRED",
        message: "Sélectionnez votre profil d'abord.",
      })
    }

    if (args.firstName.trim().length < 1 || args.lastName.trim().length < 1) {
      throw new ConvexError({
        code: "INVALID",
        message: "Nom et prénom requis.",
      })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.dateOfBirth)) {
      throw new ConvexError({
        code: "INVALID",
        message: "Date de naissance invalide.",
      })
    }

    const phoneTrim = args.phone?.trim()
    const nipTrim = args.nip?.trim()
    if (nipTrim && !/^[A-Za-z0-9]{14}$/.test(nipTrim)) {
      throw new ConvexError({
        code: "INVALID_NIP",
        message:
          "Le NIP doit contenir exactement 14 caractères (chiffres ou lettres).",
      })
    }
    // Même garde qu'à `completeSignup` : ce chemin écrit le pivot lui aussi, et
    // un contrôle posé sur un seul des deux se contournerait par l'autre.
    const { pivotKey, nipKey, phoneKey } = derivePivotKeys({
      firstName: args.firstName,
      lastName: args.lastName,
      dateOfBirth: args.dateOfBirth,
      nip: nipTrim,
      phone: phoneTrim,
      nationality: args.nationality,
    })
    const collision = await assessIdentityCollision(ctx, {
      pivotKey,
      nipKey,
      excludeUserId: user.userId,
    })
    if (collision.verdict === "refuse") {
      throw new ConvexError(
        collision.blockedBy === "nip"
          ? {
              code: "NIP_ALREADY_VERIFIED",
              message:
                "Ce NIP est déjà rattaché à une identité vérifiée. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
            }
          : {
              code: "IDENTITY_ALREADY_VERIFIED",
              message:
                "Une identité vérifiée correspond déjà à ces informations. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
            },
      )
    }

    await ctx.db.patch(profile._id, {
      pivot: {
        firstName: args.firstName.trim(),
        lastName: args.lastName.trim(),
        dateOfBirth: args.dateOfBirth,
        gender: args.gender,
        birthPlace: args.birthPlace.trim(),
        nationality: args.nationality.trim().toUpperCase(),
        ...(phoneTrim ? { phone: phoneTrim } : {}),
        ...(nipTrim ? { nip: nipTrim } : {}),
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

export const createPin = mutation({
  args: { pin: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)

    if (!PIN_REGEX.test(args.pin)) {
      throw new ConvexError({
        code: "INVALID_PIN",
        message: "Le PIN doit contenir exactement 6 chiffres.",
      })
    }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile) {
      throw new ConvexError({
        code: "PROFILE_REQUIRED",
        message: "Sélectionnez votre profil d'abord.",
      })
    }
    if (profile.pinHash) {
      throw new ConvexError({
        code: "PIN_ALREADY_CONFIGURED",
        message: "Saisissez votre PIN actuel pour le modifier.",
      })
    }

    const pinHash = await derivePinHash(args.pin, user.userId)
    await ctx.db.patch(profile._id, {
      pinHash,
      updatedAt: Date.now(),
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "pin_changed",
      targetType: "user",
      targetId: user.userId,
    })

    return null
  },
})

/** Modification atomique : l'ancien PIN et le nouveau sont contrôlés serveur. */
export const changePin = mutation({
  args: { currentPin: v.string(), newPin: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)
    if (!PIN_REGEX.test(args.currentPin) || !PIN_REGEX.test(args.newPin)) {
      throw new ConvexError({
        code: "INVALID_PIN",
        message: "Le PIN doit contenir exactement 6 chiffres.",
      })
    }
    if (args.currentPin === args.newPin) {
      throw new ConvexError({
        code: "SAME_PIN",
        message: "Le nouveau PIN doit être différent de l'ancien.",
      })
    }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile?.pinHash) {
      throw new ConvexError({
        code: "PIN_NOT_CONFIGURED",
        message: "Aucun PIN n'est configuré sur ce compte.",
      })
    }

    const currentHash = await derivePinHash(args.currentPin, user.userId)
    if (currentHash !== profile.pinHash) {
      throw new ConvexError({
        code: "INVALID_CURRENT_PIN",
        message: "Le PIN actuel est incorrect.",
      })
    }

    await ctx.db.patch(profile._id, {
      pinHash: await derivePinHash(args.newPin, user.userId),
      updatedAt: Date.now(),
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "pin_changed",
      targetType: "user",
      targetId: user.userId,
      metadata: { method: "authenticated" },
    })
    return null
  },
})

export const verifyPin = mutation({
  args: { pin: v.string() },
  returns: v.object({ valid: v.boolean() }),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!PIN_REGEX.test(args.pin)) return { valid: false }

    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (!profile?.pinHash) return { valid: false }

    const candidate = await derivePinHash(args.pin, user.userId)
    return { valid: candidate === profile.pinHash }
  },
})

/**
 * Vérification PIN pour le sign-in (appelée depuis le plugin Better Auth
 * `pinSignIn` via http.ts → createAuth → ctx.runQuery).
 *
 * Distingue un PIN valide, un PIN incorrect et un compte historique sans PIN.
 * Pas de throw : le plugin Better Auth traduit le résultat en réponse HTTP.
 *
 * Privée (`internalQuery`) : seul le plugin server-side peut l'invoquer.
 */
export const verifyPinForUserId = internalQuery({
  args: { userId: v.string(), pin: v.string() },
  returns: v.union(
    v.literal("valid"),
    v.literal("invalid"),
    v.literal("setup_required"),
  ),
  handler: async (ctx, args) => {
    if (!PIN_REGEX.test(args.pin)) return "invalid" as const
    if (args.userId === "__unknown__") {
      // Path anti-énumération : on consomme du CPU pour égaliser le timing.
      await derivePinHash(args.pin, args.userId)
      return "invalid" as const
    }
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique()
    if (!profile) {
      await derivePinHash(args.pin, args.userId)
      return "invalid" as const
    }
    if (!profile.pinHash) return "setup_required" as const

    const candidate = await derivePinHash(args.pin, args.userId)
    return candidate === profile.pinHash ? "valid" : "invalid"
  },
})

// ─────────────────────────────────────────────────────────────────────────
// Adresse IDN (@idn.ga) — création et suggestions
// ─────────────────────────────────────────────────────────────────────────
//
// L'utilisateur réserve son adresse IDN pendant l'inscription. Le handle
// devient l'email Better Auth (`<handle>@idn.ga`), vérifié par
// construction (pas d'OTP — l'adresse est créée par l'utilisateur).
//
// Connexion : le client accepte indifféremment `handle` ou
// `handle@idn.ga` et normalise avant d'appeler /sign-in/pin.

export const IDN_DOMAIN = "@idn.ga"
const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/
const HANDLE_MIN = 3
const HANDLE_MAX = 32

function normalizeAscii(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

function validateHandle(raw: string): string {
  const handle = raw.trim().toLowerCase()
  if (handle.length < HANDLE_MIN || handle.length > HANDLE_MAX) {
    throw new ConvexError({
      code: "INVALID_HANDLE",
      message: `L'identifiant doit faire entre ${HANDLE_MIN} et ${HANDLE_MAX} caractères.`,
    })
  }
  if (!HANDLE_REGEX.test(handle)) {
    throw new ConvexError({
      code: "INVALID_HANDLE",
      message:
        "Caractères autorisés : lettres minuscules, chiffres, points, tirets, soulignés.",
    })
  }
  return handle
}

async function findUserByEmail(
  ctx: Parameters<typeof requireAuth>[0],
  email: string,
): Promise<{ _id: string; email: string } | null> {
  const res = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", value: email, operator: "eq" }],
  })) as { _id: string; email: string } | null
  return res ?? null
}

export const suggestIdnHandles = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    dateOfBirth: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      handle: v.string(),
      format: v.string(),
      available: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    const first = normalizeAscii(args.firstName)
    const last = normalizeAscii(args.lastName)
    if (!first || !last) return []
    const f = first[0]!
    const l = last[0]!
    const year =
      args.dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(args.dateOfBirth)
        ? args.dateOfBirth.slice(2, 4)
        : null

    const proposals: { handle: string; format: string }[] = [
      { handle: `${first}.${last}`, format: "prénom.nom" },
      { handle: `${f}.${last}`, format: "p.nom" },
      { handle: `${first}.${l}`, format: "prénom.n" },
      { handle: `${last}.${first}`, format: "nom.prénom" },
    ]
    if (year) {
      proposals.push({
        handle: `${first}.${last}.${year}`,
        format: "prénom.nom.année",
      })
    }
    proposals.push({ handle: `${first}_${last}`, format: "prénom_nom" })

    const seen = new Set<string>()
    const unique = proposals.filter((p) => {
      if (p.handle.length < HANDLE_MIN || p.handle.length > HANDLE_MAX) {
        return false
      }
      if (!HANDLE_REGEX.test(p.handle)) return false
      if (seen.has(p.handle)) return false
      seen.add(p.handle)
      return true
    })

    const results: { handle: string; format: string; available: boolean }[] = []
    for (const p of unique) {
      const existing = await findUserByEmail(ctx, `${p.handle}${IDN_DOMAIN}`)
      results.push({ ...p, available: existing === null })
    }
    return results
  },
})

export const checkIdnHandleAvailability = query({
  args: { handle: v.string() },
  returns: v.object({ handle: v.string(), available: v.boolean() }),
  handler: async (ctx, args) => {
    const handle = validateHandle(args.handle)
    const existing = await findUserByEmail(ctx, `${handle}${IDN_DOMAIN}`)
    const currentUser = await getCurrentAuthUser(ctx)
    return {
      handle,
      // Une inscription interrompue après la création du compte Better Auth
      // doit pouvoir reprendre avec l'adresse qui appartient déjà à la session.
      available: existing === null || existing._id === currentUser?.userId,
    }
  },
})

/**
 * Finalise l'inscription après création du compte Better Auth et confirmation
 * du PIN.
 * Le client appelle `authClient.signUp.email({ email: handle@idn.ga, ... })`
 * puis cette mutation pour :
 *   1. marquer l'email comme vérifié (l'adresse @idn.ga est créée par
 *      l'utilisateur, pas besoin d'OTP),
 *   2. créer le userProfile + pinHash + idnId + préférences atomiquement,
 *   3. seed iBoîte / iCV.
 */
export const completeSignup = mutation({
  args: {
    handle: v.string(),
    pin: v.string(),
    profileType: v.union(...PROFILE_TYPES.map((t) => v.literal(t))),
    pivot: v.object({
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
      phone: v.optional(v.string()),
      nip: v.optional(v.string()),
    }),
  },
  returns: v.object({
    profileId: v.id("userProfile"),
    idnHandle: v.string(),
    idnId: v.string(),
  }),
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const expectedHandle = validateHandle(args.handle)
    const email = user.email.toLowerCase()
    const expectedEmail = `${expectedHandle}${IDN_DOMAIN}`
    if (email !== expectedEmail) {
      throw new ConvexError({
        code: "SESSION_MISMATCH",
        message:
          "La session ne correspond pas à l'adresse IDN réservée. Recommencez l'inscription.",
      })
    }
    if (!PIN_REGEX.test(args.pin)) {
      throw new ConvexError({
        code: "INVALID_PIN",
        message: "Le PIN doit contenir exactement 6 chiffres.",
      })
    }

    if (
      args.pivot.firstName.trim().length < 1 ||
      args.pivot.lastName.trim().length < 1
    ) {
      throw new ConvexError({
        code: "INVALID",
        message: "Nom et prénom requis.",
      })
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.pivot.dateOfBirth)) {
      throw new ConvexError({
        code: "INVALID",
        message: "Date de naissance invalide.",
      })
    }

    // 1. Auto-vérification de l'email @idn.ga (par construction)
    if (!user.emailVerified) {
      await ctx.runMutation(components.betterAuth.adapter.updateOne, {
        input: {
          model: "user",
          where: [{ field: "_id", value: user.userId, operator: "eq" }],
          update: { emailVerified: true, updatedAt: Date.now() },
        },
      })
    }

    const pinHash = await derivePinHash(args.pin, user.userId)

    // 2. Profil existant ? Une réponse perdue peut faire rejouer exactement la
    // même finalisation : dans ce seul cas, on renvoie le résultat précédent.
    const existing = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", user.userId))
      .unique()
    if (existing) {
      if (existing.pinHash === pinHash && existing.idnId) {
        return {
          profileId: existing._id,
          idnHandle: expectedHandle,
          idnId: existing.idnId,
        }
      }
      if (!existing.pinHash) {
        throw new ConvexError({
          code: "PIN_SETUP_REQUIRED",
          message:
            "Ce compte existe sans PIN. Utilisez le parcours de récupération pour rétablir l'accès.",
        })
      }
      throw new ConvexError({
        code: "ALREADY_REGISTERED",
        message: "Ce compte est déjà initialisé.",
      })
    }

    const now = Date.now()
    const phoneTrim = args.pivot.phone?.trim()
    const nipTrim = args.pivot.nip?.trim()
    if (nipTrim && !/^[A-Za-z0-9]{14}$/.test(nipTrim)) {
      throw new ConvexError({
        code: "INVALID_NIP",
        message:
          "Le NIP doit contenir exactement 14 caractères (chiffres ou lettres).",
      })
    }

    // 3. Anti-doublon — une identité déjà VÉRIFIÉE ferme la porte ; une
    //    identité seulement déclarée ouvre un dossier d'arbitrage sans bloquer.
    //    Lecture indexée et insertion dans la même transaction : c'est ce qui
    //    empêche deux inscriptions simultanées de passer toutes les deux
    //    (cf. `lib/duplicateGuard.ts`).
    const { pivotKey, nipKey, phoneKey } = derivePivotKeys({
      firstName: args.pivot.firstName,
      lastName: args.pivot.lastName,
      dateOfBirth: args.pivot.dateOfBirth,
      nip: nipTrim,
      phone: phoneTrim,
      nationality: args.pivot.nationality,
    })
    const collision = await assessIdentityCollision(ctx, { pivotKey, nipKey })
    if (collision.verdict === "refuse") {
      await ctx.runMutation(internal.audit.recordAudit, {
        actorId: user.userId,
        action: "signup_blocked_duplicate",
        targetType: "user",
        targetId: user.userId,
        metadata: { blockedBy: collision.blockedBy ?? "pivot" },
      })
      // Le message ne révèle NI l'IDN NI l'email du compte existant : sans
      // cette précaution, le refus transformerait l'inscription en annuaire
      // interrogeable (« telle personne née tel jour est-elle inscrite ? »).
      throw new ConvexError(
        collision.blockedBy === "nip"
          ? {
              code: "NIP_ALREADY_VERIFIED",
              message:
                "Ce NIP est déjà rattaché à une identité vérifiée. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
            }
          : {
              code: "IDENTITY_ALREADY_VERIFIED",
              message:
                "Une identité vérifiée correspond déjà à ces informations. Si vous pensez qu'il s'agit d'une erreur, contactez le support.",
            },
      )
    }

    const idnId = await generateIdnId(ctx)
    const profileId = await ctx.db.insert("userProfile", {
      userId: user.userId,
      profileType: args.profileType,
      loa: 1,
      idnId,
      pinHash,
      pivot: {
        firstName: args.pivot.firstName.trim(),
        lastName: args.pivot.lastName.trim(),
        dateOfBirth: args.pivot.dateOfBirth,
        gender: args.pivot.gender,
        birthPlace: args.pivot.birthPlace.trim(),
        nationality: args.pivot.nationality.trim().toUpperCase(),
        ...(phoneTrim ? { phone: phoneTrim } : {}),
        ...(nipTrim ? { nip: nipTrim } : {}),
      },
      pivotKey,
      ...(nipKey ? { nipKey } : {}),
      phoneKey,
      createdAt: now,
      updatedAt: now,
    })

    if (collision.matches.length > 0) {
      await raiseDuplicateFlags(ctx, user.userId, collision.matches)
    }

    await ctx.db.insert("userPreference", {
      userId: user.userId,
      language: "fr",
      theme: "auto",
      accessibility: {
        fontSize: "md",
        reducedMotion: false,
        highContrast: false,
      },
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("notificationPreference", {
      userId: user.userId,
      email: { security: true, kyc: true, consent: true, comms: false },
      inApp: { security: true, kyc: true, consent: true, comms: true },
      updatedAt: now,
    })

    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "account_created",
      targetType: "user",
      targetId: user.userId,
      metadata: {
        profileType: args.profileType,
        idnId,
        idnHandle: expectedHandle,
      },
    })
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user.userId,
      action: "pin_changed",
      targetType: "user",
      targetId: user.userId,
    })

    // iBoîte personnel — alias = adresse IDN choisie par l'utilisateur.
    // (Pas de pré-remplissage iCarte : l'utilisateur ajoute ses cartes
    // lui-même quand il en a besoin.)
    await ctx.runMutation(internal.iboite.accounts.ensurePersonal, {
      userId: user.userId,
      idnHandle: expectedHandle,
    })
    await ctx.runMutation(internal.cv.cvs.ensureDefaultForUser, {
      userId: user.userId,
    })

    return { profileId, idnHandle: expectedHandle, idnId }
  },
})

/** Au-delà, une inscription n'est plus « en cours » : un compte sans profil
 *  aussi ancien relève de la réparation admin, pas du libre-service. */
const ABANDON_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Abandonne l'inscription en cours du compte appelant.
 *
 * `completeSignup` a besoin d'une session, donc d'un compte Better Auth créé
 * AVANT elle. Quand elle refuse (identité ou NIP déjà vérifiés, typiquement),
 * ce compte reste : sans profil ni PIN, avec un mot de passe interne jeté, il
 * est inutilisable, et il confisque l'adresse `@idn.ga` choisie. Le client
 * appelle cette mutation juste après le refus pour libérer l'adresse.
 *
 * Ne supprime QUE le compte de l'appelant, et seulement s'il est encore une
 * coquille (cf. `lib/incompleteSignup.ts`) : un profil créé entre-temps, un
 * rôle, un consentement ou un second facteur suffisent à tout arrêter. Dans
 * ce cas, la mutation répond `abandoned: false` sans erreur — l'appel est un
 * nettoyage de courtoisie, pas une action que le client doit réussir.
 *
 * Ne révèle rien que l'appelant ne sache déjà : il ne peut viser que son
 * propre compte, et la réponse ne dit pas pourquoi un compte est conservé.
 */
export const abandonIncompleteSignup = mutation({
  args: {},
  returns: v.object({ abandoned: v.boolean() }),
  handler: async (ctx) => {
    const authUser = await requireAuth(ctx)
    const user = await findBetterAuthUserById(ctx, authUser.userId)
    if (!user) return { abandoned: false }

    const now = Date.now()
    const inspection = await inspectIncompleteSignup(ctx, user, {
      createdWithin: { from: now - ABANDON_MAX_AGE_MS, to: now + 1 },
    })
    if (!inspection.eligible) return { abandoned: false }

    await deleteIncompleteSignup(ctx, user)
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: user._id,
      action: "signup_abandoned",
      targetType: "user",
      targetId: user._id,
      metadata: { email: user.email.toLowerCase() },
    })
    return { abandoned: true }
  },
})
