import { describe, expect, test } from "bun:test"

import {
  appReturnUrl,
  classifyConsentError,
  consentFailureMessage,
  denyFallbackUrl,
  getConsentRedirect,
  signInAgainUrl,
  submitConsentDecision,
} from "../apps/web/lib/consent-flow"

const callback =
  "https://administration.ga/api/auth/oauth2/callback/idn?code=code-1&state=fonction-publique"

type Call = { path: string; options: { method: "POST"; body: Record<string, unknown> } }

const clientReturning = (result: unknown, calls: Call[] = []) => ({
  $fetch: async (path: string, options: Call["options"]) => {
    calls.push({ path, options })
    return result as { data?: unknown; error?: unknown }
  },
})

describe("consentement OIDC — la décision voyage avec la session du portail", () => {
  test("accepte par le client Better Auth et suit l'URL rendue par le fournisseur", async () => {
    const calls: Call[] = []
    const outcome = await submitConsentDecision(
      { accept: true, consentCode: "consent-1" },
      clientReturning({ data: { redirectURI: callback } }, calls),
    )
    expect(outcome).toEqual({ kind: "redirect", url: callback })
    // Le client (et son en-tête Better-Auth-Cookie) est le SEUL transport :
    // aucun fetch brut, et le code vient de la query, pas d'un cookie.
    expect(calls).toEqual([
      {
        path: "/oauth2/consent",
        options: { method: "POST", body: { accept: true, consent_code: "consent-1" } },
      },
    ])
  })

  test("refuse : le fournisseur renvoie access_denied vers l'application", async () => {
    const denied = `${callback.split("?")[0]}?error=access_denied&error_description=User denied access`
    const outcome = await submitConsentDecision(
      { accept: false, consentCode: "consent-1" },
      clientReturning({ data: { redirectURI: denied } }),
    )
    expect(outcome).toEqual({ kind: "redirect", url: new URL(denied).toString() })
  })

  test("sans code en query, le corps n'en invente pas (le cookie signé reste au fournisseur)", async () => {
    const calls: Call[] = []
    await submitConsentDecision(
      { accept: true, consentCode: null },
      clientReturning({ data: { redirectURI: callback } }, calls),
    )
    expect(calls[0]!.options.body).toEqual({ accept: true })
  })

  test("une session non reconnue (401 UNAUTHORIZED) se raconte comme telle", async () => {
    const outcome = await submitConsentDecision(
      { accept: true, consentCode: "consent-1" },
      clientReturning({
        data: null,
        error: { status: 401, statusText: "", message: "Unauthorized", code: "UNAUTHORIZED" },
      }),
    )
    expect(outcome).toEqual({ kind: "error", reason: "session_missing" })
  })

  for (const description of [
    "consent_code is required (either in body or cookie)",
    "Invalid code",
    "Code expired",
    "Consent not required",
  ]) {
    test(`« ${description} » est une demande à relancer depuis l'application`, () => {
      expect(
        classifyConsentError({
          status: 401,
          error: "invalid_request",
          error_description: description,
        }),
      ).toBe("request_expired")
    })
  }

  test("un fetch qui lève ou une réponse sans URL sont des erreurs du fournisseur", async () => {
    const thrown = await submitConsentDecision(
      { accept: true, consentCode: "consent-1" },
      {
        $fetch: async () => {
          throw new Error("network down")
        },
      },
    )
    expect(thrown).toEqual({ kind: "error", reason: "provider_error" })
    const empty = await submitConsentDecision(
      { accept: true, consentCode: "consent-1" },
      clientReturning({ data: {} }),
    )
    expect(empty).toEqual({ kind: "error", reason: "provider_error" })
    expect(classifyConsentError({ status: 500 })).toBe("provider_error")
    expect(classifyConsentError(null)).toBe("provider_error")
  })

  test("l'URL de retour vient du fournisseur et doit être http(s)", () => {
    expect(getConsentRedirect({ data: { redirectURI: callback } })).toBe(callback)
    expect(getConsentRedirect({ data: { redirect_uri: callback } })).toBe(callback)
    expect(getConsentRedirect({ data: { redirectURI: "javascript:alert(1)" } })).toBeNull()
    expect(getConsentRedirect({ data: { redirectURI: "idn://retour" } })).toBeNull()
    expect(getConsentRedirect({ error: { status: 401 }, data: { redirectURI: callback } })).toBeNull()
    expect(getConsentRedirect(null)).toBeNull()
  })
})

describe("consentement OIDC — les issues de secours restent bornées", () => {
  test("un refus sans fournisseur revient à l'application seulement si redirect_uri est en query", () => {
    expect(
      denyFallbackUrl({
        redirect_uri: "https://administration.ga/api/auth/oauth2/callback/idn",
        state: "s-1",
      }),
    ).toBe(
      "https://administration.ga/api/auth/oauth2/callback/idn?error=access_denied&state=s-1",
    )
    expect(denyFallbackUrl({ consent_code: "consent-1" })).toBeNull()
    expect(denyFallbackUrl({ redirect_uri: "javascript:alert(1)" })).toBeNull()
  })

  test("se reconnecter revient sur cette page de consentement, par un chemin interne", () => {
    const url = signInAgainUrl({
      client_id: "administration-ga",
      consent_code: "consent-1",
      scope: "openid profile email",
    })
    expect(url.startsWith("/sign-in?redirect_to=")).toBe(true)
    const redirectTo = new URL(url, "https://identite.ga").searchParams.get("redirect_to")!
    expect(redirectTo.startsWith("/oauth/authorize?")).toBe(true)
    expect(Object.fromEntries(new URL(redirectTo, "https://identite.ga").searchParams)).toEqual({
      client_id: "administration-ga",
      consent_code: "consent-1",
      scope: "openid profile email",
    })
  })

  test("le retour à l'application vise l'origine d'une URI de retour enregistrée", () => {
    expect(
      appReturnUrl([
        "idn://retour",
        "https://administration.ga/api/auth/oauth2/callback/idn",
      ]),
    ).toBe("https://administration.ga")
    expect(appReturnUrl([])).toBeNull()
    expect(appReturnUrl(["pas une url"])).toBeNull()
  })

  test("chaque refus a un message pour l'usager", () => {
    for (const reason of ["session_missing", "request_expired", "provider_error"] as const) {
      expect(consentFailureMessage(reason).length).toBeGreaterThan(20)
    }
  })
})
