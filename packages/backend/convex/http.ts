import { httpRouter } from "convex/server"

import { components, internal } from "./_generated/api"
import { httpAction } from "./_generated/server"
import { authenticateApiKey } from "./developer/apiKeys"
import { createAuth } from "./auth"
import { inbound as inboundMailHandler } from "./iboite/mailHttp"
import { getPublicJwks } from "./lib/documentSigning"
import { parseDirectoryResolveRequest } from "./partner/resolveRequest"
import {
  parseAgentActedRequest,
  parseAvailabilityRequest,
  parseDecisionRequest,
  parseQueueQuery,
} from "./partner/verificationRequest"

const http = httpRouter()

const AUTH_PATH = "/api/auth"

// Routes Better Auth — /api/auth/* (sign-in/sign-up/sign-out, OTP, OIDC,
// JWKS, userinfo, etc.). Enregistrement manuel (au lieu de
// `authComponent.registerRoutes`) pour passer le header Origin de la
// requête à `createAuth`. Le plugin crossDomain peut alors renvoyer les
// callbacks vers l'origin de l'app appelante (web / admin / developer /
// controller).
//
// Le plugin `oidcProvider` de better-auth/plugins expose automatiquement
// ses routes sous `/api/auth/oauth2/*` (authorize, token, callback) et
// le discovery sous `/api/auth/.well-known/openid-configuration`. Pas
// besoin de monter des handlers custom — tout est servi par
// `auth.handler(request)`.
/**
 * Origines autorisées à appeler les routes Better Auth depuis un NAVIGATEUR.
 *
 * Réutilise `TRUSTED_ORIGINS`, déjà la source de vérité anti-CSRF de Better
 * Auth : une origine de confiance pour le CSRF l'est aussi pour le CORS, et
 * maintenir deux listes les ferait diverger.
 *
 * On répond avec l'origine EXACTE, jamais `*` : ces routes portent des cookies
 * de session (`credentials: "include"`), et la spec CORS interdit le joker dès
 * qu'il y a des credentials — le navigateur rejetterait la réponse.
 */
function authCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {}
  const allowed = (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
  let isLocalDevOrigin = false
  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin)
      isLocalDevOrigin =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".local")
    } catch {
      isLocalDevOrigin = false
    }
  }
  if (!allowed.includes(origin) && !isLocalDevOrigin) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  }
}

type HttpHandler = Parameters<typeof httpAction>[0]

/**
 * Ajoute à la réponse les en-têtes CORS des origines de confiance. Le parcours
 * « Récupérer mon compte » (/claim) du site web appelle les routes
 * /api/claim/* depuis sa propre origine : sans ces en-têtes le navigateur
 * bloque la réponse et la recherche échoue en « Failed to fetch ».
 */
function withTrustedCors(handler: HttpHandler): HttpHandler {
  return async (ctx, request) => {
    const response = await handler(ctx, request)
    for (const [key, value] of Object.entries(authCorsHeaders(request.headers.get("origin")))) {
      response.headers.set(key, value)
    }
    return response
  }
}

const authRequestHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin")
  const auth = createAuth(ctx, origin)
  const response = await auth.handler(request)

  // Les applications partenaires (consulat.ga) exécutent le parcours
  // d'inscription IDN depuis leur propre origine : sans ces en-têtes, le
  // navigateur bloque la réponse et l'appel échoue en « Failed to fetch »,
  // sans qu'aucune erreur ne remonte côté serveur.
  const cors = authCorsHeaders(origin)
  if (Object.keys(cors).length === 0) return response

  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(cors)) headers.set(k, v)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
})

/**
 * Préflight CORS des routes Better Auth.
 *
 * Sans route OPTIONS, Convex répond 404 au préflight et le navigateur n'envoie
 * JAMAIS la vraie requête — le symptôme est un « Failed to fetch » opaque côté
 * client, alors que le serveur n'a rien vu passer.
 */
const authPreflightHandler = httpAction(async (_ctx, request) => {
  const origin = request.headers.get("origin")
  const cors = authCorsHeaders(origin)
  if (Object.keys(cors).length === 0) return new Response(null, { status: 403 })

  return new Response(null, {
    status: 204,
    headers: {
      ...cors,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        request.headers.get("access-control-request-headers") ??
        "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  })
})

// Override du discovery OIDC : @convex-dev/better-auth instancie en interne
// sa propre oidcProvider (sans useJWTPlugin: true ni notre metadata custom),
// donc le JSON servi sous /api/auth/convex/.well-known/openid-configuration
// annonce HS256 alors qu'on signe en RS256 via le plugin jwt. On intercepte
// la route exacte (prioritaire sur le pathPrefix) et on appelle l'instance
// oidcProvider qu'on configure dans auth.ts.
// Claims IDN exposés selon les scopes profile / idn:civil_status, en plus des claims
// standards Better Auth. Maintenus en un seul endroit (utilisés à la fois
// par le handler /userinfo pour les valeurs et par le discovery pour la
// liste `claims_supported`).
const IDN_EXTENDED_CLAIMS = [
  "given_name",
  "family_name",
  "birthdate",
  "birth_place",
  "gender",
  "nationality",
  "profile_type",
  "acr",
  "loa",
  "nip",
] as const

const loaToAcr = (loa: number): string =>
  loa === 3 ? "eidas3" : loa === 2 ? "eidas2" : "eidas1"

// Base de l'app web identite.ga (flux KYC sous /kyc) — pour construire le
// `action_url` renvoyé aux apps tierces dans /verification. Même fallback que
// `getSiteUrl` dans auth.ts.
const siteUrl = (): string =>
  (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "")

// Valide le Bearer access token via Better Auth (réutilise l'endpoint
// /oauth2/userinfo qui gère la validation 401/403) et renvoie le `sub`.
// Renvoie soit `{ sub }`, soit `{ error }` (la Response 401/403 à propager).
const validateBearerSub = async (
  auth: ReturnType<typeof createAuth>,
  request: Request,
): Promise<{ sub: string } | { error: Response }> => {
  const api = auth.api as unknown as {
    oAuth2userInfo: (input: {
      headers: Headers
      request: Request
      asResponse: true
    }) => Promise<Response>
  }
  let res: Response
  try {
    res = await api.oAuth2userInfo({
      headers: request.headers,
      request,
      asResponse: true,
    })
  } catch (err) {
    if (err instanceof Response) return { error: err }
    throw err
  }
  if (!res.ok) return { error: res }
  const claims = (await res.json()) as { sub?: unknown }
  if (typeof claims.sub !== "string") {
    return {
      error: new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    }
  }
  return { sub: claims.sub }
}

type OAuthBearerPrincipal = {
  sub: string
  clientId: string
  scopes: string[]
}

/** Valide le token et récupère les scopes réellement portés par celui-ci. */
const validateBearerPrincipal = async (
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  auth: ReturnType<typeof createAuth>,
  request: Request,
): Promise<{ principal: OAuthBearerPrincipal } | { error: Response }> => {
  const validated = await validateBearerSub(auth, request)
  if ("error" in validated) return validated
  const match = /^Bearer\s+(\S+)$/i.exec(
    request.headers.get("authorization")?.trim() ?? "",
  )
  if (!match) return { error: jsonResponse({ error: "invalid_token" }, 401) }
  const rows = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "oauthAccessToken",
    where: [{ field: "accessToken", value: match[1]!, operator: "eq" }],
    paginationOpts: { numItems: 1, cursor: null },
  })) as {
    page: Array<{
      userId?: string | null
      clientId?: string | null
      scopes?: string | null
      accessTokenExpiresAt?: Date | number | null
    }>
  }
  const token = rows.page[0]
  const expiresAt =
    token?.accessTokenExpiresAt instanceof Date
      ? token.accessTokenExpiresAt.getTime()
      : token?.accessTokenExpiresAt
  if (
    !token?.clientId ||
    token.userId !== validated.sub ||
    (typeof expiresAt === "number" && expiresAt < Date.now())
  ) {
    return { error: jsonResponse({ error: "invalid_token" }, 401) }
  }
  return {
    principal: {
      sub: validated.sub,
      clientId: token.clientId,
      scopes: (token.scopes ?? "").split(/\s+/).filter(Boolean),
    },
  }
}

// GET /api/auth/oauth2/verification — statut de vérification d'identité,
// interrogeable par une app tierce avec l'access token de l'utilisateur.
// Contrairement au claim `loa` (figé au login), reflète l'état vivant d'une
// demande KYC (en cours / action requise / refusée). Cf. verification.ts.
const verificationHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin")
  const auth = createAuth(ctx, origin)

  const validated = await validateBearerSub(auth, request)
  if ("error" in validated) return validated.error

  const status = await ctx.runQuery(internal.verification.getStatusForUser, {
    userId: validated.sub,
  })

  const body = {
    loa: status.loa,
    acr: loaToAcr(status.loa),
    verified: status.loa >= 2,
    verification: {
      status: status.status,
      action_required: status.actionRequired,
      action_url: `${siteUrl()}/kyc`,
      message: status.message,
      updated_at: status.updatedAt,
    },
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})

// Override du discovery OIDC : @convex-dev/better-auth instancie en interne
// sa propre oidcProvider (sans useJWTPlugin: true ni notre metadata custom),
// donc le JSON servi sous /api/auth/convex/.well-known/openid-configuration
// annonce HS256 alors qu'on signe en RS256 via le plugin jwt. On intercepte
// la route exacte (prioritaire sur le pathPrefix) et on appelle l'instance
// oidcProvider qu'on configure dans auth.ts. On en profite pour étendre
// `claims_supported` avec les claims IDN qu'on injecte dans /userinfo.
const oidcDiscoveryHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin")
  const auth = createAuth(ctx, origin)
  const api = auth.api as unknown as {
    getOpenIdConfig: (input: {
      asResponse: false
    }) => Promise<Record<string, unknown>>
  }
  const metadata = await api.getOpenIdConfig({ asResponse: false })
  const baseClaims = Array.isArray(metadata.claims_supported)
    ? (metadata.claims_supported as string[])
    : []
  const patched = {
    ...metadata,
    id_token_signing_alg_values_supported: ["RS256"],
    claims_supported: Array.from(
      new Set([...baseClaims, ...IDN_EXTENDED_CLAIMS]),
    ),
    acr_values_supported: ["eidas1", "eidas2", "eidas3"],
    // Le navigateur doit atterrir sur le domaine qui porte le cookie de session
    // (identite.ga), pas sur l'origine Convex. Sans ça, /oauth2/authorize ne voit
    // jamais la session d'un usager déjà connecté et le renvoie vers /sign-in.
    //
    // Seul cet endpoint est réécrit : il est le seul traversé par un navigateur
    // porteur de cookie. `issuer` (claim `iss` des tokens émis), `token_endpoint`,
    // `jwks_uri` et `userinfo_endpoint` sont back-channel et restent sur Convex —
    // les réécrire casserait la validation chez tous les partenaires intégrés.
    authorization_endpoint: `${siteUrl()}/api/auth/oauth2/authorize`,
  }
  return new Response(JSON.stringify(patched), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})

// Better Auth valide le jeton puis enrichit les claims dans auth.ts avec ses
// scopes validés. Ne jamais réajouter ici le pivot indépendamment des scopes.
const userinfoHandler = httpAction(async (ctx, request) => {
  const origin = request.headers.get("origin")
  const auth = createAuth(ctx, origin)
  const api = auth.api as unknown as {
    oAuth2userInfo: (input: {
      headers: Headers
      request: Request
      asResponse: true
    }) => Promise<Response>
  }

  // Better Auth gère la validation du Bearer token (401/403 si invalide ou
  // expiré). Le handler upstream check `ctx.request` (pas juste headers) —
  // il faut lui passer le Request object complet.
  let baseRes: Response
  try {
    baseRes = await api.oAuth2userInfo({
      headers: request.headers,
      request,
      asResponse: true,
    })
  } catch (err) {
    if (err instanceof Response) return err
    throw err
  }

  const headers = new Headers(baseRes.headers)
  headers.set("Cache-Control", "no-store")
  headers.set("Access-Control-Allow-Origin", "*")
  return new Response(baseRes.body, { status: baseRes.status, headers })
})

http.route({
  path: `${AUTH_PATH}/convex/.well-known/openid-configuration`,
  method: "GET",
  handler: oidcDiscoveryHandler,
})

http.route({
  path: `${AUTH_PATH}/oauth2/userinfo`,
  method: "GET",
  handler: userinfoHandler,
})

http.route({
  path: `${AUTH_PATH}/oauth2/verification`,
  method: "GET",
  handler: verificationHandler,
})

// POST /api/partner/citizens/resolve — annuaire partenaire.
// Authentifié par clé API M2M (Authorization: Bearer <token>) avec le scope
// `citizens:resolve`. Permet à une app relying party autorisée de retrouver
// une identité par NIP / alias @idn.ga / Nom (cf. partner/citizens.ts).
// HORS session OAuth : sert l'enrôlement d'agents (l'app n'a pas l'access
// token de la personne recherchée, seulement l'un de ses identifiants).
const partnerResolveHandler = httpAction(async (ctx, request) => {
  const principal = await authenticateApiKey(ctx, request)
  if (!principal) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (!principal.scopes.includes("citizens:resolve")) {
    return new Response(JSON.stringify({ error: "insufficient_scope" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const parsed = parseDirectoryResolveRequest(body)
  if (!parsed.ok) {
    return new Response(
      JSON.stringify({ error: parsed.error, message: parsed.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  const results = await ctx.runQuery(
    internal.partner.citizens.resolveDirectory,
    {
      ...parsed.value,
    },
  )

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})

http.route({
  path: "/api/partner/citizens/resolve",
  method: "POST",
  handler: partnerResolveHandler,
})

// ---------------------------------------------------------------------------
// POST /api/delegate/lookup — recherche d'un citoyen avant création déléguée.
// Authentifié par clé API M2M avec le scope `idn:delegate:lookup`.
// ---------------------------------------------------------------------------
const delegateLookupHandler = httpAction(async (ctx, request) => {
  const principal = await authenticateApiKey(ctx, request)
  if (!principal) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (!principal.scopes.includes("idn:delegate:lookup")) {
    return new Response(JSON.stringify({ error: "insufficient_scope" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const app = await ctx.runQuery(internal.delegate.queries.getAppDelegation, {
    developerUserId: principal.userId,
  })
  if (!app?.enabled) {
    return new Response(JSON.stringify({ error: "delegation_not_enabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const str = (x: unknown) =>
    typeof x === "string" && x.trim() ? x.trim() : undefined

  const result = await ctx.runQuery(
    internal.delegate.mutations.lookupForDelegation,
    {
      nip: str(b.nip),
      firstName: str(b.firstName),
      lastName: str(b.lastName),
      dateOfBirth: str(b.dateOfBirth),
    },
  )

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})

http.route({
  path: "/api/delegate/lookup",
  method: "POST",
  handler: delegateLookupHandler,
})

// ---------------------------------------------------------------------------
// POST /api/delegate/identity — création d'une identité déléguée.
// Authentifié par clé API M2M avec le scope `idn:delegate:create`.
// ---------------------------------------------------------------------------
const delegateCreateHandler = httpAction(async (ctx, request) => {
  const principal = await authenticateApiKey(ctx, request)
  if (!principal) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (!principal.scopes.includes("idn:delegate:create")) {
    return new Response(JSON.stringify({ error: "insufficient_scope" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const app = await ctx.runQuery(internal.delegate.queries.getAppDelegation, {
    developerUserId: principal.userId,
  })
  if (!app?.enabled) {
    return new Response(JSON.stringify({ error: "delegation_not_enabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const str = (x: unknown) =>
    typeof x === "string" && x.trim() ? x.trim() : undefined

  const firstName = str(b.firstName)
  const lastName = str(b.lastName)
  const dateOfBirth = str(b.dateOfBirth)
  const gender = str(b.gender)
  const birthPlace = str(b.birthPlace)
  const nationality = str(b.nationality)

  if (
    !firstName ||
    !lastName ||
    !dateOfBirth ||
    !gender ||
    !birthPlace ||
    !nationality
  ) {
    return new Response(
      JSON.stringify({
        error: "missing_fields",
        message:
          "firstName, lastName, dateOfBirth, gender, birthPlace, nationality requis.",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }

  if (!["M", "F", "O", "N"].includes(gender)) {
    return new Response(JSON.stringify({ error: "invalid_gender" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return new Response(JSON.stringify({ error: "invalid_date_of_birth" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const nip = str(b.nip)
  if (nip && !/^[A-Za-z0-9]{14}$/.test(nip)) {
    return new Response(JSON.stringify({ error: "invalid_nip" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Vérifier que le citoyen n'a pas déjà d'IDN
  if (nip) {
    const existing = await ctx.runQuery(
      internal.delegate.mutations.lookupForDelegation,
      { nip },
    )
    if (existing.found) {
      return new Response(
        JSON.stringify({
          error: "identity_already_exists",
          idnId: (existing as { idnId?: string }).idnId,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      )
    }
  }

  const requestedLoa = typeof b.loa === "number" ? b.loa : 1
  const assignedLoa = Math.min(requestedLoa, app.maxLoa) as 1 | 2

  const result = await ctx.runAction(
    internal.delegate.actions.createDelegatedUser,
    {
      pivot: {
        firstName,
        lastName,
        dateOfBirth,
        gender: gender as "M" | "F" | "O" | "N",
        birthPlace,
        nationality: nationality.toUpperCase(),
        phone: str(b.phone),
        nip,
      },
      profileType: (str(b.profileType) === "resident"
        ? "resident"
        : "citizen") as "citizen" | "resident",
      assignedLoa,
      appClientId: app.clientId,
      operatorUserId: principal.userId,
      kycDocumentType: str(b.documentType) as any,
      kycDocFront: str(b.documentFront) as any,
      kycDocBack: str(b.documentBack) as any,
    },
  )

  // `claimCode` : SEULE et UNIQUE restitution du code en clair. L'opérateur
  // doit le remettre au citoyen (impression, remise en main propre) — il n'est
  // pas relisible ensuite, seul son hash est stocké. Sans lui le citoyen ne
  // peut pas réclamer son identité, et il faut réémettre l'identité.
  return new Response(
    JSON.stringify({
      sub: result.userId,
      idnId: result.idnId,
      delegatedIdentityId: result.delegatedIdentityId,
      assignedLoa,
      claimCode: result.claimCode,
    }),
    { status: 201, headers: { "Content-Type": "application/json" } },
  )
})

http.route({
  path: "/api/delegate/identity",
  method: "POST",
  handler: delegateCreateHandler,
})

// ---------------------------------------------------------------------------
// GET /api/delegate/identity?id=xxx — statut d'une identité déléguée.
// Authentifié par clé API M2M avec le scope `idn:delegate:status`.
// ---------------------------------------------------------------------------
const delegateStatusHandler = httpAction(async (ctx, request) => {
  const principal = await authenticateApiKey(ctx, request)
  if (!principal) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  if (!principal.scopes.includes("idn:delegate:status")) {
    return new Response(JSON.stringify({ error: "insufficient_scope" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const url = new URL(request.url)
  const id = url.searchParams.get("id")
  if (!id) {
    return new Response(JSON.stringify({ error: "missing_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const result = await ctx.runQuery(internal.delegate.queries.getById, {
    id: id as any,
  })
  if (!result) {
    return new Response(JSON.stringify({ error: "not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Vérifier que l'app appelante est bien propriétaire
  const app = await ctx.runQuery(internal.delegate.queries.getAppDelegation, {
    developerUserId: principal.userId,
  })
  if (!app || result.appClientId !== app.clientId) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
})

http.route({
  path: "/api/delegate/identity",
  method: "GET",
  handler: delegateStatusHandler,
})

// ---------------------------------------------------------------------------
// POST /api/claim/lookup — recherche publique d'une identité déléguée réclamable.
// Pas d'auth M2M — appelé par le wizard citoyen.
// ---------------------------------------------------------------------------
const claimLookupHandler = httpAction(withTrustedCors(async (ctx, request) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const str = (x: unknown) =>
    typeof x === "string" && x.trim() ? x.trim() : undefined

  const nip = str(b.nip)
  const firstName = str(b.firstName)
  const lastName = str(b.lastName)
  const dateOfBirth = str(b.dateOfBirth)
  const claimCode = str(b.claimCode)

  if (!claimCode || (!nip && !(firstName && lastName && dateOfBirth))) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const result = await ctx.runQuery(internal.delegate.queries.lookupForClaim, {
    nip,
    firstName,
    lastName,
    dateOfBirth,
  })

  // `{found:false}` UNIFORME, que la personne soit inconnue, déjà réclamée ou
  // que le code soit faux. Sans cette uniformité, la route redevient un oracle :
  // on pourrait tester des couples nom/date de naissance et apprendre qui
  // possède une identité déléguée réclamable — l'information même qui rendait
  // l'ancienne version exploitable.
  const notFound = new Response(JSON.stringify({ found: false }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
  if (!result) return notFound

  const codeOk = await ctx.runMutation(
    internal.delegate.mutations.verifyClaimCode,
    { delegatedIdentityId: result.delegatedIdentityId, claimCode },
  )
  if (!codeOk) return notFound

  return new Response(
    JSON.stringify({
      found: true,
      delegatedIdentityId: result.delegatedIdentityId,
      idnId: result.idnId,
      firstName: result.firstName,
      lastName: result.lastName,
      loa: result.loa,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
}))

http.route({
  path: "/api/claim/lookup",
  method: "POST",
  handler: claimLookupHandler,
})

// ---------------------------------------------------------------------------
// POST /api/claim/complete — finalise la réclamation (password + PIN).
// ---------------------------------------------------------------------------
const claimCompleteHandler = httpAction(withTrustedCors(async (ctx, request) => {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const b = (body ?? {}) as Record<string, unknown>
  const delegatedIdentityId = b.delegatedIdentityId as string | undefined
  const password = b.password as string | undefined
  const pin = b.pin as string | undefined
  // Le `delegatedIdentityId` n'est PAS un secret (il sort de /api/claim/lookup) :
  // le code de réclamation est la seule preuve que l'appelant est bien le
  // citoyen à qui l'opérateur l'a remis.
  const claimCode = b.claimCode as string | undefined

  if (!delegatedIdentityId || !password || !pin || !claimCode) {
    return new Response(JSON.stringify({ error: "missing_fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (password.length < 12) {
    return new Response(JSON.stringify({ error: "password_too_short" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!/^\d{6}$/.test(pin)) {
    return new Response(JSON.stringify({ error: "invalid_pin" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const result = await ctx.runAction(internal.delegate.actions.claimAccount, {
      delegatedIdentityId: delegatedIdentityId as any,
      claimCode,
      password,
      pin,
    })

    return new Response(
      JSON.stringify({ success: true, userId: result.userId }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Impossible de réclamer le compte."
    return new Response(JSON.stringify({ error: "claim_failed", message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
}))

http.route({
  path: "/api/claim/complete",
  method: "POST",
  handler: claimCompleteHandler,
})

// Préflight du parcours /claim (requêtes JSON depuis l'origine du site web).
http.route({
  path: "/api/claim/lookup",
  method: "OPTIONS",
  handler: authPreflightHandler,
})
http.route({
  path: "/api/claim/complete",
  method: "OPTIONS",
  handler: authPreflightHandler,
})

// GET /.well-known/document-signing-jwks.json — clé publique RS256 dédiée
// à la feature « Signer un document » (cf. lib/documentSigning.ts). Permet
// à un tiers de vérifier une signature indépendamment de Convex, avec
// n'importe quelle lib JWT/JWKS standard. Distincte de la JWKS du plugin
// better-auth `jwt` servie sous `${AUTH_PATH}/jwks` (réservée aux ID tokens
// OIDC — cf. auth.ts).
const documentSigningJwksHandler = httpAction(async (_ctx, _request) => {
  const keys = await getPublicJwks()
  return new Response(JSON.stringify({ keys }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  })
})

http.route({
  path: "/.well-known/document-signing-jwks.json",
  method: "GET",
  handler: documentSigningJwksHandler,
})

http.route({
  pathPrefix: `${AUTH_PATH}/`,
  method: "GET",
  handler: authRequestHandler,
})
http.route({
  pathPrefix: `${AUTH_PATH}/`,
  method: "POST",
  handler: authRequestHandler,
})
http.route({
  pathPrefix: `${AUTH_PATH}/`,
  method: "OPTIONS",
  handler: authPreflightHandler,
})

http.route({
  path: "/mail/inbound",
  method: "POST",
  handler: inboundMailHandler,
})

// ---------------------------------------------------------------------------
// Façade OAuth iBoîte v1. Les tokens restent côté serveur de l'application :
// aucune route ne dépend des cookies du navigateur partenaire.
// ---------------------------------------------------------------------------

const IBOITE_API_PREFIX = "/api/oauth/iboite/v1/"

function requireOAuthScope(
  principal: OAuthBearerPrincipal,
  scope: string,
): Response | null {
  return principal.scopes.includes(scope)
    ? null
    : jsonResponse(
        { error: "insufficient_scope", message: `Scope requis : ${scope}.` },
        403,
      )
}

const iboiteReadHandler = httpAction(async (ctx, request) => {
  const auth = createAuth(ctx, request.headers.get("origin"))
  const validated = await validateBearerPrincipal(ctx, auth, request)
  if ("error" in validated) return validated.error
  const denied = requireOAuthScope(validated.principal, "idn:iboite.read")
  if (denied) return denied
  const url = new URL(request.url)
  const parts = url.pathname
    .slice(IBOITE_API_PREFIX.length)
    .split("/")
    .filter(Boolean)
  const resource = parts[0]
  if (
    !resource ||
    !["account", "letters", "packages", "messages"].includes(resource)
  ) {
    return jsonResponse({ error: "not_found" }, 404)
  }
  const folderRaw = url.searchParams.get("folder") ?? undefined
  const folder =
    folderRaw && ["inbox", "sent", "pending", "trash"].includes(folderRaw)
      ? (folderRaw as "inbox" | "sent" | "pending" | "trash")
      : undefined
  try {
    const raw = await ctx.runQuery(internal.iboite.oauthApi.readResource, {
      userId: validated.principal.sub,
      resource: resource as "account" | "letters" | "packages" | "messages",
      folder,
      itemId: parts[1],
    })
    return new Response(raw, { status: 200, headers: JSON_HEADERS })
  } catch (error) {
    return businessError(error)
  }
})

const iboitePatchHandler = httpAction(async (ctx, request) => {
  const auth = createAuth(ctx, request.headers.get("origin"))
  const validated = await validateBearerPrincipal(ctx, auth, request)
  if ("error" in validated) return validated.error
  const denied = requireOAuthScope(validated.principal, "idn:iboite.manage")
  if (denied) return denied
  const parts = new URL(request.url).pathname
    .slice(IBOITE_API_PREFIX.length)
    .split("/")
    .filter(Boolean)
  const resource =
    parts[0] === "letters"
      ? "letter"
      : parts[0] === "messages"
        ? "message"
        : parts[0] === "packages"
          ? "package"
          : null
  if (!resource || !parts[1]) return jsonResponse({ error: "not_found" }, 404)
  const json = await readJson(request)
  if (!json.ok) return json.response
  const body = (json.body ?? {}) as Record<string, unknown>
  const action =
    typeof body.action === "string" &&
    ["mark_read", "move", "star", "picked_up"].includes(body.action)
      ? (body.action as "mark_read" | "move" | "star" | "picked_up")
      : null
  if (!action) return jsonResponse({ error: "invalid_action" }, 400)
  const folder =
    typeof body.folder === "string" &&
    ["inbox", "sent", "pending", "trash"].includes(body.folder)
      ? (body.folder as "inbox" | "sent" | "pending" | "trash")
      : undefined
  try {
    const raw = await ctx.runMutation(internal.iboite.oauthApi.manageResource, {
      userId: validated.principal.sub,
      resource,
      itemId: parts[1],
      action,
      folder,
      starred: typeof body.starred === "boolean" ? body.starred : undefined,
    })
    return new Response(raw, { status: 200, headers: JSON_HEADERS })
  } catch (error) {
    return businessError(error)
  }
})

const iboiteWriteHandler = httpAction(async (ctx, request) => {
  const auth = createAuth(ctx, request.headers.get("origin"))
  const validated = await validateBearerPrincipal(ctx, auth, request)
  if ("error" in validated) return validated.error
  const denied = requireOAuthScope(validated.principal, "idn:iboite.send")
  if (denied) return denied
  const resource = new URL(request.url).pathname.slice(IBOITE_API_PREFIX.length)
  if (resource === "uploads") {
    const uploadUrl = await ctx.runMutation(
      internal.iboite.oauthApi.generateUploadUrl,
      { userId: validated.principal.sub },
    )
    return jsonResponse({ uploadUrl }, 200)
  }
  if (resource !== "messages") return jsonResponse({ error: "not_found" }, 404)
  const json = await readJson(request)
  if (!json.ok) return json.response
  const body = (json.body ?? {}) as Record<string, unknown>
  const string = (value: unknown): string =>
    typeof value === "string" ? value : ""
  const attachments = Array.isArray(body.attachments)
    ? body.attachments
        .map((value) => {
          if (!value || typeof value !== "object") return null
          const item = value as Record<string, unknown>
          if (
            typeof item.name !== "string" ||
            typeof item.size !== "number" ||
            typeof item.storageRef !== "string" ||
            typeof item.mimeType !== "string"
          )
            return null
          return {
            name: item.name,
            size: item.size,
            storageRef: item.storageRef as never,
            mimeType: item.mimeType,
          }
        })
        .filter((value): value is NonNullable<typeof value> => value !== null)
    : undefined
  try {
    const messageId = await ctx.runMutation(
      internal.iboite.oauthApi.sendMessage,
      {
        userId: validated.principal.sub,
        recipientName: string(body.recipientName),
        recipientEmail: string(body.recipientEmail),
        subject: string(body.subject),
        body: string(body.body),
        inReplyTo:
          typeof body.inReplyTo === "string"
            ? (body.inReplyTo as never)
            : undefined,
        attachments,
      },
    )
    return jsonResponse({ messageId }, 201)
  } catch (error) {
    return businessError(error)
  }
})

http.route({
  pathPrefix: IBOITE_API_PREFIX,
  method: "GET",
  handler: iboiteReadHandler,
})
http.route({
  pathPrefix: IBOITE_API_PREFIX,
  method: "PATCH",
  handler: iboitePatchHandler,
})
http.route({
  pathPrefix: IBOITE_API_PREFIX,
  method: "POST",
  handler: iboiteWriteHandler,
})

// Dépôt d'un accusé ou courrier officiel par une application M2M liée.
http.route({
  path: "/api/partner/iboite/letters",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const principal = await authenticateApiKey(ctx, request)
    if (!principal) return jsonResponse({ error: "unauthorized" }, 401)
    if (!principal.scopes.includes("idn:iboite:letters:create")) {
      return jsonResponse({ error: "insufficient_scope" }, 403)
    }
    if (!principal.appClientId) {
      return jsonResponse({ error: "api_key_not_linked_to_app" }, 403)
    }
    const applications = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: "oauthApplication",
        where: [
          {
            field: "clientId",
            value: principal.appClientId,
            operator: "eq",
          },
        ],
        paginationOpts: { numItems: 1, cursor: null },
      },
    )) as {
      page: Array<{
        disabled?: boolean | null
        metadata?: string | null
      }>
    }
    const application = applications.page[0]
    let appMetadata: Record<string, unknown> = {}
    try {
      appMetadata = JSON.parse(application?.metadata ?? "{}") as Record<
        string,
        unknown
      >
    } catch {
      return jsonResponse({ error: "app_metadata_invalid" }, 403)
    }
    const production = appMetadata.env === "production"
    if (
      !application ||
      application.disabled ||
      (production && appMetadata.status !== "production")
    ) {
      return jsonResponse({ error: "app_inactive" }, 403)
    }
    const idempotencyKey = request.headers.get("idempotency-key")?.trim()
    if (!idempotencyKey || idempotencyKey.length > 120) {
      return jsonResponse({ error: "idempotency_key_required" }, 400)
    }
    const json = await readJson(request)
    if (!json.ok) return json.response
    const body = (json.body ?? {}) as Record<string, unknown>
    const value = (key: string) =>
      typeof body[key] === "string" ? body[key].trim() : ""
    if (
      !["recipientSub", "senderName", "senderAddress", "subject", "body"].every(
        (key) => value(key),
      )
    ) {
      return jsonResponse({ error: "missing_fields" }, 400)
    }
    if (!production) {
      const users = (await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "user",
          where: [
            { field: "_id", value: value("recipientSub"), operator: "eq" },
          ],
          paginationOpts: { numItems: 1, cursor: null },
        },
      )) as { page: Array<{ email?: string | null }> }
      const testUsers = Array.isArray(appMetadata.testUsers)
        ? appMetadata.testUsers.map(String).map((email) => email.toLowerCase())
        : []
      const recipientEmail = users.page[0]?.email?.toLowerCase()
      if (!recipientEmail || !testUsers.includes(recipientEmail)) {
        return jsonResponse({ error: "sandbox_recipient_forbidden" }, 403)
      }
    }
    try {
      const letterId = await ctx.runMutation(
        internal.iboite.oauthApi.depositOfficialLetter,
        {
          appClientId: principal.appClientId,
          recipientSub: value("recipientSub"),
          idempotencyKey,
          senderName: value("senderName"),
          senderAddress: value("senderAddress"),
          subject: value("subject"),
          body: value("body"),
        },
      )
      return jsonResponse({ letterId }, 201)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// ---------------------------------------------------------------------------
// API partenaire de VÉRIFICATION D'IDENTITÉ — /api/partner/verifications/*
//
// Permet à une application relying party autorisée (administration.ga) de
// traiter la file des demandes depuis sa propre plateforme : consulter, se
// l'attribuer, ouvrir l'entretien vidéo, décider, publier des créneaux.
//
// Les scopes sont SÉPARÉS et non hiérarchiques (cf. developer/apiKeys.ts) :
// lire la file n'ouvre pas les pièces, et voir les pièces n'autorise pas à
// décider. Une clé de supervision peut donc observer sans jamais pouvoir agir
// sur l'identité de quiconque.
//
// ⚠️ Le partenaire VOUCHE pour son agent via `agentSub` : identite.ga ne peut
// pas re-vérifier les habilitations internes d'administration.ga. Chaque acte
// enregistre donc l'agent ET la clé qui l'a affirmé — une clé compromise se
// révoque, et tout ce qu'elle a signé reste imputable.
// ---------------------------------------------------------------------------

const JSON_HEADERS = { "Content-Type": "application/json" }

function jsonResponse(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  })
}

/** Authentifie la clé M2M et exige le scope demandé. */
async function requireVerificationScope(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
  scope: string,
) {
  const principal = await authenticateApiKey(ctx, request)
  if (!principal) {
    return {
      ok: false as const,
      response: jsonResponse({ error: "unauthorized" }, 401),
    }
  }
  if (!principal.scopes.includes(scope)) {
    return {
      ok: false as const,
      response: jsonResponse(
        { error: "insufficient_scope", message: `Scope requis : ${scope}.` },
        403,
      ),
    }
  }
  return { ok: true as const, principal }
}

/** Lit et valide le corps JSON, ou rend la réponse d'erreur adéquate. */
async function readJson(request: Request) {
  try {
    return { ok: true as const, body: (await request.json()) as unknown }
  } catch {
    return {
      ok: false as const,
      response: jsonResponse({ error: "invalid_json" }, 400),
    }
  }
}

/**
 * Traduit une ConvexError métier en réponse HTTP.
 *
 * Les codes métier (ALREADY_CLAIMED, DOCUMENT_TRACK_REJECTED…) doivent
 * traverser la frontière : le partenaire construit son UX dessus. Les laisser
 * remonter en 500 opaque obligerait ses agents à deviner pourquoi un acte a
 * échoué — et à réessayer en boucle sur un refus définitif.
 */
function businessError(error: unknown): Response {
  const data = (error as { data?: { code?: string; message?: string } })?.data
  if (data?.code) {
    const status =
      data.code === "NOT_FOUND"
        ? 404
        : data.code === "FORBIDDEN"
          ? 403
          : data.code === "ALREADY_CLAIMED"
            ? 409
            : 422
    return jsonResponse({ error: data.code, message: data.message }, status)
  }
  console.error("[partner/verifications] erreur inattendue :", error)
  return jsonResponse({ error: "internal_error" }, 500)
}

// GET /api/partner/verifications — file de travail, ou resynchronisation
// complète via ?updatedSince=<epoch_ms>.
http.route({
  path: "/api/partner/verifications",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:list",
    )
    if (!auth.ok) return auth.response

    const parsed = parseQueueQuery(new URL(request.url).searchParams)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    const result = await ctx.runQuery(
      internal.partner.verifications.listQueue,
      parsed.value,
    )
    return jsonResponse(result, 200)
  }),
})

// GET /api/partner/verifications/detail?verificationId=…
// Les pièces ne sont jointes qu'avec le scope `idn:verification:media`, et
// toujours en URL signées à durée limitée — jamais inlinées dans la réponse.
http.route({
  path: "/api/partner/verifications/detail",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:list",
    )
    if (!auth.ok) return auth.response

    const verificationId = new URL(request.url).searchParams
      .get("verificationId")
      ?.trim()
    if (!verificationId) {
      return jsonResponse(
        {
          error: "missing_verification_id",
          message: "verificationId est requis.",
        },
        400,
      )
    }
    const includeMedia = auth.principal.scopes.includes(
      "idn:verification:media",
    )
    try {
      const detail = await ctx.runQuery(
        internal.partner.verifications.getDetail,
        {
          verificationId: verificationId as never,
          includeMedia,
        },
      )
      if (!detail) return jsonResponse({ error: "NOT_FOUND" }, 404)
      return jsonResponse({ ...detail, mediaIncluded: includeMedia }, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// POST /api/partner/verifications/claim
http.route({
  path: "/api/partner/verifications/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:claim",
    )
    if (!auth.ok) return auth.response
    const json = await readJson(request)
    if (!json.ok) return json.response

    const parsed = parseAgentActedRequest(json.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    try {
      await ctx.runMutation(internal.partner.verifications.claim, {
        verificationId: parsed.value.verificationId as never,
        agentSub: parsed.value.agentSub,
        agentName: parsed.value.agentName,
        partnerKeyId: auth.principal.keyId,
      })
      return jsonResponse({ ok: true }, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// POST /api/partner/verifications/begin-interview
http.route({
  path: "/api/partner/verifications/begin-interview",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:claim",
    )
    if (!auth.ok) return auth.response
    const json = await readJson(request)
    if (!json.ok) return json.response

    const parsed = parseAgentActedRequest(json.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    try {
      await ctx.runMutation(internal.partner.verifications.beginInterview, {
        verificationId: parsed.value.verificationId as never,
        agentSub: parsed.value.agentSub,
      })
      return jsonResponse({ ok: true }, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// POST /api/partner/verifications/decision
http.route({
  path: "/api/partner/verifications/decision",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:decide",
    )
    if (!auth.ok) return auth.response
    const json = await readJson(request)
    if (!json.ok) return json.response

    const parsed = parseDecisionRequest(json.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    try {
      await ctx.runMutation(internal.partner.verifications.decide, {
        verificationId: parsed.value.verificationId as never,
        decision: parsed.value.decision,
        agentSub: parsed.value.agentSub,
        notes: parsed.value.notes,
        reason: parsed.value.reason,
      })
      return jsonResponse({ ok: true }, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// GET /api/partner/verifications/slots?agentSub=… — agenda de l'agent.
// POST — publie une plage découpée en créneaux réservables par les citoyens.
http.route({
  path: "/api/partner/verifications/slots",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:list",
    )
    if (!auth.ok) return auth.response

    const params = new URL(request.url).searchParams
    const agentSub = params.get("agentSub")?.trim()
    if (!agentSub) {
      return jsonResponse(
        { error: "missing_agent", message: "agentSub est requis." },
        400,
      )
    }
    const slots = await ctx.runQuery(internal.partner.verifications.listSlots, {
      agentSub,
      from: params.get("from") ? Number(params.get("from")) : undefined,
      to: params.get("to") ? Number(params.get("to")) : undefined,
    })
    return jsonResponse({ slots }, 200)
  }),
})

http.route({
  path: "/api/partner/verifications/slots",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:claim",
    )
    if (!auth.ok) return auth.response
    const json = await readJson(request)
    if (!json.ok) return json.response

    const parsed = parseAvailabilityRequest(json.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    try {
      const result = await ctx.runMutation(
        internal.partner.verifications.createAvailability,
        parsed.value,
      )
      return jsonResponse(result, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

// POST /api/partner/verifications/join — jeton LiveKit de l'agent.
// L'agent rejoint la salle du citoyen depuis administration.ga ; le citoyen
// reste sur identite.ga ou demarche.ga. Ni l'un ni l'autre ne change de site.
http.route({
  path: "/api/partner/verifications/join",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const auth = await requireVerificationScope(
      ctx,
      request,
      "idn:verification:join",
    )
    if (!auth.ok) return auth.response
    const json = await readJson(request)
    if (!json.ok) return json.response

    const parsed = parseAgentActedRequest(json.body)
    if (!parsed.ok) {
      return jsonResponse({ error: parsed.error, message: parsed.message }, 400)
    }
    try {
      const credentials = await ctx.runAction(
        internal.partner.verificationLivekit.issueAgentJoinToken,
        {
          verificationId: parsed.value.verificationId as never,
          agentSub: parsed.value.agentSub,
        },
      )
      return jsonResponse(credentials, 200)
    } catch (error) {
      return businessError(error)
    }
  }),
})

export default http
