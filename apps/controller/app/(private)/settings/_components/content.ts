export const settings = {
  meta: { title: "Paramètres" },
  sub: "COMPTE",
  title: "Paramètres",
  tabs: {
    account: "Compte",
    preferences: "Préférences",
  },
  account: {
    title: "Informations du compte",
    sub: "Identité affichée dans l'espace contrôleur et utilisée pour l'audit.",
    nameLabel: "Nom",
    emailLabel: "Email",
    emailHelper:
      "Adresse fournie par l'administrateur ayant créé votre compte. Pour la modifier, contactez votre superviseur.",
    roleLabel: "Rôle",
    roleValue: "Contrôleur d'identité",
  },
  password: {
    title: "Mot de passe",
    sub: "Modifiez régulièrement votre mot de passe. Minimum 12 caractères.",
    cta: "Modifier",
    modalTitle: "Modifier le mot de passe",
    currentLabel: "Mot de passe actuel",
    newLabel: "Nouveau mot de passe",
    newHint: "Minimum 12 caractères. Mélangez lettres, chiffres et symboles.",
    submit: "Modifier",
    cancel: "Annuler",
    successToast: "Mot de passe modifié.",
    errorTooShort: "Le nouveau mot de passe doit contenir au moins 12 caractères.",
    errorSame: "Le nouveau mot de passe doit être différent de l'ancien.",
  },
  preferences: {
    title: "Préférences",
    sub: "Thème d'affichage et langue des communications.",
    language: {
      label: "Langue des communications",
      description: "Langue des e-mails et des notifications qui vous sont adressés.",
      options: [
        { value: "fr", label: "Français" },
        { value: "en", label: "English" },
      ],
    },
    theme: {
      label: "Thème",
      description: "Apparence claire, sombre ou automatique.",
      options: [
        { value: "light", label: "Clair" },
        { value: "dark", label: "Sombre" },
        { value: "auto", label: "Automatique" },
      ],
    },
    saveSuccessToast: "Préférences enregistrées.",
  },
} as const
