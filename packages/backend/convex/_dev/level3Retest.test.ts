/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"

import { components, internal } from "../_generated/api"
import schema from "../schema"

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

async function seedLevel3Account(t: ReturnType<typeof makeTestClient>, email: string) {
  const now = Date.now()
  return await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: { model: "user", data: { email, name: email, emailVerified: true, createdAt: now, updatedAt: now } },
    })) as { _id: string }
    const profileId = await ctx.db.insert("userProfile", {
      userId: user._id,
      profileType: "citizen",
      loa: 3,
      createdAt: now,
      updatedAt: now,
    })
    const verificationId = await ctx.db.insert("level3Verification", {
      userId: user._id,
      status: "approved",
      roomName: "l3-test",
      requestedAt: now,
      decidedAt: now,
      updatedAt: now,
    })
    return { userId: user._id, profileId, verificationId }
  })
}

describe("_dev/level3Retest:reopen", () => {
  afterEach(() => vi.unstubAllEnvs())

  test("un compte au Niveau 3 redevient Niveau 2 et peut redemander un entretien", async () => {
    // Sans cela, la recette de la visio ne se joue qu'une fois par compte de test.
    const t = makeTestClient()
    const { profileId, verificationId } = await seedLevel3Account(t, "recette@idn.ga")
    const result = await t.mutation(internal._dev.level3Retest.reopen, { email: "RECETTE@idn.ga " })
    expect(result.reopened).toBe(1)
    const [profile, verification] = await t.run(async (ctx) => [await ctx.db.get(profileId), await ctx.db.get(verificationId)])
    expect(profile?.loa).toBe(2)
    expect(verification?.status).toBe("cancelled")
  })

  test("refuse un compte inconnu", async () => {
    const t = makeTestClient()
    await expect(t.mutation(internal._dev.level3Retest.reopen, { email: "absent@idn.ga" })).rejects.toThrow(/Compte introuvable/)
  })

  test("refuse la production", async () => {
    // Remettre un usager réel au Niveau 2 effacerait une décision d'un contrôleur.
    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-panda-248.convex.cloud")
    const t = makeTestClient()
    await seedLevel3Account(t, "prod@idn.ga")
    await expect(t.mutation(internal._dev.level3Retest.reopen, { email: "prod@idn.ga" })).rejects.toThrow(/interdit en production/)
  })
})
