/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { ConvexError } from "convex/values"
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"

import { api, components, internal } from "./_generated/api"
import { derivePinHash, hashOpaqueSecret } from "./lib/pin"
import { normalizeRecoveryPhone } from "./lib/phone"
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

type SeedProfileOptions = {
  email: string
  firstName: string
  pivotKey: string
  phone: string
  emailVerified?: boolean
  nipKey?: string
}

async function seedProfile(
  t: ReturnType<typeof makeTestClient>,
  options: SeedProfileOptions,
) {
  const now = Date.now()
  return await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: options.email,
          name: `${options.firstName} Test`,
          emailVerified: options.emailVerified ?? true,
          createdAt: now,
          updatedAt: now,
        },
      },
    })) as { _id: string }
    const profileId = await ctx.db.insert("userProfile", {
      userId: user._id,
      profileType: "citizen",
      loa: 1,
      pivot: {
        firstName: options.firstName,
        lastName: "Test",
        dateOfBirth: "1990-01-02",
        gender: "F",
        birthPlace: "Libreville",
        nationality: "GA",
        phone: options.phone,
      },
      pivotKey: options.pivotKey,
      phoneKey: normalizeRecoveryPhone(options.phone, "GA"),
      ...(options.nipKey ? { nipKey: options.nipKey } : {}),
      createdAt: now,
      updatedAt: now,
    })
    return { userId: user._id, profileId }
  })
}

async function readChallenge(
  t: ReturnType<typeof makeTestClient>,
  requestId: string,
) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_requestId", (q) => q.eq("requestId", requestId))
      .unique(),
  )
}

describe("éligibilité à la récupération automatique du PIN", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  test("envoie le SMS même lorsque le registre dépasse 500 profils", async () => {
    const t = makeTestClient()
    const target = await seedProfile(t, {
      email: "grand-registre@idn.ga",
      firstName: "GrandRegistre",
      pivotKey: "test|grand-registre|1990-01-02",
      phone: "06 22 14 89",
    })
    await t.run(async (ctx) => {
      for (let i = 0; i < 501; i++) {
        await ctx.db.insert("userProfile", {
          userId: `other-${i}`,
          profileType: "citizen",
          loa: 1,
          phoneKey: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    })
    vi.stubEnv("BIRD_API_KEY", "bk_eu1_test")
    const bird = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            expires_at: new Date(Date.now() + 600_000).toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
    const request = await t.action(api.pinRecovery.requestReset, {
      identifier: "grand-registre",
    })
    const challenge = await readChallenge(t, request.requestId)
    expect(challenge).toMatchObject({
      userId: target.userId,
      phone: "+24106221489",
      status: "sent",
    })
    expect(bird).toHaveBeenCalledTimes(1)
  })

  test("refuse un doublon de téléphone inséré après les 500 premiers profils", async () => {
    const t = makeTestClient()
    await seedProfile(t, {
      email: "premier@idn.ga",
      firstName: "Premier",
      pivotKey: "test|premier|1990-01-02",
      phone: "06 22 14 89",
    })
    await t.run(async (ctx) => {
      for (let i = 0; i < 501; i++) {
        await ctx.db.insert("userProfile", {
          userId: `other-${i}`,
          profileType: "citizen",
          loa: 1,
          phoneKey: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }
    })
    await seedProfile(t, {
      email: "doublon@idn.ga",
      firstName: "Doublon",
      pivotKey: "test|doublon|1990-01-02",
      phone: "+241 06 22 14 89",
    })
    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "premier@idn.ga",
      requestId: "request-duplicate-after-500",
      expiresAt: Date.now() + 60_000,
    })
    expect(result.phone).toBeNull()
  })

  test("bloque l'envoi tant qu'un téléphone historique n'est pas indexé", async () => {
    const t = makeTestClient()
    await seedProfile(t, {
      email: "historique@idn.ga",
      firstName: "Historique",
      pivotKey: "test|historique|1990-01-02",
      phone: "06 22 14 89",
    })
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfile", {
        userId: "unindexed",
        profileType: "citizen",
        loa: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "historique@idn.ga",
      requestId: "request-unindexed-registry",
      expiresAt: Date.now() + 60_000,
    })
    expect(result.phone).toBeNull()
  })

  test("autorise une identité et un téléphone uniques", async () => {
    const t = makeTestClient()
    const seeded = await seedProfile(t, {
      email: "unique@idn.ga",
      firstName: "Unique",
      pivotKey: "test|unique|1990-01-02",
      phone: "06 22 14 89",
    })

    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "unique@idn.ga",
      requestId: "request-unique-1234",
      expiresAt: Date.now() + 60_000,
    })

    expect(result.phone).toBe("+24106221489")
    const challenge = await readChallenge(t, "request-unique-1234")
    expect(challenge?.userId).toBe(seeded.userId)
    expect(challenge?.phone).toBe("+24106221489")
  })

  test("refuse deux profils actifs partageant la même identité", async () => {
    const t = makeTestClient()
    await seedProfile(t, {
      email: "identite-a@idn.ga",
      firstName: "IdentiteA",
      pivotKey: "test|partage|1990-01-02",
      phone: "06 22 14 89",
    })
    await seedProfile(t, {
      email: "identite-b@idn.ga",
      firstName: "IdentiteB",
      pivotKey: "test|partage|1990-01-02",
      phone: "07 11 22 33",
    })

    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "identite-a@idn.ga",
      requestId: "request-shared-identity-1234",
      expiresAt: Date.now() + 60_000,
    })

    expect(result.phone).toBeNull()
    const challenge = await readChallenge(t, "request-shared-identity-1234")
    expect(challenge?.userId).toBeUndefined()
    expect(challenge?.phone).toBeUndefined()
  })

  test("refuse un numéro normalisé partagé entre deux identités", async () => {
    const t = makeTestClient()
    await seedProfile(t, {
      email: "telephone-a@idn.ga",
      firstName: "TelephoneA",
      pivotKey: "test|telephone-a|1990-01-02",
      phone: "+241 06 22 14 89",
    })
    await seedProfile(t, {
      email: "telephone-b@idn.ga",
      firstName: "TelephoneB",
      pivotKey: "test|telephone-b|1990-01-02",
      phone: "06221489",
    })

    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "telephone-a@idn.ga",
      requestId: "request-shared-phone-1234",
      expiresAt: Date.now() + 60_000,
    })

    expect(result.phone).toBeNull()
  })

  test("refuse un compte dont l'email n'est pas vérifié", async () => {
    const t = makeTestClient()
    await seedProfile(t, {
      email: "non-verifie@idn.ga",
      firstName: "NonVerifie",
      pivotKey: "test|non-verifie|1990-01-02",
      phone: "06 22 14 89",
      emailVerified: false,
    })

    const result = await t.mutation(internal.pinRecovery.prepareReset, {
      email: "non-verifie@idn.ga",
      requestId: "request-unverified-1234",
      expiresAt: Date.now() + 60_000,
    })

    expect(result.phone).toBeNull()
  })
})

describe("statut du PIN à la connexion", () => {
  test("signale explicitement un profil historique sans PIN", async () => {
    const t = makeTestClient()
    const seeded = await seedProfile(t, {
      email: "sans-pin@idn.ga",
      firstName: "SansPin",
      pivotKey: "test|sans-pin|1990-01-02",
      phone: "06 22 14 89",
    })

    await expect(
      t.query(internal.onboarding.verifyPinForUserId, {
        userId: seeded.userId,
        pin: "123456",
      }),
    ).resolves.toBe("setup_required")
  })
})

describe("réinitialisation du PIN après vérification SMS", () => {
  test("consomme le jeton, remplace le hash et interdit le rejeu", async () => {
    const t = makeTestClient()
    const now = Date.now()
    const resetToken = "reset-token-secret"
    const resetTokenHash = await hashOpaqueSecret(resetToken)

    const seeded = await t.run(async (ctx) => {
      const user = (await ctx.runMutation(
        components.betterAuth.adapter.create,
        {
          input: {
            model: "user",
            data: {
              email: "ariane.nziengui@idn.ga",
              name: "Ariane Nziengui",
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      )) as { _id: string }
      const pinHash = await derivePinHash("123456", user._id)
      const profileId = await ctx.db.insert("userProfile", {
        userId: user._id,
        profileType: "citizen",
        loa: 1,
        pivot: {
          firstName: "Ariane",
          lastName: "Nziengui",
          dateOfBirth: "1990-01-02",
          gender: "F",
          birthPlace: "Libreville",
          nationality: "GA",
          phone: "+241 06 22 14 89",
        },
        pinHash,
        createdAt: now,
        updatedAt: now,
      })
      await ctx.db.insert("pinRecoveryChallenge", {
        requestId: "request-reset-test-1234",
        userId: user._id,
        phone: "+24106221489",
        status: "verified",
        attempts: 1,
        resetTokenHash,
        resetTokenExpiresAt: now + 60_000,
        expiresAt: now + 60_000,
        createdAt: now,
        updatedAt: now,
      })
      return { userId: user._id, profileId }
    })

    await t.mutation(api.pinRecovery.resetPin, {
      requestId: "request-reset-test-1234",
      resetToken,
      newPin: "654321",
    })

    const state = await t.run(async (ctx) => ({
      profile: await ctx.db.get(seeded.profileId),
      challenges: await ctx.db.query("pinRecoveryChallenge").collect(),
    }))
    expect(state.profile?.pinHash).toBe(
      await derivePinHash("654321", seeded.userId),
    )
    expect(state.challenges).toHaveLength(0)

    await expect(
      t.mutation(api.pinRecovery.resetPin, {
        requestId: "request-reset-test-1234",
        resetToken,
        newPin: "246813",
      }),
    ).rejects.toThrow(ConvexError)
  })
})
