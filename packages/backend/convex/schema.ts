import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import { WEBHOOK_EVENT_TYPES } from "./webhooks/catalog"

/**
 * Schéma applicatif IDN (Identité Numérique du Gabon).
 *
 * Les tables Better Auth (user / account / session / oauthApplication /
 * oauthConsent / oauthAccessToken / verification / twoFactor / jwks)
 * vivent dans le composant @convex-dev/better-auth, isolées de notre
 * data model. On ne les redéfinit PAS ici — on s'y connecte via le
 * helper `authComponent.getAuthUser(ctx)` (cf. convex/auth.ts).
 *
 * Ici on définit uniquement les tables métier IDN qui complètent le
 * profil Better Auth — référencées par `userId` (ID Better Auth) en
 * v.string() (les IDs ne traversent pas la frontière composant).
 */

// Énumérations partagées (cf. cahier §5.6, §6.7)
export const PROFILE_TYPES = [
  "citizen",
  "resident",
  "visitor",
  "developer",
] as const

export const KYC_DOCUMENT_TYPES = [
  "cni_gabon",
  "birth_certificate",
  "residence_card",
  "passport",
  "visa",
] as const

export const KYC_STATUSES = [
  "pending",
  "submitted",
  "under_review",
  // Le contrôleur a demandé un complément ; le citoyen voit la demande
  // sur sa page `/kyc/request` et peut ré-uploader pour repasser en
  // `under_review`. Cf. controller.queue.requestComplement +
  // kyc.respondComplement.
  "complement_required",
  "approved",
  "rejected",
  "expired",
] as const

/**
 * Sources d'un rapprochement de comptes, par force de preuve décroissante.
 *
 * `nip` et `document` désignent un identifiant censé être unique : une
 * collision y est quasi certainement un doublon. `face` est une mesure de
 * distance, jamais une égalité — les vrais jumeaux la déclenchent. `pivot`
 * (nom + prénom + date de naissance) est le plus faible : ce triplet n'est pas
 * un identifiant, d'autant qu'une date de naissance déclarée au 1ᵉʳ janvier
 * faute d'acte d'état civil est fréquente.
 */
export const DUPLICATE_SIGNALS = ["pivot", "nip", "face", "document"] as const

/**
 * `superseded` : le compte en regard a été supprimé définitivement. Le signal
 * n'est plus arbitrable mais reste au dossier — le motif d'une suppression de
 * compte doit survivre à cette suppression (conservation 5 ans).
 */
export const DUPLICATE_SIGNAL_STATUSES = [
  "open",
  "confirmed",
  "dismissed",
  "superseded",
] as const

/** États du parcours Niveau 3 : entretien vidéo + décision humaine. */
export const LEVEL3_VERIFICATION_STATUSES = [
  "waiting_controller",
  "claimed",
  "in_interview",
  "approved",
  "rejected",
  "cancelled",
] as const

export const USER_DOCUMENT_TYPES = [
  "profilePhoto",
  "kycDocFront",
  "kycDocBack",
  "selfie",
  "attestation",
] as const

export const NOTIFICATION_CHANNELS = ["email", "in_app"] as const
export const NOTIFICATION_CATEGORIES = [
  "security",
  "kyc",
  "consent",
  "comms",
  "documents",
  "ai",
  "cv",
  "system",
] as const

// Catalogue des cartes du portefeuille citoyen (iCarte).
export const WALLET_CARD_TYPES = [
  "cni",
  "driving",
  "transport",
  "health",
  "bank",
  "business",
  "consular",
  "voter",
  "loyalty",
  "custom",
] as const

// Comptes iBoîte (boîte aux lettres souveraine multi-comptes).
export const IBOITE_ACCOUNT_TYPES = [
  "personal",
  "professional",
  "association",
] as const

// Dossiers iDocument (coffre-fort numérique chiffré E2E).
export const VAULT_FOLDERS = [
  "identity",
  "civil_status",
  "residence",
  "education",
  "work",
  "health",
  "vehicle",
  "other",
] as const

export const AUDIT_ACTIONS = [
  // Auth
  "login_success",
  "login_failure",
  "login_lockout",
  // OTP
  "otp_sent",
  "otp_verified",
  "otp_expired",
  // Profil / compte
  "account_created",
  "account_modified",
  "account_disabled",
  "password_changed",
  "email_changed",
  "pin_changed",
  // KYC
  "kyc_submitted",
  "kyc_under_review",
  "kyc_complement_requested",
  "kyc_complement_provided",
  "kyc_approved",
  "kyc_rejected",
  "level3_requested",
  // Parcours fusionné : une piste documentaire (kycRequest) a été ouverte
  // et rattachée à une demande Niveau 3 émise depuis le LoA 1.
  "level3_document_track_opened",
  "level3_claimed",
  "level3_availability_created",
  "level3_scheduled",
  "level3_rescheduled",
  "level3_interview_started",
  "level3_approved",
  "level3_rejected",
  "level3_cancelled",
  // OAuth / consentement
  "consent_granted",
  "consent_revoked",
  "oauth_app_created",
  "oauth_app_modified",
  "oauth_app_disabled",
  // Sessions
  "session_revoked",
  "session_revoked_global",
  // Admin / RBAC
  "admin_action",
  "role_assigned",
  "role_revoked",
  // Contrôleur
  "identity_check_performed",
  "signature_verified",
  // Signature de document (attestation simple RS256)
  "document_signed",
  // Présentation d'identité (mobile)
  "presentation_minted",
  // Délégation d'identité
  "delegated_identity_created",
  "delegated_identity_claimed",
  // Code de réclamation refusé : à surveiller, une série sur la même identité
  // signale une tentative de prise de contrôle (cf. lib/claimCode.ts).
  "delegated_claim_code_failed",
  "delegation_enabled",
  "delegation_disabled",
  // Anti-doublon : un signal de rapprochement a été levé, ou arbitré par un
  // administrateur. `signup_blocked_duplicate` trace les refus — une série sur
  // la même identité signale soit une fraude, soit un faux positif à corriger.
  "duplicate_flagged",
  "duplicate_flag_resolved",
  "signup_blocked_duplicate",
] as const

export const AUDIT_TARGET_TYPES = [
  "user",
  "app",
  "session",
  "kyc",
  "role",
  "consent",
  "document",
  "system",
] as const

export const ROLES = ["admin", "identity_controller", "developer"] as const

export const CONTACT_CATEGORIES = [
  "citoyen",
  "administration",
  "presse",
  "securite",
] as const

export const CONTACT_STATUSES = ["new", "read", "responded", "spam"] as const

export const LANGUAGES = ["fr", "en"] as const
export const THEMES = ["light", "dark", "auto"] as const
export const FONT_SIZES = ["sm", "md", "lg", "xl"] as const

// iCV — 12 thèmes de présentation (cf. SPECS_FEATURE_ICV.md §9).
export const CV_THEMES = [
  "modern",
  "classic",
  "minimalist",
  "professional",
  "creative",
  "startup",
  "bold",
  "tech",
  "academic",
  "executive",
  "elegant",
  "compact",
] as const

// iCV — origine d'un CV (utile pour distinguer les variants dans l'UI).
export const CV_SOURCES = [
  "onboarding", // seed initial à la sélection de profil
  "manual", // créé / dupliqué à la main par le citoyen
  "ai_optimize", // dérivé via cv.ai.optimizeForJob
  "import", // créé via cv.import.parseAndApply
] as const

// iCV — features IA disponibles (cf. PLAN_BACKEND_ICV.md §8).
export const CV_AI_FEATURES = [
  "improve_summary",
  "suggest_skills",
  "optimize_job",
  "generate_letter",
  "ats_check",
] as const

// iCV — cycle de vie d'un job IA.
export const CV_AI_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
] as const

export default defineSchema({
  /**
   * Profil étendu IDN — un par user Better Auth.
   * Contient l'identité pivot, le LoA, le type de profil, le PIN hashé.
   */
  userProfile: defineTable({
    userId: v.string(), // ID Better Auth (composant isolé)
    profileType: v.union(...PROFILE_TYPES.map((t) => v.literal(t))),
    loa: v.union(v.literal(1), v.literal(2), v.literal(3)),

    /**
     * Identifiant public stable de l'utilisateur (format `GA-XXXX-XXXX`).
     * Généré au signup (`onboarding.completeSignup`), unique global.
     * Optional pour les users créés avant l'introduction du champ.
     */
    idnId: v.optional(v.string()),

    // Identité pivot (§3.2) — optionnelle au signup, complétée à l'étape pivot
    pivot: v.optional(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.string(), // ISO date YYYY-MM-DD
        gender: v.union(
          v.literal("M"),
          v.literal("F"),
          v.literal("O"),
          v.literal("N"),
        ),
        birthPlace: v.string(),
        nationality: v.string(), // ISO 3166-1 alpha-2
        // Numéro de téléphone du citoyen. Les nouvelles écritures sont
        // normalisées en E.164 et ne sont persistées qu'après validation SMS.
        // Les profils historiques peuvent encore contenir un format libre.
        phone: v.optional(v.string()),
        // Numéro d'Identification Personnel (NIP) — 14 chiffres, attribué
        // par le RBPP (Registre Biométrique des Personnes Physiques).
        // Optionnel : tous les citoyens n'en disposent pas encore. Sert
        // de base à la vérification d'identité et est exposable comme
        // claim OIDC aux applications relying party.
        nip: v.optional(v.string()),
      }),
    ),

    /**
     * Clé de rapprochement d'identité — `normalizeIdentityKey(pivot)`, soit
     * `nom|prénom|AAAA-MM-JJ` normalisé (cf. `lib/identity.ts`). Dérivée du
     * pivot, jamais saisie : toute écriture du pivot doit la recalculer
     * (`onboarding.completeSignup`, `profile.updatePivot`).
     *
     * Indexée parce que le contrôle anti-doublon s'exécute sur le chemin
     * d'inscription : sans index, chaque signup scannerait la table. L'index
     * sert aussi l'inventaire admin (`admin/duplicates.ts`), où les membres
     * d'un même groupe sont adjacents.
     *
     * Absente sur les profils sans pivot (LoA 1 jamais complété) et effacée
     * à l'anonymisation RGPD — ce qui suffit à retirer un compte supprimé
     * des rapprochements, sans filtre supplémentaire.
     */
    pivotKey: v.optional(v.string()),

    /**
     * NIP normalisé (majuscules, sans espaces) — cf. `normalizeNipKey`.
     * L'index `by_nip` porte sur `pivot.nip` **brut** et sert la résolution
     * annuaire partenaire, où le NIP est fourni tel qu'imprimé. Il ne peut pas
     * servir au contrôle d'unicité : le NIP admet des lettres
     * (`/^[A-Za-z0-9]{14}$/`), donc `abc…` et `ABC…` y sont deux entrées
     * distinctes alors qu'ils désignent le même numéro.
     *
     * Effacé à l'anonymisation RGPD, comme `pivotKey`.
     */
    nipKey: v.optional(v.string()),

    photoStorageRef: v.optional(v.id("_storage")),
    pinHash: v.optional(v.string()), // PBKDF2-SHA256, 600k itérations
    // Renseigné uniquement après validation d'un code envoyé au numéro. Les
    // numéros historiques restent donc distinguables des numéros vérifiés.
    phoneVerifiedAt: v.optional(v.number()),

    /**
     * Suppression de compte RGPD (§3.4 + Apple Guideline 5.1.1(v)).
     * `deletionRequestedAt` : timestamp de la demande (modale `Supprimer
     * mon compte`).
     * `deletionScheduledAt` : timestamp à partir duquel l'anonymisation
     * effective sera exécutée par le cron (= requestedAt + 30j).
     * Annulable en se reconnectant pendant la fenêtre (cf.
     * `privacy.cancelAccountDeletion`).
     */
    deletionRequestedAt: v.optional(v.number()),
    deletionScheduledAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()), // soft delete RGPD — set par le cron après anonymisation
  })
    .index("by_userId", ["userId"])
    .index("by_idnId", ["idnId"])
    // Résolution annuaire par NIP (exact) pour les applications relying party
    // autorisées (endpoint partenaire /api/partner/citizens/resolve).
    .index("by_nip", ["pivot.nip"])
    .index("by_loa", ["loa"])
    .index("by_profileType", ["profileType"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_deletionScheduledAt", ["deletionScheduledAt"])
    .index("by_pivot_dob", ["pivot.dateOfBirth"])
    .index("by_pivotKey", ["pivotKey"])
    .index("by_nipKey", ["nipKey"]),

  /**
   * Demande KYC (L2 / L3).
   * Liée au workflow Convex `kycLevel2` qui orchestre OCR + biométrie + revue.
   */
  kycRequest: defineTable({
    userId: v.string(),
    documentType: v.union(...KYC_DOCUMENT_TYPES.map((t) => v.literal(t))),

    // Stockage Convex pour les images (chiffrement applicatif Phase 2)
    documentImages: v.object({
      front: v.optional(v.id("_storage")),
      back: v.optional(v.id("_storage")),
    }),
    selfieImage: v.optional(v.id("_storage")),

    // Scores d'analyse automatique (0-100)
    score: v.optional(v.number()),
    faceMatchScore: v.optional(v.number()),
    livenessVerdict: v.optional(
      v.union(v.literal("real"), v.literal("spoof"), v.literal("uncertain")),
    ),
    // Disponibilité effective des moteurs lors du traitement. `false` force
    // une revue humaine et permet au contrôleur de distinguer un score faible
    // d'une analyse qui n'a pas pu être exécutée.
    ocrAvailable: v.optional(v.boolean()),
    biometricAvailable: v.optional(v.boolean()),

    status: v.union(...KYC_STATUSES.map((s) => v.literal(s))),

    // Revue manuelle (contrôleur)
    reviewerId: v.optional(v.string()), // userId du contrôleur
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),

    /**
     * Demande de complément en cours (status = "complement_required").
     * Posée par `controller.queue.requestComplement`, vidée par
     * `kyc.respondComplement` au ré-upload citoyen.
     */
    complementRequest: v.optional(
      v.object({
        message: v.string(),
        requestedAt: v.number(),
        requestedBy: v.string(), // userId du contrôleur
      }),
    ),

    /**
     * Empreinte du numéro de pièce lu par l'OCR — HMAC-SHA256 poivré de
     * `type|numéro normalisé` (cf. `kyc/actions.ts`). Sert uniquement à
     * rapprocher deux dossiers présentant la même pièce.
     *
     * Jamais le numéro en clair : il n'a aucun usage produit, et un numéro de
     * CNI est de faible entropie — un hash nu serait énumérable hors ligne,
     * d'où le poivre serveur (`IDENTITY_HASH_PEPPER`).
     */
    documentNumberHash: v.optional(v.string()),

    /**
     * Un signal de doublon (visage ou pièce) a été levé sur ce dossier.
     * Remonté au contrôleur : mettre une demande en revue à cause d'un doublon
     * sans le lui dire reviendrait à lui faire approuver le doublon à la main.
     */
    duplicateFlagged: v.optional(v.boolean()),

    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_documentNumberHash", ["documentNumberHash"]),

  /**
   * Trail des décisions KYC du contrôleur (un par décision).
   * Append-only par convention.
   */
  kycReview: defineTable({
    kycRequestId: v.id("kycRequest"),
    reviewerId: v.string(),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_kycRequest", ["kycRequestId"])
    .index("by_reviewer", ["reviewerId"]),

  /**
   * Signal de rapprochement entre deux comptes — « ces deux comptes sont
   * peut-être la même personne ». Alimente la file d'arbitrage admin.
   *
   * POURQUOI UNE TABLE ET PAS UN BOOLÉEN SUR `userProfile` : un doublon est une
   * propriété de *paire*, pas de compte. Un drapeau `estUnDoublon: true` ne dit
   * ni avec qui, ni pourquoi, ni depuis quand — or l'administrateur qui doit
   * choisir lequel des deux comptes conserver a besoin des trois. Un même
   * compte peut par ailleurs porter plusieurs signaux de sources différentes
   * (un homonyme à écarter *et* un vrai doublon biométrique à fusionner) :
   * clore l'un ne doit pas clore l'autre.
   *
   * La partie *détection* (`userId`, `matchedUserId`, `signal`, `groupKey`,
   * `score`, `detectedAt`) est un fait horodaté, jamais réécrit. Seule la
   * partie *résolution* (`status` et les champs `resolved*`) est mutable —
   * même contrat que `kycReview`, avec la clôture en plus parce qu'une file de
   * revue a besoin d'être bornée.
   *
   * Ce signal ne décide rien et ne rétrograde aucun compte : il ouvre un
   * dossier, l'humain tranche.
   */
  duplicateSignal: defineTable({
    userId: v.string(), // compte signalé (le nouvel arrivant, en général)
    /**
     * Compte en regard. Optionnel : lorsque celui-ci est supprimé
     * définitivement, la référence est effacée (donnée personnelle d'un tiers)
     * et le signal passe en `superseded` — le fait survit, le pointeur non.
     */
    matchedUserId: v.optional(v.string()),
    signal: v.union(...DUPLICATE_SIGNALS.map((x) => v.literal(x))),
    /**
     * Valeur ayant provoqué le rapprochement : `pivotKey`, `nipKey` ou
     * `documentNumberHash`. Vide pour le signal biométrique, qui ne rapproche
     * pas sur une égalité mais sur une distance.
     */
    groupKey: v.string(),
    /** Similarité cosinus **brute** (−1→1) — signal `face` uniquement. */
    score: v.optional(v.number()),
    sourceKycRequestId: v.optional(v.id("kycRequest")),
    status: v.union(...DUPLICATE_SIGNAL_STATUSES.map((x) => v.literal(x))),
    detectedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    // File de revue : les plus anciens d'abord.
    .index("by_status", ["status", "detectedAt"])
    .index("by_userId", ["userId"])
    .index("by_userId_status", ["userId", "status"])
    // Purge RGPD : retrouver les signaux qui *pointent* vers un compte détruit.
    .index("by_matchedUserId", ["matchedUserId"])
    // Écriture idempotente : un même couple ne doit pas re-signaler à chaque
    // re-soumission KYC, sinon la file devient inexploitable.
    .index("by_pair", ["userId", "matchedUserId", "signal", "status"]),

  /**
   * Empreinte faciale d'une identité vérifiée — galerie de déduplication 1:N.
   *
   * Table séparée de `userProfile` pour trois raisons : la purge RGPD doit
   * pouvoir viser la biométrie seule ; un vecteur de 512 flottants alourdirait
   * chaque lecture de profil, faite sur presque toutes les requêtes du
   * produit ; et un résultat de recherche doit pouvoir remonter à la demande
   * KYC d'origine.
   *
   * ⚠️ DONNÉE BIOMÉTRIQUE (art. 9 RGPD, loi 001/2011). Convex exige le vecteur
   * en clair pour l'indexer : aucun chiffrement applicatif n'est possible sur
   * ce champ. Finalité unique — empêcher qu'un même individu détienne
   * plusieurs identités vérifiées. Un embedding ArcFace ne permet pas de
   * reconstruire le visage, mais reste identifiant : à traiter comme tel.
   *
   * N'est peuplée qu'à l'**approbation** d'un KYC : la galerie protège les
   * identités vérifiées, elle ne se remplit pas de dossiers rejetés.
   */
  faceTemplate: defineTable({
    userId: v.string(),
    kycRequestId: v.id("kycRequest"),
    /** ArcFace 512-d, L2-normalisé (`normed_embedding` du pack InsightFace). */
    embedding: v.array(v.float64()),
    /**
     * Clé de galerie composite `"<modèle>|active"` / `"<modèle>|inactive"`.
     *
     * Composite par contrainte : `VectorFilterBuilder` n'expose que `eq` et
     * `or` — pas de `and` (cf. `convex/server/vector_search.d.ts`). Or il faut
     * filtrer sur deux dimensions à la fois : l'activité (un compte anonymisé
     * sort de la galerie) et la version du modèle (comparer des embeddings
     * issus de deux packs différents produirait des scores dénués de sens —
     * panne silencieuse, jamais une erreur).
     */
    gallery: v.string(),
    modelVersion: v.string(), // ex. "buffalo_l"
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    // Idempotence : un rejeu de step ne doit pas créer un second template.
    .index("by_kycRequestId", ["kycRequestId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 512,
      filterFields: ["gallery"],
    }),

  /**
   * Vérification Niveau 3.
   *
   * Un contrôleur habilité prend la demande, réalise un entretien vidéo
   * LiveKit avec le citoyen, puis prend lui-même la décision. Aucun
   * croisement automatique avec l'état civil n'est requis à ce stade.
   *
   * Le Niveau 2 n'est PLUS un prérequis : le parcours est fusionné (cf.
   * `verification/requestPolicy.ts`). Une demande ouverte depuis le LoA 1
   * embarque sa propre piste documentaire (`kycRequestId`), et son
   * approbation accorde le Niveau 2 et le Niveau 3 du même geste. C'est ce
   * qui préserve l'invariant « pas d'eidas3 sans preuve documentaire ».
   */
  level3Verification: defineTable({
    userId: v.string(),
    status: v.union(
      ...LEVEL3_VERIFICATION_STATUSES.map((status) => v.literal(status)),
    ),
    roomName: v.string(),
    controllerId: v.optional(v.string()),

    /**
     * Nom d'affichage du contrôleur, quand il est instruit depuis une
     * application partenaire (administration.ga). Un agent d'administration a
     * bien un `sub` IDN — il s'authentifie par SSO — mais pas forcément de
     * `userProfile` ici : sans ce champ, la file afficherait « Contrôleur IDN »
     * pour tout le monde, et le citoyen ne saurait pas qui l'a reçu.
     */
    controllerName: v.optional(v.string()),

    /**
     * Canal de traitement. `partner` = instruit depuis une application
     * relying party via l'API M2M ; `controller_app` = console contrôleur
     * native d'identite.ga. Sert l'audit et le routage des notifications.
     */
    handledVia: v.optional(
      v.union(v.literal("controller_app"), v.literal("partner")),
    ),

    /** Clé M2M qui a vouché pour l'agent, quand `handledVia = "partner"`. */
    partnerKeyId: v.optional(v.id("developerApiKey")),

    /**
     * Piste documentaire rattachée (parcours fusionné depuis le LoA 1).
     * Absente quand le citoyen détenait déjà le Niveau 2 : sa preuve
     * documentaire est alors le `kycRequest` approuvé qui lui a valu ce
     * niveau, et rien de neuf n'est à collecter.
     */
    kycRequestId: v.optional(v.id("kycRequest")),

    /**
     * LoA du profil au moment de la demande. Sert l'audit : il distingue
     * après coup un Niveau 3 accordé en parcours fusionné (entryLoa 1) d'un
     * Niveau 3 accordé par-dessus un Niveau 2 déjà instruit (entryLoa 2).
     */
    entryLoa: v.optional(v.number()),
    appointmentSlotId: v.optional(v.id("level3AppointmentSlot")),
    scheduledAt: v.optional(v.number()),
    scheduledEndAt: v.optional(v.number()),
    reminderSentAt: v.optional(v.number()),
    requestedAt: v.number(),
    claimedAt: v.optional(v.number()),
    interviewStartedAt: v.optional(v.number()),
    decidedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_controllerId", ["controllerId"])
    .index("by_status_and_scheduledAt", ["status", "scheduledAt"])
    .index("by_userId_and_status", ["userId", "status"])
    // Resynchronisation partenaire : rejouer tout ce qui a changé depuis un
    // horodatage. C'est le filet quand un webhook s'est perdu — sans lui, une
    // réplique divergente n'aurait aucun moyen de se réparer.
    .index("by_updatedAt", ["updatedAt"]),

  /**
   * Créneaux concrets publiés par les contrôleurs pour les entretiens L3.
   * Une plage de disponibilité est découpée en créneaux de 30, 45 ou 60 min.
   */
  level3AppointmentSlot: defineTable({
    controllerId: v.string(),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("booked"),
      v.literal("cancelled"),
    ),
    verificationId: v.optional(v.id("level3Verification")),
    bookedUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_and_startsAt", ["status", "startsAt"])
    .index("by_controllerId_and_startsAt", ["controllerId", "startsAt"])
    .index("by_verificationId", ["verificationId"]),

  /** Décision Niveau 3 append-only du contrôleur. */
  level3Review: defineTable({
    verificationId: v.id("level3Verification"),
    reviewerId: v.string(),
    decision: v.union(v.literal("approved"), v.literal("rejected")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_verificationId", ["verificationId"])
    .index("by_reviewerId", ["reviewerId"]),

  /**
   * Journal d'audit — append-only (jamais patch, jamais delete).
   * Signature HMAC-SHA256 Phase 1, RSA Phase 2 (WORM réel).
   */
  auditLog: defineTable({
    actorId: v.optional(v.string()), // null = action système
    action: v.union(...AUDIT_ACTIONS.map((a) => v.literal(a))),
    targetType: v.union(...AUDIT_TARGET_TYPES.map((t) => v.literal(t))),
    targetId: v.string(),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.any())),
    signature: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId", "createdAt"])
    .index("by_action", ["action", "createdAt"])
    .index("by_target", ["targetType", "targetId", "createdAt"])
    .index("by_createdAt", ["createdAt"]),

  /**
   * Notifications utilisateur (email + in-app).
   * Lien optionnel vers email Resend pour traçabilité delivery/bounce.
   * `deletedAt` permet le bouton « Tout effacer » du centre de notifications
   * sans purger les enregistrements (préserve les liens audit).
   */
  notification: defineTable({
    userId: v.string(),
    channel: v.union(...NOTIFICATION_CHANNELS.map((c) => v.literal(c))),
    category: v.union(...NOTIFICATION_CATEGORIES.map((c) => v.literal(c))),
    title: v.string(),
    body: v.string(),
    metadata: v.optional(v.record(v.string(), v.any())),

    readAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    emailMessageId: v.optional(v.string()), // ref @convex-dev/resend message id
    deletedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_userId", ["userId", "createdAt"])
    .index("by_userId_unread", ["userId", "readAt"])
    .index("by_userId_category", ["userId", "category", "createdAt"])
    .index("by_category", ["category", "createdAt"]),

  /**
   * Préférences notifications (matrice canal × catégorie).
   * Les nouvelles catégories (documents/ai/cv/system) sont optionnelles
   * en lecture pour rester rétro-compatible avec les anciens documents ;
   * une valeur absente est traitée comme « activée » côté dispatcher.
   */
  notificationPreference: defineTable({
    userId: v.string(),
    email: v.object({
      security: v.boolean(),
      kyc: v.boolean(),
      consent: v.boolean(),
      comms: v.boolean(),
      documents: v.optional(v.boolean()),
      ai: v.optional(v.boolean()),
      cv: v.optional(v.boolean()),
      system: v.optional(v.boolean()),
    }),
    inApp: v.object({
      security: v.boolean(),
      kyc: v.boolean(),
      consent: v.boolean(),
      comms: v.boolean(),
      documents: v.optional(v.boolean()),
      ai: v.optional(v.boolean()),
      cv: v.optional(v.boolean()),
      system: v.optional(v.boolean()),
    }),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  /** Abonnements Web Push associés aux navigateurs/appareils du citoyen. */
  pushSubscription: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_endpoint", ["endpoint"]),

  /** Jetons Expo Push des applications iOS et Android. */
  nativePushSubscription: defineTable({
    userId: v.string(),
    token: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    deviceName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_token", ["token"]),

  /**
   * Préférences UI : langue, thème, accessibilité.
   */
  userPreference: defineTable({
    userId: v.string(),
    language: v.union(...LANGUAGES.map((l) => v.literal(l))),
    theme: v.union(...THEMES.map((t) => v.literal(t))),
    accessibility: v.object({
      fontSize: v.union(...FONT_SIZES.map((s) => v.literal(s))),
      reducedMotion: v.boolean(),
      highContrast: v.boolean(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  /**
   * Documents utilisateur — refs vers Convex storage.
   * Profil photo, pièces KYC, attestations PDF signées par IDN.
   */
  userDocument: defineTable({
    userId: v.string(),
    type: v.union(...USER_DOCUMENT_TYPES.map((t) => v.literal(t))),
    storageRef: v.id("_storage"),
    mimeType: v.string(),
    sha256: v.string(),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId", "createdAt"])
    .index("by_userId_type", ["userId", "type"]),

  /**
   * Habilitations IDN — un utilisateur peut avoir plusieurs rôles
   * (admin, identity_controller, developer). Géré côté app et pas via le
   * plugin admin de Better Auth (qui ajoute des colonnes incompatibles
   * avec l'adapter @convex-dev/better-auth).
   */
  userRole: defineTable({
    userId: v.string(),
    role: v.union(...ROLES.map((r) => v.literal(r))),
    assignedAt: v.number(),
    assignedBy: v.optional(v.string()),
    revokedAt: v.optional(v.number()),
    // Spécifique au rôle `developer` : flag de validation par le super-admin.
    // Tant qu'il vaut `false` ou est absent, le développeur ne peut publier
    // ses apps qu'en sandbox (cf. developer/apps.requestProduction).
    // Pour les autres rôles, le champ est ignoré.
    verified: v.optional(v.boolean()),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_role", ["role"])
    .index("by_userId_role", ["userId", "role"]),

  /**
   * Clés API développeur (PAT / M2M) — émises depuis le portail développeur
   * pour authentifier des appels serveur-à-serveur hors session OAuth.
   *
   * Le secret n'est JAMAIS stocké en clair : seul son hash SHA-256
   * (`tokenHash`) est persisté, indexé pour une validation O(1). Le secret
   * complet n'est renvoyé qu'une fois, à la création ; `tokenPrefix` (tronqué)
   * sert à l'affichage. Cf. developer/apiKeys.ts + lib/secureToken.ts.
   */
  developerApiKey: defineTable({
    userId: v.string(),
    /** Application OAuth propriétaire. Optionnel pendant la reprise des clés historiques. */
    appClientId: v.optional(v.string()),
    name: v.string(),
    tokenHash: v.string(),
    tokenPrefix: v.string(),
    scopes: v.array(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    lastUsedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId", "createdAt"])
    .index("by_appClientId_and_createdAt", ["appClientId", "createdAt"])
    .index("by_tokenHash", ["tokenHash"]),

  /** Endpoints de webhook déclarés par les applications OAuth. */
  webhookEndpoints: defineTable({
    appClientId: v.string(),
    developerUserId: v.string(),
    environment: v.union(v.literal("sandbox"), v.literal("production")),
    name: v.string(),
    url: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("disabled"),
    ),
    secretCiphertext: v.string(),
    secretIv: v.string(),
    previousSecretCiphertext: v.optional(v.string()),
    previousSecretIv: v.optional(v.string()),
    previousSecretValidUntil: v.optional(v.number()),
    /** Lie une réponse de challenge à la version exacte demandée. */
    challengeId: v.optional(v.string()),
    verifiedAt: v.optional(v.number()),
    consecutiveFailures: v.number(),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    pausedReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_appClientId_and_createdAt", ["appClientId", "createdAt"])
    .index("by_appClientId_and_status", ["appClientId", "status"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),

  /** Abonnement exact d'un endpoint à un événement du catalogue. */
  webhookSubscriptions: defineTable({
    endpointId: v.id("webhookEndpoints"),
    appClientId: v.string(),
    eventType: v.union(...WEBHOOK_EVENT_TYPES.map((t) => v.literal(t))),
    createdAt: v.number(),
  })
    .index("by_endpointId_and_eventType", ["endpointId", "eventType"])
    .index("by_eventType_and_endpointId", ["eventType", "endpointId"]),

  /** Événement immuable. La charge utile JSON provient du catalogue typé. */
  webhookEvents: defineTable({
    eventId: v.string(),
    type: v.union(...WEBHOOK_EVENT_TYPES.map((t) => v.literal(t))),
    apiVersion: v.literal("1"),
    authorization: v.union(v.literal("oauth_user"), v.literal("m2m")),
    subject: v.optional(v.string()),
    /** Sujet interne de l'autorisation sandbox, non présent dans payloadJson. */
    authorizationSubject: v.optional(v.string()),
    requiredScope: v.string(),
    payloadJson: v.string(),
    fanoutStatus: v.union(v.literal("pending"), v.literal("completed")),
    createdAt: v.number(),
    fanoutCompletedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_fanoutStatus_and_createdAt", ["fanoutStatus", "createdAt"])
    .index("by_expiresAt", ["expiresAt"]),

  /** Tentative de livraison d'un événement vers un endpoint. */
  webhookDeliveries: defineTable({
    eventId: v.id("webhookEvents"),
    endpointId: v.id("webhookEndpoints"),
    appClientId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("delivering"),
      v.literal("retrying"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    attempts: v.number(),
    /** Départ de la politique de retry, réinitialisé lors d'un rejeu manuel. */
    attemptCycleStartedAt: v.optional(v.number()),
    nextAttemptAt: v.number(),
    leaseExpiresAt: v.optional(v.number()),
    lastHttpStatus: v.optional(v.number()),
    lastErrorCode: v.optional(v.string()),
    lastAttemptAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_eventId_and_endpointId", ["eventId", "endpointId"])
    .index("by_endpointId_and_createdAt", ["endpointId", "createdAt"])
    .index("by_status_and_nextAttemptAt", ["status", "nextAttemptAt"]),

  /**
   * Clé/valeur pour la configuration système modifiable par le super-admin
   * (providers email/SMS actifs, feature flags, etc.).
   *
   * Une seule entrée par clé. `value` est un objet libre pour pouvoir
   * stocker des structures variées (id de provider, options de config).
   */
  systemConfig: defineTable({
    key: v.string(),
    value: v.record(v.string(), v.any()),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }).index("by_key", ["key"]),

  // ─────────────────────────────────────────────────────────────────────
  // iCarte — Portefeuille numérique de cartes (cf. ressources/SPECS_FEATURES_CITIZEN.md §1).
  // Toutes les cartes sont stockées ici (CNI, permis, transport, CNAMGS, bancaire,
  // visite, électeur, fidélité, consulaire + custom). Le citoyen peut éditer ou
  // supprimer n'importe laquelle (V1 — pas de couche "officielle non-éditable").
  // ─────────────────────────────────────────────────────────────────────
  walletCard: defineTable({
    userId: v.string(),
    type: v.union(...WALLET_CARD_TYPES.map((t) => v.literal(t))),
    name: v.string(),
    subtitle: v.optional(v.string()),
    // Apparence
    gradient: v.string(),
    iconKey: v.string(),
    isOfficialStyle: v.boolean(),
    // Données affichées (recto + verso)
    data: v.record(v.string(), v.string()),
    backData: v.optional(v.record(v.string(), v.string())),
    // Mise en avant dans le profil — max 6 par utilisateur
    featured: v.boolean(),
    position: v.number(), // multiples de 1000 pour insertions sans renumérotation
    // Soft delete
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_featured", ["userId", "featured", "position"])
    .index("by_userId_deletedAt", ["userId", "deletedAt"]),

  // ─────────────────────────────────────────────────────────────────────
  // iBoîte — Boîte aux lettres souveraine multi-comptes
  // (cf. ressources/SPECS_FEATURES_CITIZEN.md §2). Trois sections :
  // Courriers physiques (saisie admin), Colis (saisie admin), eMails internes
  // (IDN ↔ administrations, app-only — pas de SMTP entrant).
  // ─────────────────────────────────────────────────────────────────────
  iboiteAccount: defineTable({
    userId: v.string(),
    type: v.union(...IBOITE_ACCOUNT_TYPES.map((t) => v.literal(t))),
    label: v.string(),
    emailAlias: v.string(), // ex "jean.dupont@idn.ga" — boîte SMTP/JMAP réelle
    mailboxStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("provisioned"),
        v.literal("failed"),
      ),
    ),
    mailboxProvisionedAt: v.optional(v.number()),
    mailboxProvisioningError: v.optional(v.string()),
    // Adresse postale physique du citoyen. Au Gabon les adresses formelles
    // sont rares — on privilégie la géolocalisation GPS + un quartier libre.
    // Les champs sont vides tant que `isAddressConfigured` est false.
    street: v.string(),
    city: v.string(),
    postalCode: v.string(),
    country: v.string(),
    // Adresse étendue (config V2). Les anciens comptes n'ont pas ces champs —
    // l'absence ou `isAddressConfigured !== true` doit déclencher le flow de
    // configuration dans l'UI.
    isAddressConfigured: v.optional(v.boolean()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    district: v.optional(v.string()), // quartier (Akanda, Glass, Nzeng-Ayong…)
    addressLine: v.optional(v.string()), // libellé formaté (geocoder ou saisi)
    qrCode: v.string(), // identifiant unique global, ex "IDNGA-12345"
    // Compteurs dénormalisés — maintenus par les mutations métier pour éviter
    // les .collect().length sur les listes (cf. Convex guidelines).
    counters: v.object({
      unreadLetters: v.number(),
      pendingLetters: v.number(),
      availablePackages: v.number(),
      unreadMessages: v.number(),
    }),
    /** Version monotone utilisée par les webhooks et la réconciliation. */
    syncVersion: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_qrCode", ["qrCode"])
    .index("by_emailAlias", ["emailAlias"]),

  iboiteLetter: defineTable({
    accountId: v.id("iboiteAccount"),
    userId: v.string(), // dénormalisé pour ownership rapide
    folder: v.union(
      v.literal("inbox"),
      v.literal("sent"),
      v.literal("pending"), // « À traiter »
      v.literal("trash"),
    ),
    senderName: v.string(),
    senderAddress: v.string(),
    recipientName: v.string(),
    recipientAddress: v.string(),
    subject: v.string(),
    body: v.string(), // texte pré-formaté (whitespace pre-line)
    type: v.union(
      v.literal("action_required"),
      v.literal("informational"),
      v.literal("standard"),
    ),
    stampColor: v.union(
      v.literal("red"),
      v.literal("blue"),
      v.literal("green"),
    ),
    isRead: v.boolean(),
    dueAt: v.optional(v.number()),
    originOperator: v.optional(v.string()), // userId de l'admin qui a déposé
    /** Idempotence des courriers officiels déposés par une app M2M. */
    partnerDeliveryKey: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_folder", ["userId", "folder", "createdAt"])
    .index("by_account_folder", ["accountId", "folder", "createdAt"])
    .index("by_user_unread", ["userId", "folder", "isRead"])
    .index("by_partnerDeliveryKey", ["partnerDeliveryKey"]),

  iboiteLetterAttachment: defineTable({
    letterId: v.id("iboiteLetter"),
    name: v.string(),
    size: v.number(),
    storageRef: v.id("_storage"),
    mimeType: v.string(),
  }).index("by_letter", ["letterId"]),

  iboitePackage: defineTable({
    accountId: v.id("iboiteAccount"),
    userId: v.string(),
    trackingNumber: v.string(),
    senderName: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("transit"),
      v.literal("available"), // à retirer au point relais
      v.literal("delivered"),
    ),
    estimatedDeliveryAt: v.optional(v.number()),
    pickedUpAt: v.optional(v.number()),
    originOperator: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_status", ["userId", "status", "createdAt"])
    .index("by_account_status", ["accountId", "status", "createdAt"])
    .index("by_tracking", ["trackingNumber"]),

  iboiteMessage: defineTable({
    accountId: v.id("iboiteAccount"),
    userId: v.string(),
    threadId: v.string(), // UUID au premier message d'un fil
    senderKind: v.union(v.literal("admin"), v.literal("citizen")),
    senderName: v.string(),
    senderEmail: v.string(),
    recipientName: v.string(),
    recipientEmail: v.string(),
    subject: v.string(),
    preview: v.string(),
    body: v.string(),
    bodyHtml: v.optional(v.string()),
    folder: v.union(
      v.literal("inbox"),
      v.literal("archive"),
      v.literal("sent"),
      v.literal("trash"),
    ),
    isRead: v.boolean(),
    isStarred: v.boolean(),
    hasAttachment: v.boolean(),
    inReplyTo: v.optional(v.id("iboiteMessage")),
    transport: v.optional(v.union(v.literal("internal"), v.literal("smtp"))),
    deliveryStatus: v.optional(
      v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    ),
    externalMessageId: v.optional(v.string()),
    deliveryError: v.optional(v.string()),
    deliveryAttempts: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_folder", ["userId", "folder", "createdAt"])
    .index("by_account_folder", ["accountId", "folder", "createdAt"])
    .index("by_thread", ["threadId", "createdAt"])
    .index("by_user_starred", ["userId", "isStarred", "createdAt"]),

  iboiteMessageAttachment: defineTable({
    messageId: v.id("iboiteMessage"),
    name: v.string(),
    size: v.number(),
    storageRef: v.id("_storage"),
    mimeType: v.string(),
  }).index("by_message", ["messageId"]),

  iboiteInboundReceipt: defineTable({
    providerMessageId: v.string(),
    recipientEmail: v.string(),
    messageId: v.id("iboiteMessage"),
    receivedAt: v.number(),
  }).index("by_provider_recipient", ["providerMessageId", "recipientEmail"]),

  // ─────────────────────────────────────────────────────────────────────
  // iDocument — Coffre-fort numérique chiffré E2E
  // (cf. ressources/SPECS_FEATURES_CITIZEN.md §3). Le serveur ne voit jamais
  // le contenu en clair : seuls `folderId`, `fileSize`, `expirationDate`,
  // `status` restent en clair pour permettre filtres et notifs d'expiration.
  // Architecture envelope encryption :
  //   • MVK (Master Vault Key) AES-256-GCM générée côté client à l'activation.
  //   • MVK wrappée par PBKDF2(passe vault) — stockée dans `vaultKey`.
  //   • Optionnel : wrap MVK par PBKDF2(code de récupération BIP-39).
  //   • Chaque item : blob chiffré + DEK aléatoire wrappée par MVK.
  // ─────────────────────────────────────────────────────────────────────
  vaultKey: defineTable({
    userId: v.string(),
    algorithm: v.string(), // ex "AES-256-GCM"
    kdf: v.string(), // ex "PBKDF2-SHA256"
    kdfIterations: v.number(), // 600 000 (cf. cahier §6.1)
    passwordSalt: v.string(), // base64
    wrappedMvk: v.string(), // base64 — MVK wrap par la clé dérivée du mot de passe
    passwordHint: v.optional(v.string()),
    recoverySalt: v.optional(v.string()),
    wrappedMvkRecovery: v.optional(v.string()),
    activatedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

  vaultItem: defineTable({
    userId: v.string(),
    folderId: v.union(...VAULT_FOLDERS.map((f) => v.literal(f))),
    // Chiffrement
    contentRef: v.id("_storage"), // blob ciphertext
    encryptedMetadata: v.string(), // base64 — JSON chiffré (name, original_name, métadonnées libres)
    wrappedDek: v.string(), // base64 — DEK wrappée par MVK
    iv: v.string(), // base64 — IV utilisé pour le blob
    metaIv: v.string(), // base64 — IV utilisé pour encryptedMetadata
    // Cleartext utile pour filtres / notifs d'expiration
    fileType: v.union(v.literal("pdf"), v.literal("image"), v.literal("other")),
    fileSize: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    expirationDate: v.optional(v.string()), // ISO YYYY-MM-DD
    // Recto/verso (pairing)
    side: v.optional(v.union(v.literal("front"), v.literal("back"))),
    pairedItemId: v.optional(v.id("vaultItem")),
    // Soft delete
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_folder", ["userId", "folderId", "createdAt"])
    .index("by_userId_expiration", ["userId", "expirationDate"])
    .index("by_userId_deletedAt", ["userId", "deletedAt"])
    .index("by_expiration", ["expirationDate"]),

  /**
   * iDocument — version sans chiffrement E2E (en place actuellement).
   * Les blobs et métadonnées sont stockés en clair côté serveur ; l'accès
   * est gardé par l'auth Convex + check d'ownership. À ne pas confondre
   * avec `vaultItem` (E2E, dormante pour réactivation future).
   *
   * Le schéma reste compatible avec les colonnes utiles de `vaultItem`
   * (folderId, fileType, fileSize, status, expirationDate, side) afin
   * de pouvoir migrer entre les deux modes sans changer l'UI.
   */
  documentItem: defineTable({
    userId: v.string(),
    folderId: v.union(...VAULT_FOLDERS.map((f) => v.literal(f))),
    // Storage Convex — blob en clair
    contentRef: v.id("_storage"),
    // Métadonnées en clair (nom, mime, nom original…)
    name: v.string(),
    originalName: v.optional(v.string()),
    mimeType: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("image"), v.literal("other")),
    fileSize: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("verified"),
      v.literal("rejected"),
      v.literal("expired"),
    ),
    expirationDate: v.optional(v.string()),
    side: v.optional(v.union(v.literal("front"), v.literal("back"))),
    pairedItemId: v.optional(v.id("documentItem")),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_folder", ["userId", "folderId", "createdAt"])
    .index("by_userId_expiration", ["userId", "expirationDate"])
    .index("by_userId_deletedAt", ["userId", "deletedAt"]),

  /**
   * Signature de document — attestation cryptographique simple (PAS eIDAS
   * qualifiée) qu'un `documentItem` a été signé par son propriétaire à un
   * instant T. `signature` est un JWT RS256 complet
   * (header.payload.signature, cf. lib/documentSigning.ts) dont le payload
   * embarque le sha256 du document au moment de la signature ; toute
   * altération ultérieure du blob référencé fait diverger le hash courant
   * de celui signé, et la vérification renvoie `valid: false`.
   *
   * Vérifiable publiquement (tiers hors Convex) via la JWKS exposée par
   * `GET /.well-known/document-signing-jwks.json` (cf. http.ts) — clé
   * dédiée, distincte de la JWKS du plugin better-auth `jwt` (cf. auth.ts,
   * réservée aux ID tokens OIDC).
   */
  documentSignature: defineTable({
    userId: v.string(), // signataire = propriétaire du documentItem
    documentItemId: v.optional(v.id("documentItem")),
    documentName: v.optional(v.string()),
    sha256: v.string(), // hex du blob au moment de la signature
    algorithm: v.literal("RS256"),
    keyId: v.string(),
    signature: v.string(), // JWT RS256 complet
    signerName: v.string(),
    signerIdnId: v.optional(v.string()),
    signedAt: v.number(),
  })
    .index("by_userId", ["userId", "signedAt"])
    .index("by_documentItemId", ["documentItemId"]),

  /**
   * Trace de notification d'expiration vault — utilisée par le cron pour
   * dédupliquer (on ne re-notifie pas deux fois le même item dans la fenêtre
   * « < 30 jours »). Une ligne par (item, palier) ; palier = 30 / 7 / 0.
   */
  vaultExpirationNotice: defineTable({
    userId: v.string(),
    vaultItemId: v.id("vaultItem"),
    tier: v.union(v.literal("30d"), v.literal("7d"), v.literal("expired")),
    notifiedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_item_tier", ["vaultItemId", "tier"]),

  /**
   * Cross-device login (scanner mobile depuis un QR affiché côté web).
   * Le web crée une session pending, affiche un QR avec le `sessionCode`,
   * et poll le status. Le mobile authentifié scanne le QR et approuve.
   * Phase 1 : le serveur ne crée pas encore de session Better Auth pour
   * le web — il signale juste qu'une approbation a eu lieu. Le web
   * pourra ensuite proposer un sign-in léger (PIN) pré-rempli avec
   * l'email retourné. La fabrication d'une session Better Auth complète
   * via ce flow demande un plugin dédié (device-authorization) — laissé
   * pour la V2.
   */
  crossDeviceSession: defineTable({
    sessionCode: v.string(), // identifiant aléatoire encodé dans le QR
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("expired"),
      v.literal("cancelled"),
    ),
    // userId Better Auth — renseigné quand le mobile approuve.
    userId: v.optional(v.string()),
    // Email du citoyen approuvant — utilisé côté web pour pré-remplir
    // le sign-in PIN.
    approvedEmail: v.optional(v.string()),
    // Métadonnées (user agent web pour distinguer la session)
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    approvedAt: v.optional(v.number()),
  })
    .index("by_sessionCode", ["sessionCode"])
    .index("by_expiresAt", ["expiresAt"]),

  /**
   * État serveur, court et opaque, d'une récupération de PIN.
   *
   * Voie SMS (`pending` → `sent` → `verified`) : Bird conserve le code, cette
   * table ne stocke que le destinataire résolu côté serveur.
   *
   * Voie code provisoire (`issued` → `verified`) : un agent habilité émet le
   * code depuis la console quand l'envoi automatique est bloqué ; seule son
   * empreinte (`codeHash`, salée par l'utilisateur) est conservée, effacée dès
   * la vérification.
   *
   * Dans les deux cas, la vérification laisse l'empreinte d'un jeton de
   * réinitialisation à usage unique, consommé par `pinRecovery.resetPin`.
   */
  pinRecoveryChallenge: defineTable({
    requestId: v.string(),
    userId: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("issued"),
      v.literal("verified"),
    ),
    // Absent sur les lignes antérieures à la voie code provisoire (= SMS).
    channel: v.optional(v.union(v.literal("sms"), v.literal("admin_code"))),
    codeHash: v.optional(v.string()),
    issuedBy: v.optional(v.string()),
    attempts: v.number(),
    resetTokenHash: v.optional(v.string()),
    resetTokenExpiresAt: v.optional(v.number()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),

  /**
   * Changement de numéro initié par un utilisateur connecté. Le nouveau
   * numéro reste ici jusqu'à la confirmation Bird ; il n'est copié dans le
   * profil qu'après validation du code.
   */
  phoneChangeChallenge: defineTable({
    requestId: v.string(),
    userId: v.string(),
    phone: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent")),
    attempts: v.number(),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_requestId", ["requestId"])
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),

  // ─────────────────────────────────────────────────────────────────────
  // iCV — Constructeur de CV professionnel (cf. SPECS_FEATURE_ICV.md +
  // PLAN_BACKEND_ICV.md). Multi-CV : un user peut avoir N CV (max 10),
  // avec un CV principal (isDefault) + des variantes générées via
  // l'outil IA `optimize_job` ou importées.
  //
  // Les sections (experiences, education, skills, languages) sont des
  // tableaux embarqués dans le document — cardinalité bornée par usage
  // humain (≤ ~50 entrées), aucun risque d'atteindre la limite de 1 MB.
  // ─────────────────────────────────────────────────────────────────────
  citizenCv: defineTable({
    userId: v.string(),
    name: v.string(), // ex « CV principal », « CV - Chef de projet »
    isDefault: v.boolean(), // un seul `true` par user — appliqué en mutation
    source: v.union(...CV_SOURCES.map((s) => v.literal(s))),
    derivedFromCvId: v.optional(v.id("citizenCv")),

    // Coordonnées (champs racine éditables via cv.profile.upsert)
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
    summary: v.string(),
    portfolioUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    activeTheme: v.union(...CV_THEMES.map((t) => v.literal(t))),

    // Sections embarquées
    experiences: v.array(
      v.object({
        id: v.string(),
        position: v.number(), // multiples de 1000
        title: v.string(),
        company: v.string(),
        startDate: v.string(), // ISO YYYY-MM ou YYYY-MM-DD
        endDate: v.optional(v.string()),
        current: v.boolean(),
        description: v.string(),
      }),
    ),
    education: v.array(
      v.object({
        id: v.string(),
        position: v.number(),
        degree: v.string(),
        school: v.string(),
        year: v.string(),
        description: v.optional(v.string()),
      }),
    ),
    skills: v.array(
      v.object({
        id: v.string(),
        position: v.number(),
        name: v.string(),
        level: v.union(
          v.literal("Débutant"),
          v.literal("Intermédiaire"),
          v.literal("Avancé"),
          v.literal("Expert"),
        ),
      }),
    ),
    languages: v.array(
      v.object({
        id: v.string(),
        position: v.number(),
        name: v.string(),
        level: v.union(
          v.literal("A1"),
          v.literal("A2"),
          v.literal("B1"),
          v.literal("B2"),
          v.literal("C1"),
          v.literal("C2"),
          v.literal("Natif"),
        ),
      }),
    ),
    hobbies: v.array(v.string()),

    // Score de complétion (0..100) — dénormalisé, recalculé à chaque write
    completionScore: v.number(),

    // Soft delete (le multi-CV permet la suppression sans casser les liens
    // `derivedFromCvId` qui peuvent pointer vers ce CV depuis une variante)
    deletedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_default", ["userId", "isDefault"])
    .index("by_userId_deletedAt", ["userId", "deletedAt"]),

  /**
   * Cache des exports PDF générés pour un CV donné.
   * Permet de réutiliser le blob si le CV n'a pas changé depuis le dernier
   * export avec le même thème (clé = sha256(JSON canonique du CV + theme)).
   */
  citizenCvExport: defineTable({
    userId: v.string(),
    cvId: v.id("citizenCv"),
    theme: v.union(...CV_THEMES.map((t) => v.literal(t))),
    contentHash: v.string(), // hash 64 chars du couple (CV serialisé + theme)
    storageRef: v.id("_storage"),
    expiresAt: v.number(), // TTL 24h
    createdAt: v.number(),
  })
    .index("by_user_cv", ["userId", "cvId", "createdAt"])
    .index("by_hash", ["contentHash"]),

  /**
   * Trace asynchrone des appels IA iCV — pour rate-limit, audit, retry,
   * historique. Une ligne par appel (`cv.ai.improveSummary`, etc.).
   */
  citizenCvAiJob: defineTable({
    userId: v.string(),
    cvId: v.id("citizenCv"),
    feature: v.union(...CV_AI_FEATURES.map((f) => v.literal(f))),
    status: v.union(...CV_AI_STATUSES.map((s) => v.literal(s))),

    // Provider effectivement utilisé (audit + observabilité multi-provider)
    provider: v.optional(v.string()), // "gemini" | "anthropic" | "openai" | "ollama" | "mock"
    model: v.optional(v.string()), // ex "gemini-2.5-flash"

    // Entrée libre (paramètres feature-specific)
    input: v.optional(v.record(v.string(), v.any())),
    // Résultat structuré
    result: v.optional(v.record(v.string(), v.any())),
    // Pour optimize_job : pointe vers le CV dérivé créé
    derivedCvId: v.optional(v.id("citizenCv")),
    errorMessage: v.optional(v.string()),

    // Métriques
    tokensIn: v.optional(v.number()),
    tokensOut: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index("by_userId", ["userId", "createdAt"])
    .index("by_user_cv", ["userId", "cvId", "createdAt"])
    .index("by_user_cv_feature", ["userId", "cvId", "feature", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  /**
   * Identités créées par délégation (organisme habilité via API M2M).
   * Permet la traçabilité : quelle app a créé quelle identité, pour qui.
   */
  delegatedIdentity: defineTable({
    appClientId: v.string(),
    operatorUserId: v.string(),
    targetUserId: v.string(),
    targetProfileId: v.id("userProfile"),
    assignedLoa: v.union(v.literal(1), v.literal(2)),
    kycRequestId: v.optional(v.id("kycRequest")),
    /**
     * @deprecated NE PLUS ÉCRIRE. Contenait le mot de passe Better Auth du
     * compte délégué EN CLAIR, jusqu'à la réclamation. Le mot de passe initial
     * est désormais dérivé d'une clé d'environnement (cf.
     * delegate/actions.ts::deriveInitialPassword), donc plus rien de secret
     * n'est persisté ici. Le champ reste déclaré uniquement parce que des
     * documents existants le portent (Convex valide les documents stockés au
     * déploiement) — purge via `internal.delegate.mutations.purgeInitialSecrets`.
     */
    initialSecret: v.optional(v.string()),
    /**
     * SHA-256 du code de réclamation à usage unique remis au citoyen par
     * l'opérateur. Preuve de possession exigée par /api/claim/* : sans lui,
     * connaître le NIP (imprimé sur la carte) suffisait à s'emparer de
     * l'identité. Cf. lib/claimCode.ts.
     */
    claimCodeHash: v.optional(v.string()),
    claimCodeExpiresAt: v.optional(v.number()),
    /** Tentatives de code erroné — plafonnées pour rendre le brute-force vain. */
    claimAttempts: v.optional(v.number()),
    claimLockedUntil: v.optional(v.number()),
    status: v.union(v.literal("created"), v.literal("claimed")),
    claimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_appClientId", ["appClientId", "createdAt"])
    .index("by_targetUserId", ["targetUserId"])
    .index("by_status", ["status", "createdAt"]),

  /**
   * Demandes via formulaire de contact public (page /contact).
   * Pas d'auth requise.
   */
  contactRequest: defineTable({
    category: v.union(...CONTACT_CATEGORIES.map((c) => v.literal(c))),
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
    status: v.union(...CONTACT_STATUSES.map((s) => v.literal(s))),
    ip: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
    respondedBy: v.optional(v.string()),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"]),
})
