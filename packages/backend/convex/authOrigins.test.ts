import { afterEach, describe, expect, test, vi } from "vitest"

import { parseTrustedOrigins } from "./auth"

// Le contrôle d'origine de Better Auth est désactivé en environnement de test
// (`disableOriginCheck` par défaut) : on vérifie donc la liste qu'il recevra.
describe("origines de confiance", () => {
  afterEach(() => vi.unstubAllEnvs())

  test("le scheme de l'app mobile reste accepté quelle que soit la configuration", () => {
    // Sans `idn://`, toute requête mobile authentifiée — dont l'enrôlement
    // Face ID — était refusée en prod avec « Invalid origin ».
    vi.stubEnv("TRUSTED_ORIGINS", "https://identite.ga, https://admin.identite.ga")
    expect(parseTrustedOrigins()).toEqual(["https://identite.ga", "https://admin.identite.ga", "idn://"])
  })

  test("sans variable d'environnement, seule l'app mobile est acceptée", () => {
    vi.stubEnv("TRUSTED_ORIGINS", "")
    expect(parseTrustedOrigins()).toEqual(["idn://"])
  })
})
