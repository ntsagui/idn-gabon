/**
 * Libellés des scopes. La LISTE fait foi côté serveur
 * (`developer/catalog.scopes`) ; ce fichier ne fournit que les textes. Un
 * scope ajouté au serveur sans libellé s'affiche quand même, avec son nom.
 */

export const OAUTH_SCOPE_INFO: Record<
  string,
  { label: string; description: string; claims: string[]; required?: boolean; sensitive?: boolean }
> = {
  openid: {
    label: "Identifiant OpenID",
    description: "Obligatoire. Identifiant stable et opaque de l'usager.",
    claims: ["sub"],
    required: true,
  },
  profile: {
    label: "Profil",
    description: "Nom, type de profil et niveau de garantie de la session.",
    claims: ["name", "given_name", "family_name", "profile_type", "loa", "acr"],
  },
  email: {
    label: "Adresse e-mail",
    description: "Adresse e-mail et statut de vérification.",
    claims: ["email", "email_verified"],
  },
  offline_access: {
    label: "Accès hors ligne",
    description: "Délivre un jeton de rafraîchissement (refresh token).",
    claims: [],
  },
  "idn:civil_status": {
    label: "État civil",
    description: "Date et lieu de naissance, sexe, nationalité et NIP.",
    claims: ["birthdate", "birth_place", "gender", "nationality", "nip"],
    sensitive: true,
  },
  "idn:iboite.read": {
    label: "iBoîte — lecture",
    description: "Consulter l'iBoîte de l'usager : compte, courriers, colis et messages.",
    claims: [],
    sensitive: true,
  },
  "idn:iboite.manage": {
    label: "iBoîte — gestion",
    description: "Mettre à jour les éléments de l'iBoîte de l'usager.",
    claims: [],
    sensitive: true,
  },
  "idn:iboite.send": {
    label: "iBoîte — envoi",
    description: "Envoyer depuis l'iBoîte de l'usager (messages, pièces jointes).",
    claims: [],
    sensitive: true,
  },
}

export const M2M_SCOPE_INFO: Record<string, string> = {
  "citizens:resolve": "Résoudre un usager à partir de son identifiant.",
  "idn:delegate:lookup": "Consulter une identité déléguée.",
  "idn:delegate:create": "Créer une identité déléguée pour un tiers.",
  "idn:delegate:status": "Suivre le statut d'une identité déléguée.",
  "idn:verification:list": "Consulter la file des demandes de vérification.",
  "idn:verification:claim": "Prendre en charge une demande de vérification.",
  "idn:verification:decide": "Décider d'une demande de vérification.",
  "idn:verification:media": "Voir les pièces d'une demande de vérification.",
  "idn:verification:join": "Rejoindre une vérification en visio.",
  "idn:iboite:letters:create": "Déposer des courriers iBoîte (serveur à serveur).",
}

export const LOA_INFO: Record<1 | 2 | 3, { acr: string; label: string; description: string }> = {
  1: {
    acr: "eidas1",
    label: "Niveau 1 · Faible",
    description: "Compte Identité Numérique avec adresse e-mail vérifiée.",
  },
  2: {
    acr: "eidas2",
    label: "Niveau 2 · Substantiel",
    description: "Identité vérifiée sur pièce d'identité et selfie.",
  },
  3: {
    acr: "eidas3",
    label: "Niveau 3 · Élevé",
    description: "Identité vérifiée en présence d'un agent habilité.",
  },
}
