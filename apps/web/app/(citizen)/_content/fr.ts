/**
 * Textes des pages connectées du citoyen.
 * Centralisé pour faciliter la migration future vers next-intl.
 */

export const PROFILE_TYPE_LABELS = {
  citizen: "Citoyen Gabonais",
  resident: "Résident",
  visitor: "Visiteur Temporaire",
  developer: "Développeur",
} as const

export const citizenNav = {
  home: "Accueil",
  icarte: "iCarte",
  iboite: "iBoîte",
  idoc: "iDocument",
  icv: "iCV",
  profile: "Mon profil",
  consents: "Consentements",
  comingSoon: "Bientôt disponible",
} as const

export const userMenu = {
  ariaLabel: "Mon compte",
  dashboard: "Tableau de bord",
  icarte: "iCarte",
  iboite: "iBoîte",
  idoc: "iDocument",
  icv: "Mon CV (iCV)",
  profile: "Mon profil",
  consents: "Mes consentements",
  settings: "Paramètres",
  signOut: "Se déconnecter",
} as const

export const dashboard = {
  meta: {
    title: "Tableau de bord",
    description: "Tableau de bord de votre compte IDN.",
  },
  greeting: (firstName: string) => `Bonjour, ${firstName}`,
  welcome: "Bienvenue",
  profileEyebrow: "Mon compte IDN",
  idnIdLabel: "ID IDN",
  idnIdEmpty: "—",
  modulesEyebrow: "MON ESPACE PERSONNEL",
  modulesHint: "Vos modules IDN",
  servicesEyebrow: "SERVICES",
  recentEyebrow: "ACTIVITÉ RÉCENTE",
  recentEmpty: "Aucune activité récente.",
  shortcutsEyebrow: "RACCOURCIS",
  sessions: {
    eyebrow: "SESSIONS ACTIVES",
    countSingle: "1 appareil",
    countMany: (n: number) => `${n} appareils`,
    countEmpty: "Aucune session",
  },
  bellAria: "Notifications",
} as const

/**
 * Mapping des actions audit (cf. AUDIT_ACTIONS dans schema.ts) → libellé FR.
 * Affiché dans la liste d'activité récente.
 */
export const auditActionLabels: Record<string, string> = {
  login_success: "Connexion réussie",
  login_failure: "Échec de connexion",
  login_lockout: "Compte temporairement verrouillé",
  otp_sent: "Code OTP envoyé",
  otp_verified: "Code OTP vérifié",
  otp_expired: "Code OTP expiré",
  account_created: "Compte IDN créé",
  account_modified: "Profil modifié",
  account_disabled: "Compte désactivé",
  password_changed: "Mot de passe modifié",
  email_changed: "Adresse email modifiée",
  pin_changed: "PIN modifié",
  kyc_submitted: "Vérification d'identité envoyée",
  kyc_under_review: "Vérification en cours d'examen",
  kyc_approved: "Niveau de garantie augmenté",
  kyc_rejected: "Vérification refusée",
  consent_granted: "Consentement accordé",
  consent_revoked: "Consentement révoqué",
  partner_token_exchanged: "Connexion à une application partenaire",
  oauth_app_created: "Application OAuth créée",
  oauth_app_modified: "Application OAuth modifiée",
  oauth_app_disabled: "Application OAuth désactivée",
  session_revoked: "Session révoquée",
  session_revoked_global: "Toutes les autres sessions révoquées",
  admin_action: "Action administrateur",
  role_assigned: "Rôle attribué",
  role_revoked: "Rôle révoqué",
  identity_check_performed: "Vérification d'identité effectuée",
  signature_verified: "Signature vérifiée",
}

/**
 * Format relatif FR pour un timestamp :
 * - "Aujourd'hui HH:mm" si même jour
 * - "Hier HH:mm" si J-1
 * - "JJ mois" sinon (ex: "06 mai")
 */
const SHORT_MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avril",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
]
function pad(n: number): string {
  return n.toString().padStart(2, "0")
}
export function formatRelativeDate(timestamp: number): string {
  const d = new Date(timestamp)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  if (sameDay) return `Aujourd'hui ${time}`
  if (isYesterday) return `Hier ${time}`
  return `${pad(d.getDate())} ${SHORT_MONTHS_FR[d.getMonth()]}`
}

/**
 * Format date longue FR (ex: "22 avril 2026") — pour Verifié le.
 */
export function formatLongDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getDate()} ${SHORT_MONTHS_FR[d.getMonth()]?.replace(".", "")} ${d.getFullYear()}`
}

/**
 * Helper meta audit : formate les détails contextuels d'une entrée audit
 * en chaîne courte affichable à droite de la ligne.
 */
export function formatAuditMeta(
  action: string,
  metadata: Record<string, unknown> | undefined,
  ip: string | undefined,
): string {
  if (!metadata && !ip) return ""
  const parts: string[] = []
  if (metadata?.device && typeof metadata.device === "string") {
    parts.push(metadata.device)
  } else if (metadata?.appName && typeof metadata.appName === "string") {
    parts.push(metadata.appName)
  } else if (
    metadata?.scopes &&
    Array.isArray(metadata.scopes) &&
    metadata.scopes.length
  ) {
    parts.push(`scopes : ${metadata.scopes.join(", ")}`)
  } else if (metadata?.field && typeof metadata.field === "string") {
    parts.push(`champ : ${metadata.field}`)
  }
  if (ip && parts.length === 0) {
    parts.push(`IP ${ip}`)
  }
  return parts.join(" · ")
}

const KYC_DOCUMENT_LABELS: Record<string, string> = {
  cni_gabon: "CNI gabonaise",
  birth_certificate: "Acte de naissance",
  residence_card: "Carte de séjour",
  passport: "Passeport",
  visa: "Visa",
}

export function formatVerifiedDocuments(types: readonly string[]): string {
  if (!types.length) return "—"
  return types
    .map((t) => KYC_DOCUMENT_LABELS[t] ?? t)
    .filter(Boolean)
    .join(" · ")
}

/**
 * Modules personnels IDN (iCarte, iBoîte, iDocument, iCV).
 * Alignés sur HOME_MODULES de l'app mobile et la maquette CWHome.
 */
export const modules = [
  {
    key: "icarte",
    title: "iCarte",
    sub: "Cartes & wallet",
    icon: "wallet" as const,
    color: "#0E7C3A",
    bgLight: "#E6F2EA",
    bgDark: "#0F2A18",
    href: "/icarte" as const,
    badge: "Nouveau",
  },
  {
    key: "iboite",
    title: "iBoîte",
    sub: "Courriers · emails",
    icon: "inbox" as const,
    color: "#3b82f6",
    bgLight: "#E6EEF7",
    bgDark: "#10243A",
    href: "/iboite" as const,
    badge: "Nouveau",
  },
  {
    key: "idoc",
    title: "iDocument",
    sub: "Documents archivés",
    icon: "folder" as const,
    color: "#a855f7",
    bgLight: "#F3E8FF",
    bgDark: "#2A1542",
    href: "/idoc" as const,
    badge: "Nouveau",
  },
  {
    key: "icv",
    title: "iCV",
    sub: "Mon CV en ligne",
    icon: "cv" as const,
    color: "#EC4899",
    bgLight: "#FCE7F3",
    bgDark: "#2A1426",
    href: "/icv" as const,
    badge: "Nouveau",
  },
] as const

export const services = [
  {
    key: "icv",
    title: "iCV",
    sub: "Mon CV en ligne",
    loa: 1 as const,
    icon: "cv" as const,
    href: "/icv" as const,
  },
  {
    key: "evisa",
    title: "e-Visa",
    sub: "Statut : actif",
    loa: 1 as const,
    icon: "doc" as const,
  },
  {
    key: "carte-sejour",
    title: "Carte de séjour",
    sub: "Renouvellement",
    loa: 2 as const,
    icon: "shield" as const,
  },
  {
    key: "etat-civil",
    title: "État civil",
    sub: "Acte de naissance",
    loa: 3 as const,
    icon: "user" as const,
  },
  {
    key: "bourses",
    title: "Bourses étudiantes",
    sub: "Min. enseign. sup.",
    loa: 3 as const,
    icon: "mail" as const,
  },
  {
    key: "impots",
    title: "Impôts.ga",
    sub: "DGI — déclarations",
    loa: 2 as const,
    icon: "doc" as const,
  },
  {
    key: "sante",
    title: "Santé.ga",
    sub: "Portail e-santé",
    loa: 3 as const,
    icon: "user" as const,
  },
] as const

export const quickActions = {
  consents: {
    label: "Consentements",
    sub: "4 apps autorisées",
  },
  presentId: {
    label: "Présenter mon ID",
    sub: "QR sécurisé",
    disabledTooltip: "Bientôt disponible",
  },
} as const

export const kycPromo = {
  title: "Vérifiez votre identité",
  sub: (nextLevel: number) =>
    `Passez au Niveau ${nextLevel} pour débloquer plus de services administratifs.`,
  cta: "Démarrer",
  comingSoonTooltip: "Bientôt disponible",
} as const

export const profile = {
  meta: {
    title: "Mon profil",
    description: "Détails de votre identité numérique IDN.",
  },
  edit: "Modifier",
  editDisabledTooltip: "Bientôt disponible",
  editPhoto: {
    aria: "Modifier la photo de profil",
    selectFile: "Choisir une image",
    cropTitle: "Recadrer la photo",
    cropHelp: "Centrez votre visage dans le cadre.",
    cancel: "Annuler",
    save: "Enregistrer",
    successToast: "Photo mise à jour.",
    errorToast: "Impossible de mettre à jour la photo.",
    invalidType: "Format non supporté. Choisissez une image (JPEG, PNG, WebP).",
    tooLarge: "Image trop volumineuse (max 5 Mo).",
  },
  pivot: {
    eyebrow: "IDENTITÉ PIVOT",
    rows: {
      firstName: "Prénom",
      lastName: "Nom",
      dateOfBirth: "Date de naissance",
      birthPlace: "Lieu de naissance",
      nationality: "Nationalité",
      phone: "Téléphone",
      phoneEmpty: "Non renseigné",
      phoneVerified: "Vérifié",
      phoneUnverified: "À vérifier",
      idnId: "ID IDN",
      nip: "NIP (RBPP)",
      nipEmpty: "Non renseigné",
    },
  },
  security: {
    eyebrow: "SÉCURITÉ",
    rows: {
      password: "Mot de passe",
      passwordValue: "Modifiable depuis Paramètres",
      pin: "PIN à 6 chiffres",
      pinConfiguredValue: "Configuré · ••••••",
      pinNotConfiguredValue: "Non configuré",
      twoFactor: "Authentification 2FA",
      twoFactorValue: "Non configurée",
      sessions: "Sessions actives",
      sessionsValueSingle: "1 appareil",
      sessionsValueMany: (n: number) => `${n} appareils`,
      sessionsValueEmpty: "Aucune",
    },
  },
  verification: {
    eyebrow: "VÉRIFICATION",
    rows: {
      currentLevel: "Niveau actuel",
      currentLevelValue: (loa: number) => `Niveau ${loa}`,
      verifiedOn: "Vérifié le",
      verifiedOnEmpty: "—",
      documents: "Documents validés",
      documentsEmpty: "—",
    },
  },
  upgradeCta: (nextLevel: number) => `Passer au Niveau ${nextLevel}`,
} as const

export const kyc = {
  meta: {
    title: "Vérifier mon identité",
    description: "Démarrez la vérification de niveau 2 (LoA 2).",
  },
  intro: {
    eyebrow: "VÉRIFICATION D'IDENTITÉ · NIVEAU 2",
    title: "Passons au Niveau 2",
    sub: "Trois étapes pour passer du Niveau 1 (email vérifié) au Niveau 2 (substantiel). Comptez environ 5 minutes.",
    steps: [
      {
        number: "01",
        icon: "doc" as const,
        title: "Document d'identité",
        body: "Photographiez votre CNI gabonaise recto-verso. Cadrage automatique.",
      },
      {
        number: "02",
        icon: "camera" as const,
        title: "Selfie vivant",
        body: "Détection de présence + face match avec le document.",
      },
      {
        number: "03",
        icon: "check" as const,
        title: "Validation",
        body: "Revue automatique puis manuelle si nécessaire (24-48h).",
      },
    ],
    statusTodo: "À FAIRE",
    statusInProgress: "EN COURS",
    statusDone: "FAIT",
    mobilePromo: {
      body: "Le KYC peut s'effectuer plus confortablement depuis l'app mobile (caméra). Voulez-vous y continuer ?",
      cta: "Continuer sur mobile",
    },
    cta: "Démarrer ici",
    chooseDocLabel: "Type de document",
    docOptions: [
      { value: "cni_gabon" as const, label: "CNI gabonaise" },
      { value: "passport" as const, label: "Passeport" },
      { value: "residence_card" as const, label: "Carte de séjour" },
      { value: "birth_certificate" as const, label: "Acte de naissance" },
    ],
  },
  document: {
    title: "Photographiez votre document",
    sub: "Posez le document à plat sur une surface contrastée. Cadrez bien les bords.",
    front: "Recto",
    back: "Verso (optionnel)",
    addPhoto: "Ajouter une photo",
    replacePhoto: "Remplacer",
    next: "Continuer",
    uploadError: "Impossible de téléverser l'image.",
    requiredFront: "Recto requis.",
  },
  selfie: {
    title: "Prenez un selfie",
    sub: "Regardez l'objectif et placez votre visage dans le cadre. Éclairez bien votre visage.",
    capture: "Prendre la photo",
    retake: "Reprendre",
    submit: "Envoyer ma demande",
    cameraError: "Impossible d'accéder à la caméra. Vérifiez les permissions.",
    submitError: "Impossible d'envoyer la demande.",
  },
  status: {
    title: "Statut de votre demande",
    pending: {
      title: "En attente d'envoi",
      sub: "Complétez les étapes pour soumettre votre demande.",
    },
    submitted: {
      title: "Demande envoyée",
      sub: "Votre dossier passe en revue automatique. Vous recevrez une notification dans quelques minutes.",
    },
    under_review: {
      title: "En cours d'examen",
      sub: "Un contrôleur examine votre demande. Délai indicatif : 24h ouvrées.",
    },
    approved: {
      title: "Niveau 2 accordé",
      sub: "Félicitations ! Votre identité est désormais vérifiée. Plus de services accessibles.",
    },
    rejected: {
      title: "Demande refusée",
      sub: "Votre demande n'a pas pu être validée. Voir le motif et réessayez.",
    },
    expired: {
      title: "Demande expirée",
      sub: "Veuillez recommencer.",
    },
    complement_required: {
      title: "Complément demandé",
      sub: "Le contrôleur a besoin d'éléments supplémentaires. Lisez son message et ré-uploadez la pièce concernée.",
    },
    backToProfile: "Retour au profil",
    restart: "Recommencer",
    submitNow: "Soumettre maintenant",
  },
} as const

export const kycActiveCard = {
  eyebrow: "DEMANDE KYC EN COURS",
  status: {
    pending: { title: "Brouillon de demande", sub: "Reprenez là où vous vous êtes arrêté." },
    submitted: { title: "Demande envoyée", sub: "Revue automatique en cours." },
    under_review: {
      title: "En cours d'examen",
      sub: "Un contrôleur examine votre dossier (24h indicatif).",
    },
    complement_required: {
      title: "Complément demandé",
      sub: "Lisez le message du contrôleur et ré-uploadez la pièce concernée.",
    },
    rejected: {
      title: "Demande refusée",
      sub: "Consultez le motif et relancez une nouvelle demande.",
    },
  } as Record<string, { title: string; sub: string }>,
  cta: "Voir la demande",
} as const

export const kycRequestPage = {
  meta: {
    title: "Ma demande KYC",
    description:
      "Statut détaillé de votre demande de passage de niveau, documents transmis et historique.",
  },
  backLink: "Retour au tableau de bord",
  title: "Demande de vérification d'identité",
  refLabel: "Référence",
  documentTypeLabels: {
    cni_gabon: "CNI gabonaise",
    passport: "Passeport",
    residence_card: "Carte de séjour",
    birth_certificate: "Acte de naissance",
    visa: "Visa",
  } as Record<string, string>,
  documentsTitle: "Documents transmis",
  documentsEmpty: "Aucun document encore associé à cette demande.",
  slots: {
    front: "Recto",
    back: "Verso",
    selfie: "Selfie",
  },
  timeline: {
    title: "Historique de la demande",
    empty: "Aucun événement enregistré pour le moment.",
    actions: {
      kyc_submitted: "Demande envoyée",
      kyc_under_review: "Mise en revue",
      kyc_complement_requested: "Complément demandé",
      kyc_complement_provided: "Complément envoyé",
      kyc_approved: "Demande approuvée",
      kyc_rejected: "Demande refusée",
    } as Record<string, string>,
  },
  complement: {
    title: "Message du contrôleur",
    helper:
      "Ré-uploadez la pièce ou le selfie demandé puis renvoyez la demande pour examen.",
    replaceFront: "Remplacer le recto",
    replaceBack: "Remplacer le verso",
    replaceSelfie: "Remplacer le selfie",
    submitCta: "Renvoyer pour examen",
    submitErrorIncomplete: "Recto et selfie sont requis.",
    submitSuccessToast: "Demande renvoyée pour examen.",
  },
  rejection: {
    title: "Motif du refus",
    restart: "Recommencer une demande",
  },
  approved: {
    callout:
      "Félicitations, votre demande a été approuvée. Votre niveau de garantie a été mis à jour.",
  },
} as const

export const settings = {
  meta: {
    title: "Paramètres",
    description: "Sécurité, notifications, préférences et données personnelles.",
  },
  title: "Paramètres",
  tabs: {
    security: "Sécurité",
    sessions: "Sessions",
    notifications: "Notifications",
    preferences: "Préférences",
    documents: "Documents",
    activity: "Activité",
    privacy: "Confidentialité",
  },
  security: {
    title: "Sécurité",
    sub: "Mot de passe, PIN, authentification à deux facteurs.",
    password: {
      title: "Mot de passe",
      sub: "Modifié il y a longtemps. Choisissez-en un nouveau pour renforcer votre compte.",
      cta: "Modifier",
      modalTitle: "Modifier le mot de passe",
      currentLabel: "Mot de passe actuel",
      newLabel: "Nouveau mot de passe",
      newHint: "Minimum 12 caractères. Mélangez lettres, chiffres et symboles.",
      submit: "Modifier",
      cancel: "Annuler",
      successToast: "Mot de passe modifié.",
    },
    pin: {
      title: "Code PIN à 6 chiffres",
      subConfigured: "Configuré. Utilisé pour signer les actions sensibles.",
      subNotConfigured: "Non configuré. Définissez un PIN pour les actions sensibles.",
      cta: "Modifier",
      ctaDefine: "Définir",
      modalTitle: "Modifier le PIN",
      currentLabel: "PIN actuel",
      newLabel: "Nouveau PIN",
      confirmLabel: "Confirmer le nouveau PIN",
      newHint: "6 chiffres. Évitez les suites évidentes (123456, 000000) et votre date de naissance.",
      submit: "Modifier",
      cancel: "Annuler",
      successToast: "PIN modifié.",
    },
    nip: {
      title: "NIP (Numéro d'Identification Personnel)",
      subConfigured: "Configuré. Identifiant RBPP à 14 caractères.",
      subNotConfigured: "Non renseigné. Ajoutez votre NIP délivré par le RBPP.",
      cta: "Modifier",
      ctaDefine: "Ajouter",
      modalTitle: "Modifier le NIP",
      label: "NIP",
      hint: "14 caractères alphanumériques, tel qu'il figure sur votre document RBPP.",
      submit: "Enregistrer",
      cancel: "Annuler",
      successToast: "NIP mis à jour.",
      validationError: "Le NIP doit contenir exactement 14 caractères (lettres ou chiffres).",
    },
    twoFactor: {
      title: "Authentification à deux facteurs",
      sub: "Ajoute une étape de vérification (TOTP) à chaque connexion.",
      ctaDisabled: "Configurer",
      tooltip: "Bientôt disponible",
    },
  },
  sessions: {
    title: "Appareils & sessions",
    sub: "Voyez où vous êtes connecté·e. Révoquez les sessions non reconnues.",
    countSingle: "1 session active",
    countMany: (n: number) => `${n} sessions actives`,
    countEmpty: "Aucune session active",
    current: "Session courante",
    revokeAllOthers: "Tout déconnecter sauf actuelle",
    revokeAllSuccess: "Sessions déconnectées.",
    deviceFallback: "Appareil inconnu",
    revoke: "Déconnecter",
    revokeSuccessToast: "Session déconnectée.",
    confirmAllOthersTitle: "Déconnecter toutes les autres sessions ?",
    confirmAllOthersBody:
      "Tous les autres appareils connectés à votre compte seront immédiatement déconnectés.",
  },
  notifications: {
    title: "Notifications",
    sub: "Choisissez les événements qui vous notifient et les canaux utilisés.",
    saveSuccessToast: "Préférences enregistrées.",
    categories: {
      security: { label: "Sécurité", help: "Connexions, changements de mot de passe / PIN, alertes." },
      kyc: { label: "Vérification d'identité", help: "État du KYC, montée de niveau de garantie." },
      consent: { label: "Consentements", help: "Accès accordé ou révoqué à une application." },
      comms: { label: "Communications", help: "Nouvelles fonctionnalités, infos institutionnelles." },
    },
    channels: { email: "Email", inApp: "In-app" },
  },
  preferences: {
    title: "Préférences",
    sub: "Langue d'interface, thème, accessibilité.",
    language: {
      label: "Langue",
      options: [
        { value: "fr", label: "Français" },
        { value: "en", label: "English" },
      ],
    },
    theme: {
      label: "Thème",
      options: [
        { value: "light", label: "Clair" },
        { value: "dark", label: "Sombre" },
        { value: "auto", label: "Automatique" },
      ],
    },
    saveSuccessToast: "Préférences enregistrées.",
  },
  documents: {
    title: "Mes documents",
    sub: "Pièces fournies à IDN — stockées chiffrées, utilisées uniquement pour vérifications.",
    empty: "Aucun document enregistré.",
    types: {
      profilePhoto: "Photo de profil",
      kycDocFront: "Document d'identité (recto)",
      kycDocBack: "Document d'identité (verso)",
      selfie: "Selfie de vérification",
      attestation: "Attestation IDN",
    } as Record<string, string>,
  },
  activity: {
    title: "Historique d'activité",
    sub: "Tous les événements liés à votre compte. Conservés 5 ans (audit légal).",
    empty: "Aucune activité enregistrée.",
    filters: {
      all: "Tous",
      auth: "Connexions",
      consent: "Consentements",
      kyc: "Vérifications",
      security: "Sécurité",
    },
  },
  privacy: {
    title: "Données & confidentialité",
    sub: "Visualisez, exportez ou supprimez les données de votre compte.",
    export: {
      title: "Télécharger une copie",
      sub: "Recevez par email un export ZIP de toutes vos données IDN. Disponible 24h.",
      cta: "Demander",
      successToast: "Export demandé. Vous recevrez un email avec le lien.",
    },
    deletion: {
      title: "Supprimer mon compte",
      sub: "Action irréversible après 30 jours. Anonymisation des logs d'audit conservée 5 ans (loi).",
      cta: "Supprimer",
      modalTitle: "Confirmer la suppression du compte",
      modalBody:
        "Cette action est irréversible après 30 jours. Pour confirmer, saisissez votre adresse email.",
      confirmLabel: "Adresse email",
      submit: "Supprimer mon compte",
      cancel: "Annuler",
      successToast: "Demande de suppression enregistrée.",
    },
  },
} as const

export const profileEdit = {
  meta: {
    title: "Modifier mon profil",
    description: "Mettez à jour votre identité pivot IDN.",
  },
  title: "Modifier mon profil",
  sub: "Mettez à jour vos informations d'identité pivot. Une modification importante peut nécessiter une nouvelle vérification d'identité.",
  back: "Retour",
  fields: {
    firstName: { label: "Prénom", placeholder: "Prénom" },
    lastName: { label: "Nom", placeholder: "Nom" },
    dateOfBirth: { label: "Date de naissance" },
    gender: {
      label: "Genre",
      options: [
        { value: "F" as const, label: "Féminin" },
        { value: "M" as const, label: "Masculin" },
        { value: "O" as const, label: "Autre" },
        { value: "N" as const, label: "Préfère ne pas dire" },
      ],
    },
    birthPlace: { label: "Lieu de naissance", placeholder: "Lieu de naissance" },
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
    phone: {
      label: "Numéro de téléphone",
      placeholder: "+241",
      send: "Envoyer le code",
      codeLabel: "Code reçu par SMS",
      codeSub: (maskedPhone: string) => `Code envoyé au ${maskedPhone}`,
      verify: "Valider",
      success: "Numéro enregistré.",
      invalidCode: "Code incorrect ou expiré.",
    },
  },
  primary: "Enregistrer",
  cancel: "Annuler",
  successToast: "Profil mis à jour.",
  errorToast: "Impossible de mettre à jour le profil.",
  validation: {
    required: "Champ requis.",
    dateInvalid: "Date invalide.",
    dateFuture: "La date de naissance doit être dans le passé.",
  },
} as const

export const consents = {
  meta: {
    title: "Mes consentements",
    description:
      "Applications et services ayant accès à vos données IDN. Révocable à tout moment.",
  },
  title: "Consentements",
  sub: (count: number) =>
    `${count} application${count > 1 ? "s" : ""} ${count > 1 ? "ont" : "a"} accès à vos données IDN. Révocable à tout moment.`,
  subEmpty:
    "Aucune application n'a encore accès à vos données IDN. Lorsque vous autoriserez un service à utiliser votre identité, il apparaîtra ici.",
  grantedOn: (date: string) => `autorisé le ${date}`,
  revoke: "Révoquer",
  revokeSuccessToast: "Consentement révoqué.",
  revokeErrorToast: "Impossible de révoquer ce consentement.",
  confirmRevokeTitle: (appName: string) =>
    `Révoquer l'accès de ${appName} ?`,
  confirmRevokeBody:
    "Cette application n'aura plus accès à vos données IDN. Vous pourrez l'autoriser à nouveau plus tard.",
  confirmRevokeAction: "Révoquer",
  confirmCancel: "Annuler",
  emptyTitle: "Aucun consentement actif",
  emptySub:
    "Vous n'avez encore autorisé aucune application à accéder à vos données IDN.",
} as const

export const sessions = {
  confirmRevokeTitle: (device: string) =>
    `Déconnecter ${device} ?`,
  confirmRevokeBody:
    "Cet appareil sera immédiatement déconnecté. Il devra à nouveau saisir vos identifiants pour accéder à votre compte IDN.",
  confirmRevokeAction: "Déconnecter",
  confirmCancel: "Annuler",
  revokeSuccessToast: "Session déconnectée.",
} as const
