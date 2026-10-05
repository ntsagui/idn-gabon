/**
 * Flux de connexion fédérée (OAuth/OIDC) sur identite.ga.
 *
 * Depuis la fusion de connect.identite.ga dans identite.ga, la connexion d'une
 * app partenaire se déroule entièrement sur ce domaine : `/oauth2/authorize`
 * est atteint via le proxy `/api/auth/*` de cette même origine, donc le cookie
 * de session est lisible dès le premier hop. Plus aucun détour cross-domaine
 * (jeton de handoff, paramètre `sso_checked`) n'est nécessaire.
 */

import { toInternalPath } from "./safe-path"

const isInternalPath = (value: string): boolean => toInternalPath(value) !== null

/**
 * Un login fédéré peut arriver directement depuis oidcProvider (paramètres
 * OAuth en query) ou depuis la page de consentement via redirect_to.
 *
 * `redirect_to` étant déjà contraint à un chemin interne, la base passée à
 * `new URL` ne sert qu'à en extraire le pathname : elle est arbitraire, ce qui
 * rend cette fonction utilisable au rendu serveur comme au rendu client.
 */
export function isFederatedSignIn(params: URLSearchParams): boolean {
  if (params.get("client_id") && params.get("response_type")) return true

  const redirectTo = params.get("redirect_to")
  if (!redirectTo || !isInternalPath(redirectTo)) return false

  return new URL(redirectTo, "https://idn.invalid").pathname ===
    "/oauth/authorize"
}

/**
 * URL à rejouer une fois la session Better Auth posée.
 *
 * Toujours un chemin INTERNE : c'est ce qui garantit que le rejeu passe par le
 * proxy `/api/auth/*` de cette origine (seul porteur du cookie de session) et
 * que la page de connexion ne devient pas une redirection ouverte.
 */
export function buildPostLoginRedirect(params: URLSearchParams): string {
  if (!params.get("client_id") || !params.get("response_type")) {
    return toInternalPath(params.get("redirect_to")) ?? "/"
  }

  const oauthParams = new URLSearchParams(params)
  oauthParams.delete("redirect_to")
  return `/api/auth/oauth2/authorize?${oauthParams.toString()}`
}

type CurrentUser = {
  profile?: {
    loa?: number
  } | null
} | null

/**
 * `profile.getCurrentUser` nests the assurance level under `profile`.
 * Keep that response-shape knowledge out of the consent page so a missing
 * profile safely falls back to the base assurance level.
 */
export function getCurrentUserLoa(user: CurrentUser): 1 | 2 | 3 {
  const loa = user?.profile?.loa
  return loa === 2 || loa === 3 ? loa : 1
}
