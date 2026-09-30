import { APIError, createAuthEndpoint } from "better-auth/api"
import { generateRandomString } from "better-auth/crypto"
import { getClient, type Client, type OIDCOptions } from "better-auth/plugins"
import { z } from "zod"

import { parseConsentScopes } from "./consentGrant"

/**
 * Échange direct d'une session IDN contre des jetons OAuth, de serveur à
 * serveur, pour une application partenaire de confiance.
 *
 * POURQUOI. Une app partenaire (consulat.ga) fait créer l'identité numérique
 * depuis SA page : elle détient alors une session IDN sous forme de jeton
 * bearer, jamais de cookie identite.ga. Le flux OIDC classique n'accepte que
 * le cookie ; il fallait donc envoyer le navigateur poser ce cookie
 * (`/auth-continue`), revenir, relancer `/authorize`, revenir encore — trois
 * chargements de page complets, et autant d'occasions d'échouer.
 *
 * Ici, le SERVEUR du partenaire présente un jeton à usage unique tiré de cette
 * session (plugin `oneTimeToken`), plus son propre secret client. IDN émet les
 * mêmes jetons que `/oauth2/token`, écrits dans la même table : `/userinfo`,
 * le rafraîchissement et la révocation fonctionnent à l'identique.
 *
 * GARDE-FOUS, dans l'ordre d'évaluation :
 *   1. le client figure dans `IDN_TOKEN_EXCHANGE_CLIENT_IDS` — aucune app n'y
 *      a droit par défaut ;
 *   2. client confidentiel, actif, secret vérifié — AVANT de toucher au jeton,
 *      pour qu'un appelant non authentifié ne puisse pas brûler celui d'un
 *      citoyen ;
 *   3. jeton à usage unique consommé dès sa lecture, expiré après 3 minutes ;
 *   4. un consentement ENREGISTRÉ couvre les scopes demandés. On ne le crée
 *      pas ici : le partenaire le recueille dans son interface
 *      (`oauthConsents.grant`), IDN le trace et le citoyen peut le révoquer —
 *      exactement la règle de `/authorize`.
 */

export const PARTNER_TOKEN_EXCHANGE_PATH = "/oauth2/partner-token-exchange"

/** Mêmes durées que les valeurs par défaut d'`oidcProvider`. */
const ACCESS_TOKEN_EXPIRES_IN = 3600
const REFRESH_TOKEN_EXPIRES_IN = 604800

const DEFAULT_SCOPES = ["openid", "profile", "email"]

/** Liste blanche des clients autorisés, lue dans l'environnement. */
export function parseExchangeClientIds(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
}

/** Scopes demandés, ou ceux du flux OIDC du partenaire par défaut. */
export function requestedScopesOf(raw: string | undefined): string[] {
  const scopes = (raw ?? "").split(/\s+/).filter(Boolean)
  return scopes.length > 0 ? [...new Set(scopes)] : DEFAULT_SCOPES
}

/** Les scopes demandés sont-ils tous couverts par le consentement ? */
export function isCoveredByConsent(
  requested: readonly string[],
  consented: readonly string[],
): boolean {
  return requested.every((scope) => consented.includes(scope))
}

/**
 * Même format que `defaultClientSecretHasher` de Better Auth et que
 * `hashClientSecret` du portail développeur : base64url(SHA-256) sans padding.
 */
async function hashClientSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret) as BufferSource,
  )
  let binary = ""
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const bodySchema = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  subject_token: z.string().min(1),
  scope: z.string().optional(),
})

type ConsentRow = {
  clientId: string
  scopes?: string[] | string | null
  consentGiven?: boolean | null
}

export type PartnerTokenExchangeOptions = {
  /** La MÊME fonction que celle passée à `oidcProvider`. */
  getAdditionalUserInfoClaim: NonNullable<
    OIDCOptions["getAdditionalUserInfoClaim"]
  >
  /** Trace l'émission dans le journal d'audit. Best-effort. */
  onExchanged?: (event: {
    userId: string
    clientId: string
    scopes: string[]
    ip?: string
    userAgent?: string
  }) => Promise<void>
}

function oauthError(
  status: "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN",
  error: string,
  description: string,
): APIError {
  return new APIError(status, { error, error_description: description })
}

export const partnerTokenExchange = (options: PartnerTokenExchangeOptions) => ({
  id: "partner-token-exchange",
  endpoints: {
    partnerTokenExchange: createAuthEndpoint(
      PARTNER_TOKEN_EXCHANGE_PATH,
      {
        method: "POST",
        body: bodySchema,
      },
      async (ctx) => {
        const { client_id, client_secret, subject_token, scope } = ctx.body

        // 1. Liste blanche.
        const allowed = parseExchangeClientIds(
          process.env.IDN_TOKEN_EXCHANGE_CLIENT_IDS,
        )
        if (!allowed.includes(client_id)) {
          throw oauthError(
            "FORBIDDEN",
            "unauthorized_client",
            "client not allowed to exchange tokens",
          )
        }

        // 2. Authentification du client.
        const client: Client | null = await getClient(client_id)
        if (!client || client.disabled || client.type === "public") {
          throw oauthError("UNAUTHORIZED", "invalid_client", "invalid client")
        }
        if (
          !client.clientSecret ||
          !constantTimeEqual(
            await hashClientSecret(client_secret),
            client.clientSecret,
          )
        ) {
          throw oauthError(
            "UNAUTHORIZED",
            "invalid_client",
            "invalid client_secret",
          )
        }

        // 3. Jeton à usage unique — même stockage que le plugin `oneTimeToken`
        //    (clé en clair, `storeToken: "plain"` par défaut).
        const identifier = `one-time-token:${subject_token}`
        const verification =
          await ctx.context.internalAdapter.findVerificationValue(identifier)
        if (!verification) {
          throw oauthError("BAD_REQUEST", "invalid_grant", "invalid token")
        }
        await ctx.context.internalAdapter.deleteVerificationByIdentifier(
          identifier,
        )
        if (verification.expiresAt < new Date()) {
          throw oauthError("BAD_REQUEST", "invalid_grant", "token expired")
        }
        const session = await ctx.context.internalAdapter.findSession(
          verification.value,
        )
        if (!session || session.session.expiresAt < new Date()) {
          throw oauthError("BAD_REQUEST", "invalid_grant", "session expired")
        }
        const user = session.user

        // 4. Consentement enregistré.
        const requestedScopes = requestedScopesOf(scope)
        const consents = (await ctx.context.adapter.findMany({
          model: "oauthConsent",
          where: [{ field: "userId", value: user.id }],
        })) as ConsentRow[]
        const consent = consents.find(
          (c) => c.clientId === client_id && c.consentGiven !== false,
        )
        if (
          !consent ||
          !isCoveredByConsent(
            requestedScopes,
            parseConsentScopes(consent.scopes ?? null),
          )
        ) {
          throw oauthError(
            "FORBIDDEN",
            "consent_required",
            "no recorded consent covers the requested scopes",
          )
        }

        // Émission — même ligne que `/oauth2/token` (oidc-provider/index.mjs).
        const iat = Math.floor(Date.now() / 1000)
        const accessToken = generateRandomString(32, "a-z", "A-Z")
        const refreshToken = generateRandomString(32, "A-Z", "a-z")
        await ctx.context.adapter.create({
          model: "oauthAccessToken",
          data: {
            accessToken,
            refreshToken,
            accessTokenExpiresAt: new Date((iat + ACCESS_TOKEN_EXPIRES_IN) * 1000),
            refreshTokenExpiresAt: new Date(
              (iat + REFRESH_TOKEN_EXPIRES_IN) * 1000,
            ),
            clientId: client_id,
            userId: user.id,
            scopes: requestedScopes.join(" "),
            createdAt: new Date(iat * 1000),
            updatedAt: new Date(iat * 1000),
          },
        })

        // Mêmes claims que `/oauth2/userinfo` : le partenaire n'a pas à faire
        // un aller-retour de plus pour lire ce qu'il obtiendrait de toute façon.
        const has = (s: string) => requestedScopes.includes(s)
        const baseClaims = {
          sub: user.id,
          email: has("email") ? user.email : undefined,
          name: has("profile") ? user.name : undefined,
          picture: has("profile") ? user.image : undefined,
          given_name: has("profile") ? user.name.split(" ")[0] : undefined,
          family_name: has("profile") ? user.name.split(" ")[1] : undefined,
          email_verified: has("email") ? user.emailVerified : undefined,
        }
        const extraClaims = await options.getAdditionalUserInfoClaim(
          user,
          requestedScopes,
          client,
        )

        try {
          await options.onExchanged?.({
            userId: user.id,
            clientId: client_id,
            scopes: requestedScopes,
            ip: ctx.request?.headers.get("x-forwarded-for") ?? undefined,
            userAgent: ctx.request?.headers.get("user-agent") ?? undefined,
          })
        } catch (err) {
          console.error("[idn:partner-token-exchange] audit failed", err)
        }

        return ctx.json(
          {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: ACCESS_TOKEN_EXPIRES_IN,
            refresh_token: has("offline_access") ? refreshToken : undefined,
            scope: requestedScopes.join(" "),
            userinfo: { ...baseClaims, ...extraClaims },
          },
          { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
        )
      },
    ),
  },
})
