import { afterEach, describe, expect, it, vi } from "vitest"

import { isAllowedReturnTo } from "./kyc-flow"

// Après une vérification d'identité, l'usager est renvoyé vers `return_to` :
// seule une démarche officielle (https) peut le récupérer en production.
describe("isAllowedReturnTo", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("accepte les démarches officielles en https", () => {
    expect(isAllowedReturnTo("https://demarche.ga/dossier/1")).toBe(true)
    expect(isAllowedReturnTo("https://www.identite.ga/kyc")).toBe(true)
  })

  it("refuse http, les domaines voisins et les autres schémas", () => {
    expect(isAllowedReturnTo("http://demarche.ga/dossier")).toBe(false)
    expect(isAllowedReturnTo("https://demarche.ga.evil.com")).toBe(false)
    expect(isAllowedReturnTo("https://evildemarche.ga")).toBe(false)
    expect(isAllowedReturnTo("javascript:alert(1)")).toBe(false)
  })

  it("n'accepte localhost qu'en développement", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(isAllowedReturnTo("http://localhost:3000/retour")).toBe(false)
    vi.stubEnv("NODE_ENV", "development")
    expect(isAllowedReturnTo("http://localhost:3000/retour")).toBe(true)
  })
})
