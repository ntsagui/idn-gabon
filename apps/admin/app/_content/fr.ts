/**
 * Chaînes françaises partagées de la console d'administration.
 *
 * Origine : maquettes ressources/interfaces/project/idn-desktop.jsx. Les
 * chaînes propres à une seule page vivent dans cette page.
 */

export const fr = {
  settings: {
    account: {
      title: "Identité",
      sub: "Informations administratives du compte.",
      nameLabel: "Nom complet",
      emailLabel: "Adresse e-mail",
      emailHelper: "Utilisée pour la connexion et les notifications.",
      roleLabel: "Rôle",
      roleValue: "Administrateur",
    },
    password: {
      title: "Mot de passe",
      sub: "Choisissez un mot de passe fort, propre à votre compte administrateur.",
      newHint: "Au moins 12 caractères. Différent de l'ancien.",
      cta: "Changer",
      modalTitle: "Changer de mot de passe",
      currentLabel: "Mot de passe actuel",
      newLabel: "Nouveau mot de passe",
      submit: "Mettre à jour",
      cancel: "Annuler",
      successToast: "Mot de passe mis à jour.",
      errorTooShort: "Au moins 12 caractères requis.",
      errorSame: "Le nouveau mot de passe doit être différent de l'ancien.",
    },
    preferences: {
      title: "Préférences",
      sub: "Langue de l'interface et thème.",
      saveSuccessToast: "Préférence enregistrée.",
      theme: {
        label: "Thème",
        description: "Clair, sombre, ou suivant les préférences système.",
        options: [
          { value: "light", label: "Clair" },
          { value: "dark", label: "Sombre" },
          { value: "auto", label: "Système" },
        ],
      },
    },
  },

  signIn: {
    title: "Console administrateur",
    subtitle: "Réservé aux opérateurs IDN.",
    emailLabel: "Email",
    passwordLabel: "Mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    submit: "Se connecter",
    submitting: "Connexion…",
    errorTitle: "Connexion impossible",
    errorInvalid: "Email ou mot de passe incorrect.",
    errorForbidden:
      "Ce compte n'a pas le rôle administrateur requis pour accéder à la console.",
    errorGeneric:
      "Impossible de vous connecter pour le moment. Réessayez dans un instant.",
  },

  appDetail: {
    delegation: {
      title: "Délégation d'identité",
      description:
        "Autoriser cette application à créer des identités numériques pour le compte de citoyens.",
      enabled: "Activée",
      disabled: "Désactivée",
      maxLoa: "Niveau max. assignable",
      loa1: "Niveau 1 — Pivot seul",
      loa2: "Niveau 2 — Pièce d'identité vérifiée",
      enable: "Activer la délégation",
      disable: "Désactiver la délégation",
      historyTitle: "Identités créées",
      emptyHistory: "Aucune identité créée par cette application.",
      cols: {
        idnId: "IDN ID",
        name: "NOM",
        loa: "NIVEAU",
        status: "STATUT",
        date: "DATE",
      },
      statusCreated: "En attente",
      statusClaimed: "Réclamée",
    },
  },

  users: {
    actions: {
      anonymize: "Anonymiser",
      delete: "Supprimer",
      anonymizeTitle: "Anonymiser ce compte",
      anonymizeBody:
        "Les données personnelles (identité pivot, KYC, iBoîte, iDoc, iCV, iCarte) sont effacées et les sessions révoquées. Le compte Better Auth survit : le handle @idn.ga reste réservé et ne pourra pas être réattribué.",
      deleteTitle: "Supprimer définitivement ce compte",
      deleteBody:
        "Le compte Better Auth est supprimé en plus des données personnelles. Le handle @idn.ga redevient disponible et pourra être réattribué à quelqu'un d'autre. Cette action est irréversible.",
      auditNote:
        "Les journaux d'audit sont conservés dans les deux cas — 5 ans, loi 001/2011.",
      confirmLabel: (id: string) => `Saisissez « ${id} » pour confirmer`,
      reasonLabel: "Motif (facultatif, journalisé)",
      cancel: "Annuler",
      anonymized: "Compte anonymisé.",
      deleted: "Compte supprimé définitivement.",
    },
  },

  duplicates: {
    emptyTitle: "Aucun doublon détecté",
    emptyBody:
      "Aucun compte ne partage nom, prénom et date de naissance avec un autre. Les comptes sans identité pivot renseignée ne sont pas comparables et n'apparaissent pas ici.",
    groupCount: (n: number) => (n === 1 ? "1 compte" : `${n} comptes`),
    bornOn: "né(e) le",
    oldest: "Plus ancien",
    bestLoa: "Mieux vérifié",
    kycYes: "KYC",
    truncated:
      "Rapport partiel : le balayage a atteint sa limite, des doublons peuvent manquer.",

    signals: {
      title: "Signalements à arbitrer",
      sub: "Rapprochements détectés à l'inscription ou pendant la vérification.",
      empty: "Aucun signalement en attente.",
      // Chaque libellé dit sur quoi repose le rapprochement : c'est ce qui
      // permet à l'administrateur de juger de sa force avant de trancher.
      source: {
        pivot: "Même nom, prénom et date de naissance",
        nip: "Même NIP",
        face: "Même visage",
        document: "Même pièce d'identité",
      },
      // Le score n'accompagne que le signal biométrique : c'est le seul qui
      // repose sur une distance et non sur une égalité.
      similarity: (n: number) => `similarité ${(n * 100).toFixed(0)} %`,
      detectedOn: "détecté le",
      deletedAccount: "compte supprimé",
      confirm: "Confirmer le doublon",
      dismiss: "Écarter",
      // La résolution ne touche à aucun compte : le dire évite qu'un
      // administrateur croie avoir supprimé quelque chose en fermant un
      // dossier.
      resolveHint:
        "Fermer un signalement ne modifie aucun compte : la suppression reste une action distincte.",
    },
  },

} as const
