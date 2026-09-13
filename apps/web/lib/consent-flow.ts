/**
 * Consentement OIDC sur identite.ga.
 *
 * La session du portail vit dans le localStorage du navigateur (plugin
 * `crossDomain`), pas dans un cookie HTTP. Un `fetch` brut vers
 * `/api/auth/oauth2/consent` part donc SANS session et le fournisseur répond
 * 401 « Unauthorized » : la décision de l'usager n'arrive jamais — incident du
 * 14/09/2026. Le POST passe désormais par le client Better Auth, dont le plugin
 * `crossDomainClient` joint la session dans l'en-tête `Better-Auth-Cookie` —
 * exactement le chemin déjà emprunté par la reprise de `/oauth2/authorize`
 * (`federated-sign-in.ts`). Le `consent_code` voyage dans le corps : il vient
 * de la query posée par le fournisseur, jamais du cookie signé (que le
 * navigateur n'a pas reçu, le proxy l'ayant rangé dans le localStorage).
 */

type AuthResult =
  | {
      data?: unknown
      error?: unknown
    }
  | null
  | undefined

type ConsentAuthClient = {
  $fetch: (
    path: string,
    options: { method: "POST"; body: Record<string, unknown> },
  ) => Promise<AuthResult>
}

export type ConsentDecision = {
  accept: boolean
  /** `consent_code` reçu en query depuis /oauth2/authorize ; null en entrée directe. */
  consentCode: string | null
}

/**
 * Les trois refus que l'écran doit savoir raconter :
 * - `session_missing` : le fournisseur n'a pas reconnu la session (401
 *   `UNAUTHORIZED`) — se reconnecter puis revenir ici suffit ;
 * - `request_expired` : le code de consentement est absent, inconnu, expiré
 *   (10 min) ou déjà consommé (`invalid_request`) — seule l'application
 *   peut relancer une autorisation ;
 * - `provider_error` : tout le reste (réseau, 5xx) — réessayer.
 */
export type ConsentFailure =
  | "session_missing"
  | "request_expired"
  | "provider_error"

export type ConsentOutcome =
  | { kind: "redirect"; url: string }
  | { kind: "error"; reason: ConsentFailure }

const isHttpUrl = (value: string): string | null => {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

/** L'URL de retour vient du fournisseur (`redirectURI`), jamais du navigateur. */
export function getConsentRedirect(result: AuthResult): string | null {
  if (!result || result.error || !result.data || typeof result.data !== "object")
    return null
  const data = result.data as { redirectURI?: unknown; redirect_uri?: unknown }
  const raw =
    typeof data.redirectURI === "string"
      ? data.redirectURI
      : typeof data.redirect_uri === "string"
        ? data.redirect_uri
        : null
  return raw ? isHttpUrl(raw) : null
}

/**
 * Better Auth distingue ses refus par le corps de l'erreur : le middleware de
 * session répond `{ code: "UNAUTHORIZED" }`, l'endpoint de consentement
 * `{ error: "invalid_request", error_description }` (code absent, invalide,
 * expiré, consentement non requis). Le statut HTTP est 401 dans les deux cas.
 */
export function classifyConsentError(error: unknown): ConsentFailure {
  if (!error || typeof error !== "object") return "provider_error"
  const e = error as {
    status?: unknown
    code?: unknown
    error?: unknown
    error_description?: unknown
  }
  if (e.error === "invalid_request") return "request_expired"
  if (e.code === "UNAUTHORIZED" || e.status === 401) return "session_missing"
  return "provider_error"
}

export async function submitConsentDecision(
  decision: ConsentDecision,
  client: ConsentAuthClient,
): Promise<ConsentOutcome> {
  const body: Record<string, unknown> = { accept: decision.accept }
  if (decision.consentCode) body.consent_code = decision.consentCode
  let result: AuthResult
  try {
    result = await client.$fetch("/oauth2/consent", { method: "POST", body })
  } catch {
    return { kind: "error", reason: "provider_error" }
  }
  const url = getConsentRedirect(result)
  if (url) return { kind: "redirect", url }
  return { kind: "error", reason: classifyConsentError(result?.error) }
}

/**
 * Un refus doit revenir à l'application même si le fournisseur n'a plus le
 * code : possible seulement en entrée directe, où `redirect_uri` est en query.
 */
export function denyFallbackUrl(
  params: Record<string, string | undefined>,
): string | null {
  const redirectUri = params.redirect_uri
  if (!redirectUri || !isHttpUrl(redirectUri)) return null
  const url = new URL(redirectUri)
  url.searchParams.set("error", "access_denied")
  if (params.state) url.searchParams.set("state", params.state)
  return url.toString()
}

/**
 * Après un 401 de session, on repasse par /sign-in puis on revient sur cette
 * même page de consentement : le `consent_code` reste valable dix minutes.
 * Chemin INTERNE, comme tout `redirect_to` du portail.
 */
export function signInAgainUrl(
  params: Record<string, string | undefined>,
): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, value)
  }
  return `/sign-in?redirect_to=${encodeURIComponent(`/oauth/authorize?${query.toString()}`)}`
}

/**
 * Quand la demande a expiré, seule l'application sait relancer une
 * autorisation (PKCE, state). On renvoie vers l'origine de ses URI de retour
 * enregistrées — jamais vers une adresse fournie par la query.
 */
export function appReturnUrl(redirectUris: readonly string[]): string | null {
  for (const uri of redirectUris) {
    const valid = isHttpUrl(uri)
    if (valid) return new URL(valid).origin
  }
  return null
}

export function consentFailureMessage(reason: ConsentFailure): string {
  switch (reason) {
    case "session_missing":
      return "Votre session Identité Numérique n'a pas été reconnue. Reconnectez-vous pour poursuivre la connexion."
    case "request_expired":
      return "Cette demande de connexion a expiré ou a déjà été traitée. Relancez la connexion depuis l'application."
    case "provider_error":
      return "Votre décision n'a pas pu être enregistrée. Réessayez dans un instant."
  }
}
