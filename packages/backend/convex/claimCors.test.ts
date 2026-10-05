/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import schema from "./schema"

const modules = import.meta.glob("/convex/**/*.ts")

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  registerBetterAuth(t)
  registerRateLimiter(t)
  return t
}

// Le parcours « Récupérer mon compte » du site web (identite.ga) appelle
// /api/claim/* depuis son origine : sans CORS le navigateur bloque la réponse
// et le citoyen ne peut pas récupérer une identité créée par un organisme.
describe("CORS des routes /api/claim/*", () => {
  beforeEach(() => vi.stubEnv("TRUSTED_ORIGINS", "https://identite.ga"))
  afterEach(() => vi.unstubAllEnvs())

  test("le préflight autorise l'origine de confiance", async () => {
    const t = makeTestClient()
    for (const path of ["/api/claim/lookup", "/api/claim/complete"]) {
      const res = await t.fetch(path, {
        method: "OPTIONS",
        headers: { Origin: "https://identite.ga", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
      })
      expect(res.status).toBe(204)
      expect(res.headers.get("access-control-allow-origin")).toBe("https://identite.ga")
      expect(res.headers.get("access-control-allow-methods")).toContain("POST")
    }
  })

  test("la réponse de recherche porte l'origine de confiance", async () => {
    const t = makeTestClient()
    const res = await t.fetch("/api/claim/lookup", {
      method: "POST",
      headers: { Origin: "https://identite.ga", "Content-Type": "application/json" },
      body: JSON.stringify({ nip: "AB12CD34EF56GH", claimCode: "000000" }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ found: false })
    expect(res.headers.get("access-control-allow-origin")).toBe("https://identite.ga")
  })

  test("une origine inconnue n'obtient aucun en-tête CORS", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const t = makeTestClient()
    const pre = await t.fetch("/api/claim/lookup", {
      method: "OPTIONS",
      headers: { Origin: "https://pirate.example", "Access-Control-Request-Method": "POST" },
    })
    expect(pre.status).toBe(403)
    const res = await t.fetch("/api/claim/lookup", {
      method: "POST",
      headers: { Origin: "https://pirate.example", "Content-Type": "application/json" },
      body: JSON.stringify({ nip: "AB12CD34EF56GH", claimCode: "000000" }),
    })
    expect(res.headers.get("access-control-allow-origin")).toBeNull()
  })
})
