/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"

import { api, components, internal } from "../_generated/api"
import { derivePinHash } from "../lib/pin"
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

/** Compte de recette typique : inscrit sans téléphone, donc sans envoi SMS. */
async function seedAccount(t: ReturnType<typeof makeTestClient>, email: string) {
  const now = Date.now()
  return await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: { email, name: email, emailVerified: true, createdAt: now, updatedAt: now },
      },
    })) as { _id: string }
    const profileId = await ctx.db.insert("userProfile", {
      userId: user._id,
      profileType: "citizen",
      loa: 1,
      pivot: {
        firstName: "Recette",
        lastName: "Test",
        dateOfBirth: "1990-01-02",
        gender: "F",
        birthPlace: "Libreville",
        nationality: "GA",
      },
      pinHash: await derivePinHash("248135", user._id),
      createdAt: now,
      updatedAt: now,
    })
    return { userId: user._id, profileId }
  })
}

describe("_dev/pinRecoveryTestCode — code SMS de recette", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // Pourquoi : sur le dev, Bird garde seul le code SMS. Sans cet outil, le
  // parcours « Code PIN oublié » ne peut pas être exercé jusqu'au bout.
  test("permet de dérouler la récupération complète sans appeler Bird", async () => {
    const t = makeTestClient()
    const email = "recette.pin@idn.ga"
    const seeded = await seedAccount(t, email)
    const bird = vi.spyOn(globalThis, "fetch")

    const { requestId } = await t.action(api.pinRecovery.requestReset, { identifier: email })
    const { code } = await t.mutation(internal._dev.pinRecoveryTestCode.arm, { requestId, email })
    expect(code).toMatch(/^\d{6}$/)

    const wrong = code === "000000" ? "111111" : "000000"
    expect(await t.action(api.pinRecovery.verifyCode, { requestId, code: wrong })).toEqual({
      verified: false,
      resetToken: null,
    })

    const ok = await t.action(api.pinRecovery.verifyCode, { requestId, code })
    expect(ok.verified).toBe(true)
    await t.mutation(api.pinRecovery.resetPin, { requestId, resetToken: ok.resetToken!, newPin: "975310" })

    const profile = await t.run(async (ctx) => ctx.db.get(seeded.profileId))
    expect(profile?.pinHash).toBe(await derivePinHash("975310", seeded.userId))
    expect(bird).not.toHaveBeenCalled()
  })

  test("refuse de s'exécuter sur le déploiement de production", async () => {
    const t = makeTestClient()
    const email = "recette.prod@idn.ga"
    await seedAccount(t, email)
    const { requestId } = await t.action(api.pinRecovery.requestReset, { identifier: email })

    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-panda-248.convex.cloud")
    await expect(
      t.mutation(internal._dev.pinRecoveryTestCode.arm, { requestId, email }),
    ).rejects.toThrow(/production/)
  })

  // Défense en profondeur : même si une empreinte de recette existait en
  // production, `verifyCode` doit continuer d'exiger le vrai code Bird.
  test("verifyCode ignore un code armé quand il tourne en production", async () => {
    const t = makeTestClient()
    const email = "recette.ignore@idn.ga"
    await seedAccount(t, email)
    const { requestId } = await t.action(api.pinRecovery.requestReset, { identifier: email })
    const { code } = await t.mutation(internal._dev.pinRecoveryTestCode.arm, { requestId, email })

    vi.stubEnv("CONVEX_CLOUD_URL", "https://flexible-panda-248.convex.cloud")
    vi.stubEnv("BIRD_API_KEY", "bk_eu1_test")
    const bird = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 }))

    expect(await t.action(api.pinRecovery.verifyCode, { requestId, code })).toEqual({
      verified: false,
      resetToken: null,
    })
    expect(bird).toHaveBeenCalledTimes(1)
  })

  test("ne rattache pas à un autre compte une demande déjà attribuée", async () => {
    const t = makeTestClient()
    await seedAccount(t, "titulaire@idn.ga")
    await seedAccount(t, "intrus@idn.ga")
    const { requestId } = await t.action(api.pinRecovery.requestReset, { identifier: "titulaire@idn.ga" })
    await t.mutation(internal._dev.pinRecoveryTestCode.arm, { requestId, email: "titulaire@idn.ga" })

    await expect(
      t.mutation(internal._dev.pinRecoveryTestCode.arm, { requestId, email: "intrus@idn.ga" }),
    ).rejects.toThrow(/autre compte/)
  })
})
