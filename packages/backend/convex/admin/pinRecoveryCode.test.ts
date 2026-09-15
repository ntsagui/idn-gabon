/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components } from "../_generated/api"
import { derivePinHash } from "../lib/pin"
import { hashAdminPinCode } from "../lib/pinRecoveryCode"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")
const ADMIN = "admin_pin_recovery"

vi.mock("../lib/auth", async () => {
  const { ConvexError } = await import("convex/values")
  return {
    requireAdmin: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity?.subject.startsWith("admin_")) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Accès refusé." })
      }
      return {
        userId: identity.subject,
        email: `${identity.subject}@idn.ga`,
        emailVerified: true,
        roles: ["admin"],
      }
    },
  }
})

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  registerBetterAuth(t)
  registerRateLimiter(t)
  return t
}

/** Citoyen avec un PIN en place, une session ouverte et un IDN à recopier. */
async function seedCitizen(
  t: ReturnType<typeof makeTestClient>,
  options: { email: string; idnId: string; pin: string },
) {
  const now = Date.now()
  return await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email: options.email,
          name: options.email,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        },
      },
    })) as { _id: string }
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "session",
        data: {
          userId: user._id,
          token: `session-${options.idnId}`,
          expiresAt: now + 86_400_000,
          createdAt: now,
          updatedAt: now,
        },
      },
    })
    const profileId = await ctx.db.insert("userProfile", {
      userId: user._id,
      profileType: "citizen",
      loa: 2,
      idnId: options.idnId,
      pivot: {
        firstName: "Citoyen",
        lastName: "Pin",
        dateOfBirth: "1990-01-02",
        gender: "M",
        birthPlace: "Libreville",
        nationality: "GA",
      },
      pinHash: await derivePinHash(options.pin, user._id),
      createdAt: now,
      updatedAt: now,
    })
    return { userId: user._id, profileId }
  })
}

async function readChallenges(
  t: ReturnType<typeof makeTestClient>,
  userId: string,
) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("pinRecoveryChallenge")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
  )
}

async function readAudit(
  t: ReturnType<typeof makeTestClient>,
  userId: string,
) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("auditLog")
      .withIndex("by_target", (q) =>
        q.eq("targetType", "user").eq("targetId", userId),
      )
      .collect(),
  )
}

describe("code provisoire de récupération du PIN", () => {
  test("le code de la console ouvre le parcours PIN et ferme les anciennes sessions", async () => {
    // POURQUOI : quand l'envoi automatique par SMS est bloqué (numéro absent
    // ou partagé, registre trop grand…), ce code est la seule voie. Il doit
    // aboutir exactement au même résultat que le SMS — nouveau PIN, sessions
    // fermées, rien de réutilisable — sans que le code en clair ne subsiste
    // nulle part en base ni dans l'audit.
    const t = makeTestClient()
    const { userId, profileId } = await seedCitizen(t, {
      email: "citoyen.pin@idn.ga",
      idnId: "GA-TEST-7734",
      pin: "123456",
    })
    const admin = t.withIdentity({ subject: ADMIN })

    const before = Date.now()
    const issued = await admin.mutation(
      api.admin.accounts.generatePinResetCode,
      { userId, confirmIdentifier: "ga-test-7734" },
    )
    expect(issued.code).toMatch(/^\d{6}$/)
    expect(issued.expiresAt - before).toBeGreaterThanOrEqual(14 * 60_000)
    expect(issued.expiresAt - before).toBeLessThanOrEqual(16 * 60_000)

    const stored = await readChallenges(t, userId)
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({
      status: "issued",
      channel: "admin_code",
      issuedBy: ADMIN,
      attempts: 0,
    })
    expect(stored[0]!.codeHash).toBe(await hashAdminPinCode(userId, issued.code))
    expect(stored[0]!.codeHash).not.toContain(issued.code)

    const issuedAudit = (await readAudit(t, userId)).find(
      (row) => row.action === "admin_action",
    )
    expect(issuedAudit?.metadata).toMatchObject({
      kind: "pin_reset_code_issued",
      channel: "admin_manual",
    })
    expect(JSON.stringify(issuedAudit?.metadata)).not.toContain(issued.code)

    // Le citoyen saisit son identifiant sans le domaine, comme sur la page.
    const verified = await t.mutation(api.pinRecovery.verifyAdminCode, {
      identifier: "citoyen.pin",
      code: issued.code,
    })
    expect(verified.verified).toBe(true)
    expect(verified.requestId).toEqual(expect.any(String))
    expect(verified.resetToken).toEqual(expect.any(String))

    await t.mutation(api.pinRecovery.resetPin, {
      requestId: verified.requestId!,
      resetToken: verified.resetToken!,
      newPin: "654321",
    })

    const state = await t.run(async (ctx) => ({
      profile: await ctx.db.get(profileId),
      sessions: await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "session",
        where: [{ field: "userId", value: userId, operator: "eq" }],
        paginationOpts: { numItems: 10, cursor: null },
      }),
    }))
    expect(state.profile?.pinHash).toBe(await derivePinHash("654321", userId))
    expect(state.sessions.page).toHaveLength(0)
    expect(await readChallenges(t, userId)).toHaveLength(0)
    const changed = (await readAudit(t, userId)).find(
      (row) => row.action === "pin_changed",
    )
    expect(changed?.metadata).toMatchObject({ method: "admin_code_recovery" })
  })

  test("trois essais faux épuisent le code : le bon code ne passe plus ensuite", async () => {
    // POURQUOI : six chiffres se devinent en un million d'essais ; la seule
    // protection réelle est le compteur. Un code épuisé doit rester refusé
    // même au bon numéro, sinon le compteur ne protège rien.
    const t = makeTestClient()
    const { userId } = await seedCitizen(t, {
      email: "essais.pin@idn.ga",
      idnId: "GA-TEST-7735",
      pin: "123456",
    })
    const issued = await t
      .withIdentity({ subject: ADMIN })
      .mutation(api.admin.accounts.generatePinResetCode, {
        userId,
        confirmIdentifier: "GA-TEST-7735",
      })
    const wrong = issued.code === "000000" ? "000001" : "000000"

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await t.mutation(api.pinRecovery.verifyAdminCode, {
        identifier: "essais.pin@idn.ga",
        code: wrong,
      })
      expect(result).toEqual({
        verified: false,
        requestId: null,
        resetToken: null,
      })
    }

    const late = await t.mutation(api.pinRecovery.verifyAdminCode, {
      identifier: "essais.pin@idn.ga",
      code: issued.code,
    })
    expect(late.verified).toBe(false)
    const [challenge] = await readChallenges(t, userId)
    expect(challenge).toMatchObject({ status: "issued", attempts: 3 })
  })

  test("une nouvelle émission remplace la précédente", async () => {
    // POURQUOI : l'agent qui régénère un code (le premier s'est perdu ou a
    // été vu par la mauvaise personne) doit être certain que l'ancien ne
    // vaut plus rien.
    const t = makeTestClient()
    const { userId } = await seedCitizen(t, {
      email: "remplace.pin@idn.ga",
      idnId: "GA-TEST-7736",
      pin: "123456",
    })
    const admin = t.withIdentity({ subject: ADMIN })
    const first = await admin.mutation(api.admin.accounts.generatePinResetCode, {
      userId,
      confirmIdentifier: "GA-TEST-7736",
    })
    const second = await admin.mutation(
      api.admin.accounts.generatePinResetCode,
      { userId, confirmIdentifier: "GA-TEST-7736" },
    )
    expect(await readChallenges(t, userId)).toHaveLength(1)

    if (first.code !== second.code) {
      const stale = await t.mutation(api.pinRecovery.verifyAdminCode, {
        identifier: "remplace.pin@idn.ga",
        code: first.code,
      })
      expect(stale.verified).toBe(false)
    }
    const fresh = await t.mutation(api.pinRecovery.verifyAdminCode, {
      identifier: "remplace.pin@idn.ga",
      code: second.code,
    })
    expect(fresh.verified).toBe(true)
  })

  test("identifiant inconnu ou compte sans code : même réponse, sans erreur", async () => {
    // POURQUOI : la réponse ne doit révéler ni l'existence d'un compte, ni
    // qu'un agent a émis un code pour lui.
    const t = makeTestClient()
    await seedCitizen(t, {
      email: "sans-code.pin@idn.ga",
      idnId: "GA-TEST-7737",
      pin: "123456",
    })
    const refused = { verified: false, requestId: null, resetToken: null }
    await expect(
      t.mutation(api.pinRecovery.verifyAdminCode, {
        identifier: "inconnu.personne",
        code: "123456",
      }),
    ).resolves.toEqual(refused)
    await expect(
      t.mutation(api.pinRecovery.verifyAdminCode, {
        identifier: "sans-code.pin",
        code: "123456",
      }),
    ).resolves.toEqual(refused)
  })

  test("la recopie de l'identifiant protège contre l'erreur de compte", async () => {
    // POURQUOI : l'agent remet un secret à une personne ; se tromper de
    // fiche ouvrirait le compte d'un tiers. La confirmation est la même que
    // pour le code mot de passe.
    const t = makeTestClient()
    const { userId } = await seedCitizen(t, {
      email: "confirm.pin@idn.ga",
      idnId: "GA-TEST-7738",
      pin: "123456",
    })
    await expect(
      t
        .withIdentity({ subject: ADMIN })
        .mutation(api.admin.accounts.generatePinResetCode, {
          userId,
          confirmIdentifier: "GA-TEST-0000",
        }),
    ).rejects.toThrow(/ne correspond pas/)
    expect(await readChallenges(t, userId)).toHaveLength(0)
  })
})
