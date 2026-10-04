/** Sommaire de la documentation : ordre, groupes, titres et descriptions. */

export type ArticleMeta = {
  slug: string
  title: string
  description: string
}

export type ArticleGroup = { title: string; items: ArticleMeta[] }

export const ARTICLE_GROUPS: ArticleGroup[] = [
  {
    title: "Premiers pas",
    items: [
      {
        slug: "demarrage-rapide",
        title: "Démarrage rapide (React)",
        description: "Ajouter « Se connecter avec IDN » à une application React avec @idn-ga/react.",
      },
      {
        slug: "enregistrer-une-application",
        title: "Enregistrer une application",
        description: "Compte développeur, client_id, URL de redirection, comptes de test et mise en production.",
      },
      {
        slug: "better-auth",
        title: "Intégration serveur (Better Auth)",
        description: "Brancher IDN comme fournisseur OAuth d'une application Better Auth avec @idn-ga/better-auth.",
      },
      {
        slug: "javascript",
        title: "JavaScript sans framework",
        description: "Utiliser directement le client @idn-ga/core : connexion, rappel, session, déconnexion.",
      },
    ],
  },
  {
    title: "Référence",
    items: [
      {
        slug: "scopes",
        title: "Scopes et claims",
        description: "Les scopes acceptés par IDN et les claims renvoyés par UserInfo pour chacun.",
      },
      {
        slug: "niveaux-de-garantie",
        title: "Niveaux de garantie (acr)",
        description: "eidas1, eidas2, eidas3 : exiger un niveau, le lire et proposer la vérification d'identité.",
      },
      {
        slug: "sdk-react",
        title: "@idn-ga/react",
        description: "IDNProvider, IDNSignInButton, IDNCallback, SignedIn, SignedOut, RequireLoA et les hooks.",
      },
      {
        slug: "sdk-core",
        title: "@idn-ga/core",
        description: "createIDNClient, ses options et ses méthodes, événements et utilitaires.",
      },
    ],
  },
  {
    title: "Guides",
    items: [
      {
        slug: "bouton-idn",
        title: "Bouton « Se connecter avec IDN »",
        description: "Variantes, tailles, libellés et règles d'usage du bouton, avec générateur de code.",
      },
      {
        slug: "webhooks",
        title: "Webhooks",
        description: "Recevoir les événements IDN : vérification de l'endpoint, signature, réessais, événement de test.",
      },
      {
        slug: "cles-api",
        title: "Clés API serveur",
        description: "Appels serveur à serveur hors session d'usager : création, scopes, rotation, révocation.",
      },
      {
        slug: "securite",
        title: "Bonnes pratiques de sécurité",
        description: "PKCE, secrets, validation des jetons et contrôle du niveau côté serveur.",
      },
    ],
  },
]

export const ARTICLES: ArticleMeta[] = ARTICLE_GROUPS.flatMap((g) => g.items)

export function neighbours(slug: string): { prev?: ArticleMeta; next?: ArticleMeta } {
  const index = ARTICLES.findIndex((a) => a.slug === slug)
  return { prev: ARTICLES[index - 1], next: ARTICLES[index + 1] }
}

export function groupOf(slug: string): string | undefined {
  return ARTICLE_GROUPS.find((g) => g.items.some((a) => a.slug === slug))?.title
}
