import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex, crossDomain } from "@convex-dev/better-auth/plugins"
import { expo } from "@better-auth/expo"
import { passkey } from "@better-auth/passkey"
import { createAuthMiddleware } from "better-auth/api"
import { deleteSessionCookie } from "better-auth/cookies"
import { betterAuth } from "better-auth/minimal"
import type { Auth } from "better-auth"
import {
  emailOTP,
  haveIBeenPwned,
  jwt,
  oneTimeToken,
  oidcProvider,
  twoFactor,
} from "better-auth/plugins"

// ─────────────────────────────────────────────────────────────────────────
// Polyfill : `URL.canParse` (Node 19.9+ / Bun) — le V8 runtime Convex ne
// l'expose pas, et @better-auth/oauth-provider v1.6.x l'utilise (sinon
// les routes /api/auth/oauth2/{authorize,register,...} crashent avec
// `TypeError: URL.canParse is not a function`).
//
// Spec : retourne true si `new URL(input, base)` ne throw pas.
// ─────────────────────────────────────────────────────────────────────────
if (typeof (URL as { canParse?: unknown }).canParse !== "function") {
  ;(URL as { canParse: (input: string, base?: string) => boolean }).canParse = (
    input: string,
    base?: string,
  ) => {
    try {
      new URL(input, base)
      return true
    } catch {
      return false
    }
  }
}

import { components, internal } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"
import { pinSignIn } from "./lib/pinSignInPlugin"
import { userinfoClaimsForScopes, type UserinfoProfile } from "./lib/userinfoClaims"
import {
  handleSignInTwoFactorGate,
  requiresTwoFactorChallenge,
} from "./lib/twoFactorGate"

const isDev = process.env.NODE_ENV !== "production"

/**
 * Trusted origins lus depuis la variable d'env Convex `TRUSTED_ORIGINS`
 * (CSV). En dev, la fonction `trustedOrigins` ci-dessous accepte aussi
 * dynamiquement n'importe quel `localhost` / `127.0.0.1` / `*.local`
 * venant du header Origin.
 *
 * Set via : `bunx convex env set TRUSTED_ORIGINS "https://...,https://..."`
 */
function parseTrustedOrigins(): string[] {
  return (process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)
}

/**
 * Dérive le `siteUrl` du plugin crossDomain depuis le header Origin de la
 * requête. Permet à chaque app (web, admin, developer, controller) de se
 * voir renvoyer les redirects OAuth/OIDC vers son propre origin.
 *
 * Fallback : env SITE_URL → "http://localhost:3000".
 */
function resolveSiteUrl(origin?: string | null): string {
  if (origin) {
    try {
      return new URL(origin).origin
    } catch {
      /* invalid origin, use fallback */
    }
  }
  return process.env.SITE_URL ?? "http://localhost:3000"
}

/**
 * Client Better Auth + Convex.
 * Le composant @convex-dev/better-auth gère ses propres tables (user,
 * account, session, oauthApplication, oauthConsent, jwks, etc.) dans
 * son namespace isolé.
 */
export const authComponent = createClient<DataModel>(components.betterAuth)

/**
 * Configuration Better Auth — appelée à chaque requête HTTP via http.ts.
 * Cf. cahier §6.2 (auth + politique mots de passe), §6.4 (sessions),
 * §6.5 (OIDC hardening), §3.7 (serveur OIDC).
 *
 * `requestOrigin` est passé par http.ts (header Origin de la requête)
 * pour que le plugin crossDomain rewrite les callbacks OAuth vers l'app
 * appelante.
 */
export const createAuth = (
  ctx: GenericCtx<DataModel>,
  requestOrigin?: string | null,
): Auth => {
  return betterAuth({
    appName: "IDN",
    // baseURL = CONVEX_SITE_URL pour que le JWT `iss` corresponde à ce
    // qu'attend Convex (cf. auth.config.ts → getAuthConfigProvider()).
    // L'origin dynamique de l'app appelante n'est utilisée que par le
    // plugin crossDomain pour rewrite les redirects OAuth.
    baseURL: process.env.CONVEX_SITE_URL,
    database: authComponent.adapter(ctx),
    trustedOrigins: isDev
      ? (request) => {
          const origins = parseTrustedOrigins()
          const reqOrigin = request?.headers?.get("origin")
          if (reqOrigin) {
            try {
              const url = new URL(reqOrigin)
              if (
                url.hostname === "localhost" ||
                url.hostname === "127.0.0.1" ||
                url.hostname.endsWith(".local")
              ) {
                origins.push(reqOrigin)
              }
            } catch {
              /* ignore */
            }
          }
          return origins
        }
      : parseTrustedOrigins(),
    emailAndPassword: {
      enabled: true,
      // Le sign-up crée immédiatement la session (sinon impossible d'appeler
      // les mutations IDN avant d'avoir signé séparément). La vérification
      // d'email reste obligatoire côté métier : nos mutations sensibles
      // passent par requireVerifiedAuth() qui contrôle `emailVerified`.
      requireEmailVerification: false,
      minPasswordLength: 12,
      maxPasswordLength: 256,
      // Une récupération de compte invalide les sessions potentiellement
      // ouvertes avec l'ancien mot de passe.
      revokeSessionsOnPasswordReset: true,
      onPasswordReset: async ({ user }) => {
        try {
          await (
            ctx as unknown as {
              runMutation: (
                ref: typeof internal.audit.recordAudit,
                args: {
                  action: "password_changed"
                  targetType: "user"
                  targetId: string
                  metadata: { method: string }
                },
              ) => Promise<unknown>
            }
          ).runMutation(internal.audit.recordAudit, {
            action: "password_changed",
            targetType: "user",
            targetId: user.id,
            metadata: { method: "password_reset_otp" },
          })
        } catch (error) {
          // Le mot de passe est déjà remplacé à ce stade dans Better Auth :
          // un incident d'audit ne doit pas transformer le succès en erreur
          // côté citoyen. Il reste observable dans les logs serveur.
          console.error("[auth] password reset audit failed", error)
        }
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14, // 14 jours (§6.3)
      updateAge: 60 * 60 * 24, // refresh quotidien
    },
    /**
     * Hook DB Better Auth : à chaque création de session (sign-in OK,
     * sign-up OK ou OTP/2FA vérifié), on écrit un événement `login_success`
     * dans `auditLog`. C'est ce qui alimente la sparkline « Connexions
     * par jour » du dashboard admin (cf. admin/dashboard.getDailyLogins).
     */
    databaseHooks: {
      session: {
        create: {
          after: async (session: {
            userId?: string
            ipAddress?: string | null
            userAgent?: string | null
          }) => {
            try {
              await (
                ctx as unknown as {
                  runMutation: (
                    ref: typeof internal.audit.recordAudit,
                    args: {
                      actorId?: string
                      action: "login_success"
                      targetType: "session"
                      targetId: string
                      ip?: string
                      userAgent?: string
                    },
                  ) => Promise<unknown>
                }
              ).runMutation(internal.audit.recordAudit, {
                actorId: session.userId ?? undefined,
                action: "login_success",
                targetType: "session",
                targetId: session.userId ?? "—",
                ip: session.ipAddress ?? undefined,
                userAgent: session.userAgent ?? undefined,
              })
            } catch (err) {
              // Ne pas casser la connexion si l'audit foire.
              console.error("[auth] login audit failed", err)
            }
          },
        },
      },
    },
    advanced: {
      // Convex tourne toujours en HTTPS → Better Auth infère Secure cookies.
      // En dev, le proxy Next.js parle en http://localhost → le navigateur
      // refuserait les cookies Secure. On les force non-secure (le proxy
      // strip aussi le préfixe __Secure- au passage).
      useSecureCookies: isDev ? false : undefined,
    },
    hooks: {
      // Gate 2FA générique pour TOUS les endpoints /sign-in/* — deux failles
      // corrigées ici :
      //
      // 1) Le hook natif du plugin `twoFactor` ne matche que
      //    /sign-in/email|username|phone-number (câblé en dur dans la lib).
      //    Le plugin `emailOTP` expose /sign-in/email-otp, qui crée
      //    directement une session sans passer par ce matcher : un compte
      //    `twoFactorEnabled` pouvait contourner totalement le TOTP en
      //    passant par l'OTP email (better-auth/dist/plugins/email-otp/
      //    routes.mjs → signInEmailOTP). (`/sign-in/pin` n'a jamais ce
      //    problème : il ne crée jamais de session en premier lieu — cf.
      //    pinSignInPlugin.ts — donc `ctx.context.newSession` reste déjà
      //    `null` et ce hook y est un no-op.)
      //
      // 2) BLOQUANT trouvé en revue authz : ni le hook natif du plugin
      //    `twoFactor` ni notre gate email-otp d'origine ne neutralisaient
      //    `ctx.context.newSession` après avoir supprimé la session DB. Or
      //    le plugin `convex` de @convex-dev/better-auth (dist/plugins/
      //    convex/index.js) pose SON PROPRE hook `after` sur tout chemin
      //    /sign-in* : `ctx.context.session = ctx.context.session ??
      //    ctx.context.newSession` puis `jwt.endpoints.getToken()` → pose
      //    le cookie `convex_jwt` (~15 min). Comme la signature JWT ne
      //    dépend que des objets `session`/`user` en mémoire (pas d'un
      //    re-fetch DB), ce hook réussissait MÊME APRÈS que la session DB
      //    ait été supprimée : un compte 2FA complétant /sign-in/email (ou
      //    /sign-in/email-otp) recevait quand même un `convex_jwt`
      //    exploitable sur le plan de données Convex, alors que la réponse
      //    JSON annonçait `twoFactorRedirect: true` — 2FA totalement
      //    contournée côté Convex. On neutralise donc explicitivement
      //    `newSession`/`session` AVANT de rendre la main : les hooks
      //    suivants (natif `twoFactor` inclus, qui voit alors `data` null
      //    et no-op ; et le hook `convex`, dont `getToken()` échoue et est
      //    catché en silence) ne peuvent alors plus émettre ni cookie de
      //    session ni `convex_jwt`. Ce hook, enregistré au niveau top-level
      //    de `betterAuth()`, s'exécute TOUJOURS avant les hooks `after`
      //    apportés par les plugins (cf. better-auth/dist/api/
      //    to-auth-endpoints.mjs → getHooks()), donc avant celui du plugin
      //    `twoFactor` ET celui du plugin `convex` — on prend donc en
      //    charge nous-mêmes toute la logique de gate pour /sign-in/email
      //    |username|phone-number ici (le hook natif du plugin `twoFactor`
      //    devient un no-op puisqu'on a déjà vidé `newSession`).
      //
      // Passkey (`/passkey/verify-authentication`) N'EST PAS sur
      // /sign-in/* et n'est donc jamais concerné — exemption volontaire
      // (cf. lib/twoFactorGate.ts).
      //
      // La logique elle-même (delete session + neutralisation newSession/
      // session + verification/cookie 2FA en attente) vit dans
      // `handleSignInTwoFactorGate` (lib/twoFactorGate.ts) pour rester
      // testable sans monter tout le contexte Better Auth — seul
      // `deleteSessionCookie` (expiration du cookie de session côté
      // navigateur, pas la partie sécurité critique) reste appelé ici.
      after: createAuthMiddleware(async (ctx) => {
        const data = ctx.context.newSession
        const isGated =
          ctx.path?.startsWith("/sign-in") &&
          data &&
          requiresTwoFactorChallenge(
            data.user as { twoFactorEnabled?: boolean | null },
          )
        if (!isGated) return
        // Expire le cookie de session côté navigateur avant que
        // `handleSignInTwoFactorGate` ne supprime la session en base et ne
        // neutralise l'état en mémoire.
        deleteSessionCookie(ctx, true)
        return handleSignInTwoFactorGate(ctx)
      }),
    },
    plugins: [
      // Reprise d'une session ouverte depuis une autre origine. Sert à
      // `/auth-continue` : une app partenaire qui fait inscrire un citoyen
      // depuis SON domaine obtient un jeton bearer, pas un cookie identite.ga —
      // or /oauth2/authorize ne lit que le cookie. Le jeton est à usage unique
      // et expire après 3 minutes.
      //
      // NB : ne sert plus aux transferts entre surfaces IDN — depuis la fusion
      // de connect.identite.ga dans identite.ga, il n'y a plus qu'un domaine.
      oneTimeToken(),

      // Sign-in par PIN à 6 chiffres — endpoint /api/auth/sign-in/pin.
      // Le plugin reçoit (email, pin), résout l'email via Better Auth,
      // vérifie le pinHash côté Convex (PBKDF2-SHA256, §6.1) puis crée
      // la session standard via internalAdapter.createSession.
      pinSignIn(async (userId, pin) => {
        return await (
          ctx as unknown as {
            runQuery: (
              ref: typeof internal.onboarding.verifyPinForUserId,
              args: { userId: string; pin: string },
            ) => Promise<"valid" | "invalid" | "setup_required">
          }
        ).runQuery(internal.onboarding.verifyPinForUserId, {
          userId,
          pin,
        })
      }),

      // Support Expo (beta) — gère le retour de session via deep link
      // (scheme idn://) et l'authent depuis l'app mobile RN. À utiliser
      // conjointement avec expoClient() côté client + expo-secure-store.
      expo(),

      // WebAuthn / passkey — enrôlement biométrique (Face ID / Touch ID
      // sur iOS, Credential Manager sur Android, plateformes WebAuthn sur
      // desktop). `rpID` = hostname (sans schéma ni port). `origin` doit
      // inclure tous les origins qui authentifient (HTTPS de prod, scheme
      // expo, dev tunnels). En dev par défaut on accepte localhost.
      passkey({
        rpID: process.env.PASSKEY_RP_ID ?? "localhost",
        rpName: "Identité Numérique",
        origin: (() => {
          const csv = process.env.PASSKEY_RP_ORIGINS ?? ""
          const fromEnv = csv
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
          // Toujours autoriser le scheme expo mobile (idn://) en plus.
          return fromEnv.length > 0 ? [...fromEnv, "idn://"] : ["idn://"]
        })(),
      }),

      // OTP 6 chiffres — utilisé pour reset password / changement email côté
      // admin/web ; l'inscription IDN ne déclenche pas d'OTP (l'adresse
      // @idn.ga est vérifiée par construction via `onboarding.completeSignup`).
      emailOTP({
        otpLength: 6,
        expiresIn: 60 * 15, // 15 min (§3.2)
        // Les codes de récupération sont des secrets d'authentification.
        // L'admin ne voit le code provisoire qu'une fois ; seule son
        // empreinte reste ensuite dans le composant Better Auth.
        storeOTP: "hashed",
        sendVerificationOnSignUp: false,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await (ctx as any).scheduler.runAfter(
            0,
            internal.email.dispatch.sendOtp,
            { to: email, code: otp, type },
          )
        },
      }),

      // 2FA TOTP (obligatoire admin / identity_controller — §6.2)
      twoFactor({ issuer: "IDN" }),

      // Vérification HIBP côté Better Auth — bloque les mots de passe leakés
      // sur sign-up / change-password / reset-password.
      haveIBeenPwned({
        customPasswordCompromisedMessage:
          "Ce mot de passe figure dans une fuite de données publique. Choisissez-en un autre.",
      }),

      // Serveur OAuth/OIDC — `oidcProvider` intégré à better-auth/plugins
      // (NB : pas le plugin séparé `@better-auth/oauth-provider` qui n'est
      // pas compatible avec le schema du composant @convex-dev/better-auth
      // 0.12.2 — voir l'ancien projet /Users/berny/Developer/idn/apps/portal
      // qui utilise déjà ce pattern).
      //
      // `loginPage` / `consentPage` sont des URLs complètes vers apps/web
      // (identite.ga) — Convex ne sert pas de HTML. Elles DOIVENT rester sur le
      // même domaine que `authorization_endpoint` (cf. la réécriture dans
      // http.ts) : c'est ce domaine qui porte le cookie de session, donc le seul
      // où un retour vers /oauth2/authorize après login voit cette session.
      // `useJWTPlugin: true` → ID tokens signés en RS256 via le plugin jwt
      // ci-dessous (§6.1) plutôt qu'en HS256 avec BETTER_AUTH_SECRET.
      oidcProvider({
        // Scopes custom `idn:*` supportés en plus des scopes OIDC standard.
        // Better Auth valide CHAQUE scope demandé sur /authorize contre une
        // allowlist GLOBALE = ["openid","profile","email","offline_access",
        // ...scopes] (voir oidc-provider/authorize.mjs). Les scopes déclarés
        // par client dans le portail développeur ne sont PAS consultés ici :
        // sans cette option, tout scope custom (ex. idn:civil_status) est
        // rejeté avec `invalid_scope`. À garder en phase avec AVAILABLE_SCOPES
        // (apps/developer/.../applications/new) et claimsForScopes
        // (apps/web/app/oauth/authorize/_components/consent-form.tsx).
        scopes: [
          "idn:civil_status",
          "idn:iboite.read",
          "idn:iboite.manage",
          "idn:iboite.send",
        ],
        loginPage:
          process.env.IDN_LOGIN_PAGE ?? "http://localhost:3000/sign-in",
        consentPage:
          process.env.IDN_CONSENT_PAGE ??
          "http://localhost:3000/oauth/authorize",
        requirePKCE: true,
        useJWTPlugin: true,
        allowPlainCodeChallengeMethod: false,
        // Stocke ET compare les client_secret HACHÉS (base64url(SHA-256(secret))
        // sans padding = `defaultClientSecretHasher` de better-auth) au lieu d'en
        // clair. Le portail développeur (developer/apps.ts → hashClientSecret) doit
        // stocker le secret avec EXACTEMENT ce même hash. Sans cette option,
        // oidcProvider compare le secret reçu en clair à la valeur stockée : tout
        // client créé via le portail (qui stocke un hash) échouait alors au token
        // endpoint avec `invalid_client`.
        storeClientSecret: "hashed",
        // Injecte le claim `env` (sandbox/production) dans l'ID token et la
        // réponse /oauth2/userinfo. Sert aussi de filet défensif : si un
        // utilisateur non whitelisté contourne l'UI consent en sandbox, on
        // throw — Better Auth refuse alors l'émission du token.
        getAdditionalUserInfoClaim: async (user, scopes, client) => {
          const meta = (client.metadata ?? {}) as Record<string, unknown>
          const env = meta.env === "production" ? "production" : "sandbox"
          if (env === "sandbox") {
            const list = Array.isArray(meta.testUsers)
              ? (meta.testUsers as unknown[]).map((e) =>
                  typeof e === "string" ? e.toLowerCase() : "",
                )
              : []
            const email = String(
              (user as { email?: unknown }).email ?? "",
            ).toLowerCase()
            const ownerId =
              typeof meta.createdBy === "string" ? meta.createdBy : null
            const userId = String((user as { id?: unknown }).id ?? "")
            if (
              email.length > 0 &&
              !list.includes(email) &&
              (ownerId === null || userId !== ownerId)
            ) {
              throw new Error("sandbox_access_denied")
            }
          }
          // Scopes fournis par le jeton validé, jamais par une query utilisateur.
          const profile: UserinfoProfile | null = scopes.some((scope) =>
            scope === "profile" || scope === "idn:civil_status",
          ) ? await ctx.runQuery(internal.profile.getForUserinfo, { userId: user.id }) : null
          return { env, ...userinfoClaimsForScopes(scopes, profile) }
        },
      }),

      // Après oidcProvider : son hook doit lire Set-Cookie pour reprendre une
      // réauthentification avant que crossDomain le transforme en
      // Set-Better-Auth-Cookie pour le stockage localStorage du navigateur.
      crossDomain({
        siteUrl: resolveSiteUrl(requestOrigin),
      }),

      // Émission ID tokens RS256 + JWKS publique (§6.1)
      jwt({
        jwks: { keyPairConfig: { alg: "RS256", modulusLength: 2048 } },
      }),

      // Plugin requis par @convex-dev/better-auth pour exposer l'auth à
      // Convex (endpoint /api/auth/convex/token utilisé par
      // ConvexBetterAuthProvider). Enregistré en dernier — c'était l'ordre
      // qui fonctionnait avec @convex-dev/better-auth 0.12.x.
      convex({ authConfig }),
    ],
  }) as unknown as Auth
}

/**
 * Renvoie le user Better Auth courant (côté Convex query/mutation).
 * Helper standard de @convex-dev/better-auth — accède aux tables du
 * composant isolé via son adapter.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})
