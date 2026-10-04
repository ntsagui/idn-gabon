/**
 * Textes de structure de l'espace contrôleur : coque, navigation et
 * en-têtes de page. Les textes propres à un écran vivent avec son composant.
 * Vouvoiement : le portail s'adresse à des agents.
 */

export const shell = {
  brand: "Identité Numérique",
  portal: "CONTRÔLE D'IDENTITÉ",
  roleLabel: "Contrôleur d'identité",
} as const

export const pages = {
  dashboard: {
    title: "Tableau de bord",
    kicker: "PILOTAGE",
    description: "Charge du jour, dossiers en attente et prochains entretiens.",
  },
  queue: {
    title: "File de demandes",
    kicker: "INSTRUCTION · NIVEAU 2",
    description: "Examinez les pièces, comparez-les aux données déclarées et décidez.",
  },
  agenda: {
    title: "Agenda des entretiens",
    kicker: "INSTRUCTION · NIVEAU 3 · HEURE DE LIBREVILLE",
    description: "Publiez vos disponibilités, planifiez les demandes et menez les entretiens vidéo.",
  },
  interview: {
    title: "Salle d'entretien",
    kicker: "ENTRETIEN NIVEAU 3",
  },
  scan: {
    title: "Contrôle d'identité",
    kicker: "CONTRÔLE TERRAIN",
    description: "Lisez le QR de présentation de l'app IDN, renouvelé toutes les 30 secondes.",
  },
  verify: {
    title: "Vérifier un acte officiel",
    kicker: "CONTRÔLE TERRAIN · SIGNATURE",
    description: "Contrôlez l'authenticité d'un acte émis par l'administration gabonaise.",
  },
  history: {
    title: "Historique des contrôles",
    kicker: "SUIVI",
    description: "Vos décisions, entretiens et contrôles, horodatés et exportables.",
  },
  settings: {
    title: "Paramètres",
    kicker: "COMPTE",
    description: "Votre compte, votre mot de passe et vos préférences d'affichage.",
  },
} as const

export const kycStatus = {
  pending: "Brouillon",
  submitted: "Déposée",
  under_review: "En revue",
  complement_required: "Complément demandé",
  approved: "Approuvée",
  rejected: "Refusée",
  expired: "Expirée",
} as const

export type KycStatus = keyof typeof kycStatus
