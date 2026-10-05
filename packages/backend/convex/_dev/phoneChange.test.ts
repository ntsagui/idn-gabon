/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"

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

async function seedProfile(t: ReturnType<typeof makeTestClient>, userId: string) {
  const now = Date.now()
  return await t.run((ctx) =>
    ctx.db.insert("userProfile", {
      userId,
      profileType: "citizen",
      loa: 1,
      phoneKey: null,
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
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("_dev/phoneChange.simulateVerifiedChange", () => {
  test("refuse la production : aucun numéro ne peut y être changé sans SMS", async () => {
    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-panda-248.convex.cloud")
    const t = makeTestClient()
    const profileId = await seedProfile(t, "prod_user")
    await expect(
      t.mutation(internal._dev.phoneChange.simulateVerifiedChange, { userId: "prod_user", phone: "+24106221489" }),
    ).rejects.toThrow(/production/)
    expect((await t.run((ctx) => ctx.db.get(profileId)))?.pivot?.phone).toBeUndefined()
  })

  test("sur le dev, rejoue la confirmation serveur sans appeler Bird", async () => {
    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-eel-807.convex.cloud")
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    const t = makeTestClient()
    const profileId = await seedProfile(t, "dev_user")
    const result = await t.mutation(internal._dev.phoneChange.simulateVerifiedChange, {
      userId: "dev_user",
      phone: "06 22 14 89",
    })
    expect(result.phone).toBe("+24106221489")
    expect(fetchSpy).not.toHaveBeenCalled()
    const profile = await t.run((ctx) => ctx.db.get(profileId))
    // Même effet qu'un code SMS validé : numéro normalisé, clé d'unicité, date de vérification.
    expect(profile?.pivot?.phone).toBe("+24106221489")
    expect(profile?.phoneKey).toBe("+24106221489")
    expect(profile?.phoneVerifiedAt).toBeTypeOf("number")
    expect(await t.run((ctx) => ctx.db.query("phoneChangeChallenge").collect())).toHaveLength(0)
  })

  test("garde les contrôles du parcours réel : un numéro déjà pris est refusé", async () => {
    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-eel-807.convex.cloud")
    const t = makeTestClient()
    await seedProfile(t, "dev_user")
    await t.run((ctx) =>
      ctx.db.insert("userProfile", {
        userId: "other",
        profileType: "citizen",
        loa: 1,
        phoneKey: "+24106221489",
        pivot: {
          firstName: "Autre",
          lastName: "Personne",
          dateOfBirth: "1980-01-01",
          gender: "M",
          birthPlace: "Libreville",
          nationality: "GA",
          phone: "+24106221489",
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    )
    await expect(
      t.mutation(internal._dev.phoneChange.simulateVerifiedChange, { userId: "dev_user", phone: "+24106221489" }),
    ).rejects.toThrow()
  })
})
