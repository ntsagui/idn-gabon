/**
 * Textes du tunnel d'onboarding et des écrans d'auth.
 * Comme `(public)/_content/fr.ts`, centralisé pour faciliter la
 * migration future vers next-intl.
 */

export const STEP_TOTAL = 4

export const onboardingHeader = {
  backToHome: "Retour à l'accueil",
  backToProfile: "Retour à la sélection du profil",
  backToIdentity: "Retour à l'identité",
  backToIdn: "Retour au choix de l'adresse",
  backToEnter: "Re-saisir le PIN",
} as const

export const profile = {
  meta: {
    title: "Choisir mon profil",
    description:
      "Sélectionnez votre profil pour démarrer la création de votre compte IDN.",
  },
  step: 1,
  title: "Quel est votre profil ?",
  sub: "Votre profil détermine les pièces demandées et les services accessibles.",
  options: [
    {
      value: "citizen" as const,
      label: "Citoyen Gabonais",
      sub: "CNI ou acte de naissance — Niveau 3 cible",
      loa: 3 as const,
    },
    {
      value: "resident" as const,
      label: "Résident",
      sub: "Carte de séjour + passeport — Niveau 2 cible",
      loa: 2 as const,
    },
    {
      value: "visitor" as const,
      label: "Visiteur Temporaire",
      sub: "Passeport + visa — Niveau 1",
      loa: 1 as const,
    },
  ],
  primary: "Continuer",
  back: "← Retour",
} as const

export const identity = {
  meta: {
    title: "Mon identité",
    description: "Saisissez votre identité pivot.",
  },
  step: 2,
  title: "Vos informations",
  sub: "Identité pivot — telles qu'elles figurent sur vos documents officiels.",
  fields: {
    firstName: { label: "Prénom", placeholder: "Aïssatou" },
    lastName: { label: "Nom", placeholder: "Mboumba" },
    dateOfBirth: { label: "Date de naissance" },
    gender: {
      label: "Genre",
      options: [
        { value: "F" as const, label: "Féminin" },
        { value: "M" as const, label: "Masculin" },
      ],
    },
    birthPlace: { label: "Lieu de naissance", placeholder: "Libreville" },
    phone: { label: "Numéro de téléphone", placeholder: "+241 06 22 14 89" },
    nip: {
      label: "NIP (Numéro d'Identification Personnel)",
      placeholder: "14 caractères",
      help: "Si vous en disposez déjà — délivré par le RBPP. Sert à la vérification d'identité.",
    },
    nationality: {
      label: "Nationalité",
      options: [
        { value: "GA", label: "Gabonaise" },
        { value: "CG", label: "Congolaise (Brazzaville)" },
        { value: "CD", label: "Congolaise (RDC)" },
        { value: "CM", label: "Camerounaise" },
        { value: "GQ", label: "Équato-guinéenne" },
        { value: "ST", label: "Santoméenne" },
        { value: "FR", label: "Française" },
        { value: "SN", label: "Sénégalaise" },
        { value: "CI", label: "Ivoirienne" },
        { value: "ML", label: "Malienne" },
        { value: "BJ", label: "Béninoise" },
        { value: "TG", label: "Togolaise" },
        { value: "BF", label: "Burkinabé" },
        { value: "NG", label: "Nigériane" },
        { value: "MA", label: "Marocaine" },
        { value: "CN", label: "Chinoise" },
        { value: "US", label: "Américaine" },
        { value: "GB", label: "Britannique" },
        { value: "JP", label: "Japonaise" },
      ],
    },
  },
  primary: "Continuer",
  back: "← Retour",
  validation: {
    required: "Champ requis.",
    dateInvalid: "Date invalide.",
    dateFuture: "La date de naissance doit être dans le passé.",
    nipInvalid:
      "Le NIP doit contenir exactement 14 caractères (chiffres ou lettres).",
  },
} as const

export const idnSignup = {
  meta: {
    title: "Votre adresse IDN",
    description: "Choisissez votre adresse @idn.ga.",
  },
  step: 3,
  title: "Votre adresse IDN",
  sub: "Choisissez l'adresse qui vous identifiera auprès de l'administration.",
  inputLabel: "Identifiant",
  inputPlaceholder: "prenom.nom",
  suggestionsLabel: "SUGGESTIONS",
  suggestionsTakenLabel: "DISPONIBLES POUR VOUS",
  badgeRecommended: "Recommandé",
  statusChecking: "Vérification…",
  statusAvailable: "Disponible — vous pouvez la réserver",
  statusTaken: "Cette adresse est déjà attribuée à un autre citoyen",
  statusInvalid:
    "Caractères autorisés : lettres minuscules, chiffres, points, tirets.",
  info: "L'adresse @idn.ga est hébergée sur le sol gabonais. Elle est définitive et reste valide à vie.",
  primary: "Réserver cette adresse",
  primarySubmitting: "Réservation…",
  errorTaken: "Cette adresse est déjà attribuée à un autre citoyen.",
  errorGeneric: "Impossible de créer le compte. Réessayez.",
  // Refus anti-doublon. Le texte ne révèle rien du compte existant — ni son
  // adresse, ni son identifiant : le refus ne doit pas transformer
  // l'inscription en annuaire interrogeable. Il indique en revanche une voie
  // de recours, parce qu'un homonyme réel doit pouvoir se faire ouvrir un
  // compte par un agent.
  errorIdentityVerified:
    "Une identité vérifiée correspond déjà à ces informations. Vérifiez votre saisie ; s'il s'agit bien de vos informations, contactez le support pour faire ouvrir votre compte.",
  errorNipVerified:
    "Ce NIP est déjà rattaché à une identité vérifiée. Vérifiez votre saisie ; s'il s'agit bien de votre numéro, contactez le support.",
  backToIdentity: "Corriger mes informations",
  termsPrefix: "J'accepte les ",
  termsLink: "conditions d'utilisation et la politique de confidentialité",
  validation: {
    termsRequired: "Vous devez accepter les conditions d'utilisation.",
  },
} as const

export const pin = {
  meta: {
    title: "Créer mon PIN",
    description:
      "Créez votre PIN à 6 chiffres pour l'accès rapide à votre compte IDN.",
  },
  step: 4,
  enterTitle: "Créer votre PIN",
  enterSub:
    "Un code à 6 chiffres pour les actions sensibles : signature, validation, accès rapide.",
  confirmTitle: "Confirmer votre PIN",
  confirmSub: "Saisissez à nouveau le même code pour confirmer.",
  primary: "Confirmer",
  primaryConfirm: "Confirmer",
  back: "← Retour",
  successToast: "Compte créé avec succès. Bienvenue sur IDN.",
  numpadAria: "Pavé numérique",
  backspaceAria: "Effacer le dernier chiffre",
  digitAria: (n: number) => `Chiffre ${n}`,
  dotsAria: (filled: number, total: number) =>
    `PIN saisi : ${filled} chiffre${filled > 1 ? "s" : ""} sur ${total}`,
  validation: {
    sixDigits: "Le PIN doit contenir exactement 6 chiffres.",
    weakSequence:
      "Suite trop évidente (par ex. 123456 ou 000000). Choisissez un autre PIN.",
    matchesDob: "Le PIN ne peut pas être votre date de naissance.",
    mismatch: "Les deux PIN ne correspondent pas.",
  },
} as const

export const signIn = {
  meta: {
    title: "Connexion",
    description: "Connectez-vous à votre compte IDN.",
  },
  title: "Connectez-vous",
  sub: "à votre compte Identité Numérique",
  handleLabel: "Identifiant IDN",
  handleHint: "Avec ou sans @idn.ga",
  handlePlaceholder: "prenom.nom",
  handleInvalid: "Identifiant IDN invalide.",
  passwordLabel: "Mot de passe",
  forgotLink: "Mot de passe oublié ?",
  primary: "Se connecter",
  primarySubmitting: "Connexion en cours…",
  continue: "Continuer",
  qrLabel: "OU",
  qrCta: "Scanner le QR depuis l'app mobile",
  qrTooltip: "Affichez un QR à scanner depuis votre téléphone",
  qrModalTitle: "Connexion par téléphone",
  qrModalSub:
    "Ouvrez l'app IDN sur votre téléphone, touchez « Scanner un QR » depuis le hub de connexion, puis pointez la caméra ici.",
  qrLoading: "Génération du code…",
  qrExpired: "Ce QR a expiré.",
  qrRefresh: "Régénérer le QR",
  qrCancel: "Annuler",
  qrApproved: "Téléphone approuvé !",
  qrApprovedSub: "Saisissez votre PIN pour terminer la connexion.",
  qrError: "Impossible d'établir une session. Réessayez.",
  twoFactorLabel: "Code à 6 chiffres",
  twoFactorHint:
    "Entrez le code généré par votre application d'authentification.",
  twoFactorPrimary: "Vérifier",
  signUpPrefix: "Pas encore de compte ? ",
  signUpLink: "Créer un compte IDN",
  claimPrefix: "Identité créée par un organisme ? ",
  claimLink: "Récupérer mon compte",
  errorInvalid: "Email ou mot de passe incorrect.",
  errorEmailNotVerified:
    "Veuillez vérifier votre adresse email avant de vous connecter.",
  errorGeneric: "Connexion impossible pour le moment. Réessayez.",
  // Étape PIN (sign-in)
  pinTitle: "Entrez votre PIN",
  pinSub: "Saisissez votre code à 6 chiffres pour vous connecter.",
  pinForgot: "PIN oublié ?",
  pinSetupRequired:
    "Ce compte n'a pas encore de PIN. Vérifiez votre numéro mobile pour en créer un.",
  pinSetupAction: "Configurer mon PIN",
  pinBack: "Modifier l'identifiant",
  pinPrimary: "Se connecter",
  pinUsePassword: "Utiliser mon mot de passe à la place",
  pinErrorInvalid: "Identifiant ou PIN incorrect. Réessayez.",
  pinErrorTooMany: "Trop de tentatives. Réessayez dans une minute.",
  emailStepTitle: "Connectez-vous",
  emailStepSub: "Saisissez votre identifiant IDN pour vous connecter.",
  passwordBack: "Utiliser mon PIN",
  // Aria du pavé numérique (réutilisés depuis l'onboarding)
  pinNumpadAria: "Pavé numérique",
  pinBackspaceAria: "Effacer le dernier chiffre",
  pinDigitAria: (n: number) => `Chiffre ${n}`,
  pinDotsAria: (filled: number, total: number) =>
    `PIN saisi : ${filled} chiffre${filled > 1 ? "s" : ""} sur ${total}`,
} as const

export const forgotPin = {
  title: "Récupérer votre PIN",
  requestSub:
    "Saisissez votre identifiant IDN. Si un numéro mobile compatible est associé au compte, un code sera envoyé par SMS.",
  identifierLabel: "Identifiant IDN",
  identifierHint: "Avec ou sans @idn.ga",
  requestPrimary: "Recevoir un code",
  sending: "Envoi en cours…",
  codeTitle: "Code reçu par SMS",
  codeSub:
    "Saisissez le code à 6 chiffres. L'envoi peut prendre quelques instants.",
  codeHelp:
    "Rien reçu ? Le compte peut demander une vérification supplémentaire.",
  supportLink: "Contacter le support",
  codeLabel: "Code SMS",
  verifyPrimary: "Vérifier le code",
  verifying: "Vérification…",
  codeError: "Code incorrect ou expiré. Recommencez si nécessaire.",
  newTitle: "Choisissez un nouveau PIN",
  newSub: "Le nouveau PIN doit contenir exactement 6 chiffres.",
  newLabel: "Nouveau PIN",
  confirmLabel: "Confirmer le nouveau PIN",
  mismatch: "Les deux PIN ne correspondent pas.",
  resetPrimary: "Enregistrer le nouveau PIN",
  resetting: "Enregistrement…",
  successTitle: "Votre PIN a été modifié",
  successSub:
    "Toutes les anciennes sessions ont été fermées. Vous pouvez maintenant vous reconnecter.",
  backToSignIn: "Retour à la connexion",
  restart: "Recommencer",
  genericError: "Impossible de poursuivre pour le moment. Réessayez.",
  existingCode: "J’ai déjà un code provisoire",
  existingCodeHint: "Utilisez le code remis par un agent habilité.",
  adminCodeTitle: "Code remis par un agent",
  adminCodeSub:
    "Saisissez le code à 6 chiffres que l’agent habilité vous a remis. Il est valable 15 minutes, pour trois essais au plus.",
  adminCodeLabel: "Code provisoire",
  adminCodeError:
    "Code incorrect, expiré ou déjà utilisé. Demandez un nouveau code à l’agent.",
} as const

export const forgotPassword = {
  meta: {
    title: "Mot de passe oublié",
    description:
      "Recevez un code par email pour réinitialiser votre mot de passe.",
  },
  title: "Réinitialiser votre mot de passe",
  sub: "Saisissez l'adresse email associée à votre compte. Vous recevrez un code à 6 chiffres pour choisir un nouveau mot de passe.",
  emailLabel: "Adresse email",
  primary: "Recevoir un code",
  primarySubmitting: "Envoi en cours…",
  existingCode: "J’ai déjà un code provisoire",
  existingCodeHint: "Utilisez le code remis par un agent habilité.",
  back: "← Retour à la connexion",
  successToast: "Code envoyé. Vérifiez votre boîte de réception.",
  errorGeneric: "Envoi impossible pour le moment. Réessayez.",
} as const

export const resetPassword = {
  meta: {
    title: "Nouveau mot de passe",
    description: "Choisissez un nouveau mot de passe pour votre compte IDN.",
  },
  title: "Nouveau mot de passe",
  sub: "Saisissez le code reçu ou remis par un agent habilité, puis choisissez un nouveau mot de passe.",
  otpLabel: "Code à 6 chiffres",
  passwordLabel: "Nouveau mot de passe",
  confirmLabel: "Confirmation",
  primary: "Réinitialiser",
  primarySubmitting: "Réinitialisation en cours…",
  successToast: "Mot de passe réinitialisé. Vous pouvez vous connecter.",
  errorInvalidCode: "Code incorrect ou expiré.",
  errorMismatch: "Les deux mots de passe ne correspondent pas.",
  errorGeneric: "Réinitialisation impossible. Réessayez.",
} as const

export const CLAIM_STEP_TOTAL = 3

export const claim = {
  meta: {
    title: "Récupérer mon identité numérique",
    description:
      "Récupérez l'accès à votre identité numérique créée par un organisme.",
  },
  search: {
    step: 1,
    title: "Retrouver mon identité",
    sub: "Saisissez le code de réclamation remis par l'agent, puis votre NIP ou votre nom et date de naissance.",
    claimCodeLabel: "Code de réclamation",
    claimCodePlaceholder: "Ex : K7M2-9XQ4-B3TF",
    claimCodeHint:
      "Ce code figure sur le document que l'agent vous a remis lors de votre enrôlement. Il est indispensable : il prouve que cette identité est bien la vôtre.",
    nipLabel: "NIP (14 caractères)",
    nipPlaceholder: "Ex : A1B2C3D4E5F6G7",
    orDivider: "ou rechercher par nom",
    firstNameLabel: "Prénom",
    lastNameLabel: "Nom",
    dateOfBirthLabel: "Date de naissance",
    primary: "Rechercher",
    primarySearching: "Recherche en cours…",
    notFound:
      "Aucune identité réclamable ne correspond à ce code et à ces informations. Vérifiez votre code de réclamation, ou rapprochez-vous de l'agent qui vous a enrôlé.",
    backLabel: "Retour à la connexion",
  },
  confirm: {
    step: 2,
    title: "Confirmer mon identité",
    sub: "Vérifiez que les informations ci-dessous correspondent bien à votre identité.",
    idnIdLabel: "Identifiant IDN",
    nameLabel: "Nom",
    loaLabel: "Niveau de confiance",
    primary: "C'est bien moi",
    backLabel: "Nouvelle recherche",
  },
  setup: {
    step: 3,
    title: "Configurer mon compte",
    sub: "Choisissez un mot de passe et un code PIN pour sécuriser votre compte.",
    passwordLabel: "Mot de passe",
    passwordHint: "Au moins 12 caractères.",
    confirmPasswordLabel: "Confirmer le mot de passe",
    pinLabel: "Code PIN à 6 chiffres",
    pinHint: "Utilisé pour valider les actions sensibles.",
    primary: "Activer mon compte",
    primarySubmitting: "Activation en cours…",
    errorMismatch: "Les deux mots de passe ne correspondent pas.",
    errorWeakPin: "Ce PIN est trop simple. Choisissez-en un autre.",
    errorGeneric: "Impossible d'activer le compte. Réessayez.",
    successToast:
      "Votre identité numérique est activée ! Connectez-vous pour continuer.",
    backLabel: "Retour à la confirmation",
  },
} as const
