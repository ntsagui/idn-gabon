import { oneTimeToken } from "better-auth/plugins"

/**
 * Plugin `oneTimeToken` de la reprise de session partenaire (`/auth-continue`).
 *
 * POURQUOI UN EMBALLAGE. Better Auth fusionne les endpoints de tous les
 * plugins dans UN objet indexé par leur nom de clé (better-auth/dist/api/
 * index.mjs → getEndpoints, `{ ...acc, ...plugin.endpoints }`). Or
 * `crossDomain()` de @convex-dev/better-auth déclare lui aussi une clé
 * `verifyOneTimeToken` (pour `/cross-domain/one-time-token/verify`). Déclaré
 * après, il écrasait celle de `oneTimeToken()` : la route
 * `POST /one-time-token/verify` disparaissait (404), `generate` restait en
 * place. Chaque citoyen inscrit depuis consulat.ga obtenait donc un jeton que
 * `/auth-continue` ne pouvait plus échanger — « La connexion automatique a
 * échoué », inscription bloquée.
 *
 * On renomme donc la clé du verify ; le chemin HTTP, lui, ne change pas.
 */
export function partnerHandoffOneTimeToken() {
  const plugin = oneTimeToken()
  const { generateOneTimeToken, verifyOneTimeToken } = plugin.endpoints
  return {
    ...plugin,
    endpoints: {
      generateOneTimeToken,
      verifyPartnerOneTimeToken: verifyOneTimeToken,
    },
  }
}
