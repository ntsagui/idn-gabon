/**
 * Strings FR iBoîte mobile.
 *
 * Aligné sur `apps/web/app/(citizen)/iboite/_content/fr.ts` (verbatim spec
 * §2 SPECS_FEATURES_CITIZEN.md). Centralisé pour faciliter la migration
 * future vers i18n et éviter la divergence avec le web.
 *
 * Convention : pas de paraphrase — les libellés sont la source de vérité
 * design (cf. instruction utilisateur `feedback_no_invented_text`).
 */

export const iboiteFr = {
  title: "iBoîte",
  subtitle: "Tes courriers, colis et emails",
  loading: "Chargement…",
  notAuthenticated: "Connecte-toi pour accéder à iBoîte.",
  noAccount:
    "Aucun compte iBoîte. Termine ton inscription pour activer ton adresse souveraine.",

  account: {
    listLabel: "TES BOÎTES",
    addBox: "Ajouter une boîte",
    copyAddress: "Copier l'adresse",
    pointRelais: "Point Relais idn.ga",
    configurePrompt: "Configurer mon adresse",
    configureHint: "Aucune adresse renseignée",
    editAddress: "Modifier mon adresse",
  },

  sections: {
    emails: "E-mails",
    courriers: "Courriers",
    colis: "Colis",
  },

  courriers: {
    folders: {
      inbox: "Réception",
      sent: "Expédiés",
      pending: "À traiter",
      trash: "Poubelle",
    },
    newLetter: "Nouveau courrier",
    actions: {
      reply: "Répondre",
      replyAll: "Répondre à tous",
      download: "Télécharger",
      downloadShort: "PDF",
      print: "Imprimer",
      toPending: "À traiter",
      delete: "Suppr.",
    },
    empty: "Aucun courrier dans ce dossier.",
    urgent: "URGENT",
    actionRequired: "Action requise",
    replyBy: (date: string) => `Réponse attendue avant le ${date}`,
    attachments: "PIÈCES JOINTES",
    notFound: "Courrier introuvable.",
    title: "Courrier",
  },

  colis: {
    title: "Mes Colis",
    empty: "Aucun colis pour le moment.",
    toPickUp: "À retirer",
    inTransit: "En transit",
    arrival: (date: string) => `Arrivée ${date}`,
    qrLabel: "POINT RELAIS IDN.GA",
    qrHint: "À présenter au retrait",
  },

  emails: {
    folders: {
      inbox: "Réception",
      starred: "Favoris",
      archive: "Archives",
      sent: "Envoyés",
      trash: "Corbeille",
    },
    newMessage: "Nouveau message",
    actions: {
      reply: "Répondre",
      replyAll: "Répondre à tous",
      forward: "Transférer",
      archive: "Archiver",
      delete: "Suppr.",
    },
    empty: "Aucun email dans ce dossier.",
    title: "Message",
    notFound: "Message introuvable.",
    attachment: "PIÈCE JOINTE",
    archiveSoon:
      "L’archivage sera proposé dans la prochaine version. En attendant, marque ce message comme favori (étoile) pour le retrouver facilement.",
    attachmentDownloadLabel: "Télécharger",
  },

  compose: {
    titleMessage: "Nouveau message",
    titleLetter: "Nouveau courrier",
    from: "De",
    to: "À",
    toPlaceholderEmail: "destinataire@…",
    toPlaceholderLetter: "login ou destinataire@idn.ga",
    name: "Nom",
    namePlaceholder: "Nom du destinataire (optionnel)",
    subject: "Objet",
    bodyEmail: "Ton message…",
    bodyLetter: "Rédige ton courrier…",
    attach: "Joindre",
    send: "Envoyer",
    sending: "…",
    errors: {
      noAccount: "Aucun compte iBoîte actif.",
      invalidRecipient: "Saisis une adresse email valide.",
      letterRecipient: "Saisis une adresse iBoîte (login ou alias @idn.ga).",
      subjectRequired: "Donne un objet à ton message.",
      bodyRequired: "Écris ton message.",
      bodyRequiredLetter: "Écris le contenu de ton courrier.",
      sendFailed: "Envoi impossible.",
    },
  },

  address: {
    title: "Configurer mon adresse",
    intro:
      "Au Gabon les adresses postales formelles sont rares. Nous utilisons ta position GPS pour localiser ton logement — tu peux compléter manuellement si besoin.",
    methodGps: "Utiliser ma position GPS",
    methodGpsHint: "Recommandé — précis et instantané",
    methodManual: "Saisir manuellement",
    locating: "Localisation en cours…",
    locatingHint:
      "Autorise la géolocalisation à l’invite système pour continuer.",
    resolved: "Adresse détectée",
    resolvedHint: "Vérifie les champs ci-dessous avant de confirmer.",
    district: "Quartier",
    districtPlaceholder: "ex. Akanda, Glass, Nzeng-Ayong",
    city: "Ville",
    cityPlaceholder: "ex. Libreville",
    postalCode: "Boîte postale (optionnel)",
    postalCodePlaceholder: "ex. BP 1000",
    country: "Pays",
    addressLine: "Adresse complète",
    addressLinePlaceholder: "Précise si besoin (point de repère, immeuble…)",
    useGps: "Réessayer la géolocalisation",
    confirm: "Enregistrer mon adresse",
    submitting: "Enregistrement…",
    cancel: "Annuler",
    error: {
      denied:
        "Géolocalisation refusée. Autorise-la dans les réglages ou saisis ton adresse à la main.",
      unavailable:
        "Géolocalisation impossible. Réessaie ou saisis à la main.",
      cityRequired:
        "Indique au moins ta ville ou active la géolocalisation.",
      saveFailed: "Réessaie plus tard.",
      accountMissing: "Compte iBoîte introuvable.",
    },
  },
} as const
