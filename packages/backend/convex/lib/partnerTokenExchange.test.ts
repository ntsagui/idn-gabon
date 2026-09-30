import { oidcProvider } from "better-auth/plugins"
import { describe, expect, it } from "vitest"

import {
  isCoveredByConsent,
  PARTNER_TOKEN_EXCHANGE_PATH,
  parseExchangeClientIds,
  partnerTokenExchange,
  requestedScopesOf,
} from "./partnerTokenExchange"

describe("parseExchangeClientIds", () => {
  it("n'autorise aucun client quand la variable est absente", () => {
    expect(parseExchangeClientIds(undefined)).toEqual([])
    expect(parseExchangeClientIds("")).toEqual([])
  })

  it("découpe la liste en tolérant les espaces", () => {
    expect(parseExchangeClientIds(" abc , def,,")).toEqual(["abc", "def"])
  })
})

describe("requestedScopesOf", () => {
  it("retombe sur les scopes du flux OIDC du partenaire", () => {
    expect(requestedScopesOf(undefined)).toEqual(["openid", "profile", "email"])
    expect(requestedScopesOf("  ")).toEqual(["openid", "profile", "email"])
  })

  it("dédoublonne les scopes demandés", () => {
    expect(requestedScopesOf("openid email openid")).toEqual(["openid", "email"])
  })
})

describe("isCoveredByConsent", () => {
  it("exige que chaque scope demandé ait été consenti", () => {
    expect(
      isCoveredByConsent(["openid", "email"], ["openid", "profile", "email"]),
    ).toBe(true)
    expect(
      isCoveredByConsent(["openid", "idn:civil_status"], ["openid", "email"]),
    ).toBe(false)
  })
})

describe("partnerTokenExchange", () => {
  it("n'écrase aucun endpoint d'oidcProvider", () => {
    const exchange = partnerTokenExchange({
      getAdditionalUserInfoClaim: async () => ({}),
    })
    const oidc = oidcProvider({ loginPage: "/sign-in" })
    for (const key of Object.keys(exchange.endpoints)) {
      expect(Object.keys(oidc.endpoints)).not.toContain(key)
    }
    expect(exchange.endpoints.partnerTokenExchange.path).toBe(
      PARTNER_TOKEN_EXCHANGE_PATH,
    )
  })
})
