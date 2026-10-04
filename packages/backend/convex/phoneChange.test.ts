/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { ConvexError } from "convex/values"
import { convexTest } from "convex-test"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { api } from "./_generated/api"
import schema from "./schema"
import { normalizeRecoveryPhone } from "./lib/phone"

const modules = import.meta.glob("/convex/**/*.ts")

vi.mock("./lib/auth", async () => {
  const { ConvexError: CE } = await import("convex/values")
  const authenticated = async (ctx: {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
  }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new CE({
        code: "UNAUTHENTICATED",
        message: "Vous devez être connecté.",
      })
    }
    return {
      userId: identity.subject,
      email: `${identity.subject}@idn.ga`,
      emailVerified: true,
      roles: [],
    }
  }
  return {
    requireVerifiedAuth: authenticated,
    requireVerifiedAuthInAction: authenticated,
  }
})

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  registerRateLimiter(t)
  return t
}

async function seedProfile(
  t: ReturnType<typeof makeTestClient>,
  userId: string,
  phone?: string,
) {
  const now = Date.now()
  return await t.run(async (ctx) =>
    ctx.db.insert("userProfile", {
      userId,
      profileType: "citizen",
      loa: 1,
      phoneKey: normalizeRecoveryPhone(phone, "GA"),
      pivot: {
        firstName: "Ariane",
        lastName: "Nziengui",
        dateOfBirth: "1990-01-02",
        gender: "F",
        birthPlace: "Libreville",
        nationality: "GA",
        ...(phone ? { phone } : {}),
      },
      createdAt: now,
      updatedAt: now,
    }),
  )
}

function mockBird(success = true) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input)
    if (url.endsWith("/v1/verify/verifications")) {
      return new Response(
        JSON.stringify({
          expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )
    }
    if (url.endsWith("/v1/verify/verifications/check")) {
      return new Response(JSON.stringify({ success }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }
    throw new Error(`URL Bird inattendue: ${url}`)
  })
}

beforeEach(() => {
  process.env.BIRD_API_KEY = "bk_eu1_test"
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.BIRD_API_KEY
})

describe("changement du numéro de téléphone", () => {
  test("valide un changement de numéro au-delà de 500 profils", async () => {
    const t = makeTestClient()
    const profileId = await seedProfile(t, "large_registry")
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
    mockBird(true)
    const citizen = t.withIdentity({ subject: "large_registry" })
    const request = await citizen.action(api.phoneChange.requestChange, {
      phone: "+24106221489",
    })
    expect(
      await citizen.action(api.phoneChange.verifyChange, {
        requestId: request.requestId,
        code: "123456",
      }),
    ).toEqual({ verified: true, phone: "+24106221489" })
    expect(await t.run((ctx) => ctx.db.get(profileId))).toMatchObject({
      phoneKey: "+24106221489",
    })
  })

  test("n'enregistre le nouveau numéro qu'après validation du code", async () => {
    const t = makeTestClient()
    const profileId = await seedProfile(t, "citizen_phone")
    const bird = mockBird(true)
    const citizen = t.withIdentity({ subject: "citizen_phone" })

    const request = await citizen.action(api.phoneChange.requestChange, {
      phone: "+33 6 12 34 56 78",
    })

    const beforeVerification = await t.run((ctx) => ctx.db.get(profileId))
    expect(beforeVerification?.pivot?.phone).toBeUndefined()
    expect(beforeVerification?.phoneVerifiedAt).toBeUndefined()

    const result = await citizen.action(api.phoneChange.verifyChange, {
      requestId: request.requestId,
      code: "123456",
    })
    expect(result).toEqual({ verified: true, phone: "+33612345678" })

    const afterVerification = await t.run((ctx) => ctx.db.get(profileId))
    expect(afterVerification?.pivot?.phone).toBe("+33612345678")
    expect(afterVerification?.phoneKey).toBe("+33612345678")
    expect(afterVerification?.phoneVerifiedAt).toEqual(expect.any(Number))
    expect(bird).toHaveBeenCalledTimes(2)
  })

  test("conserve le profil lorsque le code est faux", async () => {
    const t = makeTestClient()
    const profileId = await seedProfile(t, "citizen_wrong_code", "+24106221489")
    mockBird(false)
    const citizen = t.withIdentity({ subject: "citizen_wrong_code" })

    const request = await citizen.action(api.phoneChange.requestChange, {
      phone: "+241 07 11 22 33",
    })
    const result = await citizen.action(api.phoneChange.verifyChange, {
      requestId: request.requestId,
      code: "654321",
    })

    expect(result).toEqual({ verified: false, phone: null })
    const profile = await t.run((ctx) => ctx.db.get(profileId))
    expect(profile?.pivot?.phone).toBe("+24106221489")
    expect(profile?.phoneVerifiedAt).toBeUndefined()
  })

  test("refuse un numéro déjà associé à un autre compte", async () => {
    const t = makeTestClient()
    await seedProfile(t, "citizen_owner", "+241 06 22 14 89")
    await seedProfile(t, "citizen_duplicate")
    const citizen = t.withIdentity({ subject: "citizen_duplicate" })

    await expect(
      citizen.action(api.phoneChange.requestChange, {
        phone: "+24106221489",
      }),
    ).rejects.toBeInstanceOf(ConvexError)
  })
})
