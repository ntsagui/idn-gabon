// Sans node_modules racine : bash scripts/test-federated-sign-in.sh
import { afterEach, describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { betterAuth } from "better-auth"
import { memoryAdapter } from "better-auth/adapters/memory"
import { createAuthClient } from "better-auth/client"
import { oidcProvider } from "better-auth/plugins"
import { crossDomain } from "@convex-dev/better-auth/plugins"
import { crossDomainClient } from "@convex-dev/better-auth/client/plugins"
import { NextRequest } from "next/server"

import { pinSignIn } from "../packages/backend/convex/lib/pinSignInPlugin"
import {
  authorizeFederatedSignIn,
  getProviderRedirect,
  resumeFederatedSignIn,
} from "../apps/web/lib/federated-sign-in"

const portal = "https://identite.example"
const provider = "https://provider.example"
const callback = "https://administration.example/callback"
process.env.CONVEX_SITE_URL = provider
const { GET, POST } = await import("../apps/web/app/api/auth/[...all]/route")
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

// Le harness exerce les vrais plugins dans l'ordre effectif du backend.
// Une régression de cet ordre doit faire échouer le parcours prompt=login.
const backend = readFileSync(
  new URL("../packages/backend/convex/auth.ts", import.meta.url),
  "utf8",
)
const crossDomainLast =
  backend.indexOf("      crossDomain({") >
  backend.indexOf("      oidcProvider({")

async function setup() {
  const database: Record<string, unknown[]> = {
    user: [],
    session: [],
    account: [],
    verification: [],
    oauthConsent: [],
    oauthApplication: [],
    oauthAccessToken: [],
  }
  const auth = betterAuth({
    baseURL: provider,
    secret: "test-only-secret-for-oidc-response-contract-1234567890",
    database: memoryAdapter(database),
    emailAndPassword: { enabled: true },
    plugins: [
      // Même ordre que le backend, avec son endpoint PIN réel.
      ...(crossDomainLast ? [] : [crossDomain({ siteUrl: portal })]),
      pinSignIn(async (_, pin) => pin === "123456" ? "valid" : "invalid"),
      oidcProvider({
        loginPage: `${portal}/sign-in`,
        consentPage: `${portal}/oauth/authorize`,
        requirePKCE: true,
        trustedClients: [
          {
            clientId: "administration-test",
            clientSecret: "test-client-secret",
            name: "Administration test",
            type: "web",
            disabled: false,
            skipConsent: true,
            redirectUrls: [callback],
            metadata: {},
          },
        ],
      }),
      ...(crossDomainLast ? [crossDomain({ siteUrl: portal })] : []),
    ],
  })
  const context = await auth.$context
  await context.internalAdapter.createUser({
    email: "agent@idn.ga",
    name: "Agent test",
    emailVerified: true,
  })
  const responses: Array<{ path: string; status: number; body: unknown }> = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await auth.handler(new Request(input, init))
    responses.push({
      path: new URL(String(input)).pathname,
      status: response.status,
      body: await response
        .clone()
        .json()
        .catch(() => null),
    })
    return response
  }) as typeof fetch
  const storage = new Map<string, string>()
  const client = createAuthClient({
    baseURL: portal,
    plugins: [
      crossDomainClient({
        storage: {
          getItem: (key) => storage.get(key) ?? null,
          setItem: (key, value) => storage.set(key, value),
        },
      }),
    ],
    fetchOptions: {
      customFetchImpl: async (input, init) => {
        // Métadonnées émises par le navigateur pour fetch(), même same-origin.
        const headers = new Headers(init?.headers)
        headers.set("sec-fetch-mode", "cors")
        headers.set("origin", portal)
        const request = new NextRequest(input, { ...init, headers })
        return request.method === "GET" ? GET(request) : POST(request)
      },
    },
  })
  const params = new URLSearchParams({
    client_id: "administration-test",
    response_type: "code",
    redirect_uri: callback,
    scope: "openid profile email",
    state: "fonction-publique",
    nonce: "nonce-1",
    code_challenge: "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG",
    code_challenge_method: "S256",
  })
  const signIn = () =>
    client.$fetch("/sign-in/pin", {
      method: "POST",
      body: { email: "agent@idn.ga", pin: "123456" },
    })
  const expireSessionAge = () => {
    for (const record of database.session ?? []) {
      ;(record as { createdAt: Date }).createdAt = new Date(
        Date.now() - 7_200_000,
      )
    }
  }
  return { client, params, signIn, responses, expireSessionAge }
}

describe("contrat HTTP du fournisseur OIDC et du proxy web", () => {
  test("session existante : le vrai endpoint renvoie le JSON attendu par $fetch", async () => {
    const { client, params, signIn, responses } = await setup()
    expect((await signIn()).error).toBeNull()
    const url = await resumeFederatedSignIn(params, client)
    expect(new URL(url!).origin).toBe(new URL(callback).origin)
    expect(new URL(url!).searchParams.get("state")).toBe("fonction-publique")
    const response = responses.find((item) =>
      item.path.endsWith("/oauth2/authorize"),
    )!
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ redirect: true, url })
  })

  test("sans session : le PIN établit la session puis l'autorisation reprend", async () => {
    const { client, params, signIn } = await setup()
    expect(await resumeFederatedSignIn(params, client)).toBeNull()
    expect((await signIn()).error).toBeNull()
    const url = await authorizeFederatedSignIn(params, client)
    expect(new URL(url).searchParams.get("code")).toBeTruthy()
    expect(new URL(url).searchParams.get("state")).toBe("fonction-publique")
  })

  test("prompt=login : le fournisseur exige le PIN puis reprend le callback", async () => {
    const { client, params, signIn } = await setup()
    await signIn()
    params.set("prompt", "login")
    const challenge = new URL((await resumeFederatedSignIn(params, client))!)
    expect(challenge.pathname).toBe("/sign-in")
    expect(challenge.searchParams.get("code")).toBeTruthy()
    expect(
      await resumeFederatedSignIn(challenge.searchParams, client),
    ).toBeNull()
    const signedIn = await signIn()
    const redirect = getProviderRedirect(signedIn)
    expect(redirect).not.toBeNull()
    expect(new URL(redirect!).origin).toBe(new URL(callback).origin)
  })

  test("les rejets 302 réels restent lisibles en JSON et ne deviennent pas un fetch HTML", async () => {
    const { client, params, signIn, responses } = await setup()
    await signIn()
    params.set("client_id", "unknown-client")
    const result = await client.$fetch(`/oauth2/authorize?${params}`)
    expect(responses.at(-1)?.status).toBe(302)
    const redirect = getProviderRedirect(result)
    expect(redirect).not.toBeNull()
    expect(new URL(redirect!).searchParams.get("error")).toBe("invalid_client")
  })

  test("max_age expiré exige une nouvelle session avant de revenir à l'application", async () => {
    const { client, params, signIn, expireSessionAge } = await setup()
    await signIn()
    expireSessionAge()
    params.set("max_age", "3600")
    const challenge = new URL((await resumeFederatedSignIn(params, client))!)
    expect(challenge.pathname).toBe("/sign-in")
    expect(challenge.searchParams.get("code")).toBeTruthy()
    const redirect = getProviderRedirect(await signIn())
    expect(new URL(redirect!).origin).toBe(new URL(callback).origin)
  })

  test("une navigation HTML conserve le 302 du fournisseur", async () => {
    const { params } = await setup()
    const response = await GET(
      new NextRequest(`${portal}/api/auth/oauth2/authorize?${params}`, {
        headers: { "sec-fetch-mode": "navigate", accept: "text/html" },
      }),
    )
    expect(response.status).toBe(302)
    expect(new URL(response.headers.get("location")!).pathname).toBe("/sign-in")
  })
})
