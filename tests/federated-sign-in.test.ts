import { describe, expect, test } from "bun:test"

import {
  authorizeFederatedSignIn,
  getProviderRedirect,
  resumeFederatedSignIn,
} from "../apps/web/lib/federated-sign-in"

const params = () =>
  new URLSearchParams({
    client_id: "administration-ga",
    response_type: "code",
    redirect_uri: "https://espace.administration.ga/api/auth/callback/idn",
    state: "institution-fonction-publique",
    nonce: "nonce-1",
    code_challenge: "pkce-challenge",
    code_challenge_method: "S256",
    scope: "openid profile email",
    acr_values: "eidas2",
  })
const callback =
  "https://espace.administration.ga/api/auth/callback/idn?code=code-1&state=institution-fonction-publique"
const providerResponse = (url: string) => ({ data: { redirect: true, url } })

describe("reprise OIDC depuis le portail Identité.ga", () => {
  test("réutilise la session connectée et garde le contexte complet de l'application", async () => {
    const request = params()
    request.set("redirect_to", "/dashboard")
    request.set("sso_checked", "1")
    const calls: string[] = []
    const result = await resumeFederatedSignIn(request, {
      getSession: async () => ({ data: { session: { id: "existing" } } }),
      $fetch: async (path, options) => {
        calls.push(path)
        expect(options.method).toBe("GET")
        return providerResponse(callback)
      },
    })
    expect(result).toBe(callback)
    expect(calls).toHaveLength(1)
    const query = new URL(calls[0]!, "https://identite.ga").searchParams
    expect(Object.fromEntries(query)).toEqual(Object.fromEntries(params()))
  })

  test("laisse le formulaire aux utilisateurs sans session, puis reprend après connexion", async () => {
    let authorized = false
    const client = {
      getSession: async () => ({ data: null }),
      $fetch: async () => {
        authorized = true
        return providerResponse(callback)
      },
    }
    expect(await resumeFederatedSignIn(params(), client)).toBeNull()
    expect(authorized).toBe(false)
    expect(await authorizeFederatedSignIn(params(), client)).toBe(callback)
    expect(authorized).toBe(true)
  })

  for (const constraint of [
    "prompt=login",
    "prompt=consent",
    "prompt=none",
    "max_age=0",
    "max_age=3600",
  ]) {
    test(`délègue ${constraint} au fournisseur sans l'effacer ni contourner son challenge`, async () => {
      const request = params()
      for (const [key, value] of new URLSearchParams(constraint))
        request.set(key, value)
      const challenge =
        "https://identite.ga/sign-in?client_id=administration-ga&code=reauth-code&state=original"
      expect(
        await resumeFederatedSignIn(request, {
          getSession: async () => ({ data: { session: { id: "existing" } } }),
          $fetch: async (path) => {
            const query = new URL(path, "https://identite.ga").searchParams
            for (const [key, value] of request)
              expect(query.get(key)).toBe(value)
            return providerResponse(challenge)
          },
        }),
      ).toBe(challenge)
    })
  }

  test("n'utilise pas la session existante pour satisfaire un challenge de réauthentification", async () => {
    const fail = async (): Promise<never> => {
      throw new Error("must not call auth")
    }
    expect(
      await resumeFederatedSignIn(
        new URLSearchParams("client_id=app&code=reauth-code"),
        {
          getSession: fail,
          $fetch: fail,
        },
      ),
    ).toBeNull()
    // Après authentification, c'est le hook du fournisseur qui fournit le retour.
    expect(getProviderRedirect(providerResponse(callback))).toBe(callback)
  })

  test("conserve la connexion normale au portail", async () => {
    const fail = async (): Promise<never> => {
      throw new Error("must not call auth")
    }
    expect(
      await resumeFederatedSignIn(
        new URLSearchParams("redirect_to=/dashboard"),
        {
          getSession: fail,
          $fetch: fail,
        },
      ),
    ).toBeNull()
  })

  test("sans session, prompt=none suit l'erreur OAuth plutôt que d'afficher un formulaire", async () => {
    const request = params()
    request.set("prompt", "none")
    const errorUrl = `${callback}&error=login_required`
    expect(
      await resumeFederatedSignIn(request, {
        getSession: async () => ({ data: null }),
        $fetch: async () => providerResponse(errorUrl),
      }),
    ).toBe(errorUrl)
  })

  test("ne redirige pas vers le callback non validé lorsqu'une session ou une autorisation échoue", async () => {
    await expect(
      resumeFederatedSignIn(params(), {
        getSession: async () => ({ error: { status: 503 } }),
        $fetch: async () => providerResponse(callback),
      }),
    ).rejects.toThrow("Unable to check")
    await expect(
      authorizeFederatedSignIn(params(), {
        $fetch: async () => ({ error: { status: 400 } }),
      }),
    ).rejects.toThrow("did not return a redirect")
  })

  test("refuse les URLs exécutables et les réponses sans redirection explicite", () => {
    expect(
      getProviderRedirect(providerResponse("javascript:alert(1)")),
    ).toBeNull()
    expect(getProviderRedirect({ data: { url: callback } })).toBeNull()
    expect(
      getProviderRedirect({
        ...providerResponse(callback),
        error: { status: 400 },
      }),
    ).toBeNull()
  })
})
