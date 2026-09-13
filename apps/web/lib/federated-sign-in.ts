type AuthResult =
  | {
      data?: unknown
      error?: unknown
    }
  | null
  | undefined

type FederatedAuthClient = {
  getSession: () => Promise<{
    data?: { session?: unknown } | null
    error?: unknown
  }>
  $fetch: (path: string, options: { method: "GET" }) => Promise<AuthResult>
}

/** Une réauthentification Better Auth (client_id + code) garde le formulaire. */
export function hasAuthorizationRequest(params: URLSearchParams): boolean {
  return Boolean(params.get("client_id") && params.get("response_type"))
}

/** L'URL vient du fournisseur, jamais du redirect_uri fourni par le navigateur. */
export function getProviderRedirect(result: AuthResult): string | null {
  if (result?.error || !result?.data || typeof result.data !== "object")
    return null
  const data = result.data as { redirect?: unknown; url?: unknown }
  if (data.redirect !== true || typeof data.url !== "string") return null
  try {
    const url = new URL(data.url)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

export async function authorizeFederatedSignIn(
  params: URLSearchParams,
  client: Pick<FederatedAuthClient, "$fetch">,
): Promise<string> {
  if (!hasAuthorizationRequest(params)) throw new Error("Missing OIDC request")
  const query = new URLSearchParams(params)
  query.delete("redirect_to")
  query.delete("sso_checked")
  // crossDomainClient joint la session du portail à cette requête. Le
  // fournisseur vérifie lui-même client, PKCE, prompt, max_age et consentement.
  const result = await client.$fetch(`/oauth2/authorize?${query.toString()}`, {
    method: "GET",
  })
  const redirect = getProviderRedirect(result)
  if (!redirect) throw new Error("OIDC authorization did not return a redirect")
  return redirect
}

export async function resumeFederatedSignIn(
  params: URLSearchParams,
  client: FederatedAuthClient,
): Promise<string | null> {
  if (!hasAuthorizationRequest(params)) return null
  const result = await client.getSession()
  if (result.error) throw new Error("Unable to check the existing session")
  // prompt=none doit retourner l'erreur OAuth validée par le fournisseur,
  // même sans session, sans présenter de formulaire interactif.
  const prompt = new Set((params.get("prompt") ?? "").split(/\s+/))
  if (!result.data?.session && !prompt.has("none")) return null
  return authorizeFederatedSignIn(params, client)
}
