/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"

import { internal } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  registerRateLimiter(t)
  return t
}

describe("privacy.exportRun.collectExportPayload", () => {
  test("l'archive contient le profil mais jamais l'empreinte du PIN", async () => {
    // L'archive part par un lien de stockage non authentifié (e-mail) : une
    // empreinte de PIN à 6 chiffres y serait cassée hors ligne en quelques
    // heures. Le citoyen doit retrouver ses données, pas ce secret.
    const t = makeTestClient()
    const now = Date.now()
    await t.run((ctx) =>
      ctx.db.insert("userProfile", {
        userId: "user_export",
        profileType: "citizen",
        loa: 1,
        phoneKey: null,
        pinHash: "pbkdf2$600000$secret",
        pivot: {
          firstName: "Clarisse",
          lastName: "Nzeng",
          dateOfBirth: "1991-03-04",
          gender: "F",
          birthPlace: "Oyem",
          nationality: "GA",
        },
        createdAt: now,
        updatedAt: now,
      }),
    )

    const payload = await t.query(internal.privacy.exportRun.collectExportPayload, { userId: "user_export" })

    expect(payload.profile?.pivot?.firstName).toBe("Clarisse")
    expect(payload.profile).not.toHaveProperty("pinHash")
    expect(JSON.stringify(payload)).not.toContain("pbkdf2$600000$secret")
  })

  test("sans profil, l'archive porte un profil nul", async () => {
    const t = makeTestClient()
    const payload = await t.query(internal.privacy.exportRun.collectExportPayload, { userId: "inconnu" })
    expect(payload.profile).toBeNull()
  })
})
