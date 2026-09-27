/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components } from "./_generated/api"
import { derivePivotKeys } from "./lib/identity"
import schema from "./schema"

const modules = import.meta.glob("/convex/**/*.ts")

// Le sujet de l'identité de test EST l'identifiant Better Auth du compte : la
// mutation doit supprimer précisément le compte de l'appelant, et `completeSignup`
// compare la session à l'adresse `@idn.ga` réellement stockée.
vi.mock("./lib/auth", async () => {
  const { ConvexError: CE } = await import("convex/values")
  const { components: c } = await import("./_generated/api")
  type Ctx = {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    runQuery: (ref: unknown, args: unknown) => Promise<unknown>
  }
  const authUser = async (ctx: Ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new CE({ code: "UNAUTHENTICATED", message: "Connexion requise." })
    }
    const user = (await ctx.runQuery(c.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: identity.subject, operator: "eq" }],
    })) as { email: string; emailVerified: boolean } | null
    return {
      userId: identity.subject,
      email: user?.email ?? `${identity.subject}@idn.ga`,
      emailVerified: user?.emailVerified ?? false,
      roles: [],
    }
  }
  return {
    requireAuth: authUser,
    requireVerifiedAuth: authUser,
    getCurrentAuthUser: async (ctx: Ctx) => {
      try {
        return await authUser(ctx)
      } catch {
        return null
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
  return t
}

type TestClient = ReturnType<typeof makeTestClient>

const HOUR = 60 * 60 * 1000

/** Reproduit ce que laisse `signUp.email` : un utilisateur et son compte
 *  `credential`, sans profil IDN. */
async function seedShell(
  t: TestClient,
  email: string,
  opts: { createdAt?: number } = {},
) {
  const createdAt = opts.createdAt ?? Date.now()
  return await t.run(async (ctx) => {
    const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          email,
          name: email,
          emailVerified: false,
          createdAt,
          updatedAt: createdAt,
        },
      },
    })) as { _id: string }
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "account",
        data: {
          accountId: user._id,
          providerId: "credential",
          userId: user._id,
          password: "discarded-secret",
          createdAt,
          updatedAt: createdAt,
        },
      },
    })
    return user._id
  })
}

async function findUser(t: TestClient, userId: string) {
  return await t.run((ctx) =>
    ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "_id", value: userId, operator: "eq" }],
    }),
  )
}

const pivot = {
  firstName: "Ariane",
  lastName: "Nziengui",
  dateOfBirth: "1990-01-02",
  gender: "F" as const,
  birthPlace: "Libreville",
  nationality: "GA",
}

describe("abandon d'une inscription incomplète", () => {
  test("libère l'adresse après un refus pour identité déjà vérifiée", async () => {
    // POURQUOI : c'est le cas réel. `completeSignup` refuse, sa transaction est
    // annulée, mais le compte Better Auth créé avant elle survivait : l'adresse
    // choisie devenait inutilisable, pour ce citoyen comme pour tout autre.
    const t = makeTestClient()
    await t.run(async (ctx) => {
      const { pivotKey } = derivePivotKeys(pivot)
      await ctx.db.insert("userProfile", {
        userId: "titulaire.verifie",
        profileType: "citizen",
        loa: 2,
        idnId: "GA-TEST-0001",
        pivotKey,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })
    const email = "ariane.nziengui@idn.ga"
    const userId = await seedShell(t, email)
    const asShell = t.withIdentity({ subject: userId })

    await expect(
      asShell.mutation(api.onboarding.completeSignup, {
        profileType: "citizen",
        pivot,
        handle: "ariane.nziengui",
        pin: "246813",
      }),
    ).rejects.toThrow(/IDENTITY_ALREADY_VERIFIED/)

    const result = await asShell.mutation(
      api.onboarding.abandonIncompleteSignup,
      {},
    )

    expect(result).toEqual({ abandoned: true })
    expect(await findUser(t, userId)).toBeNull()
    const accounts = await t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "account",
        where: [{ field: "userId", value: userId, operator: "eq" }],
        paginationOpts: { numItems: 10, cursor: null },
      }),
    )
    expect((accounts as { page: unknown[] }).page).toHaveLength(0)
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect())
    expect(audit.map((entry) => entry.action)).toContain("signup_abandoned")
  })

  test("conserve un compte finalisé", async () => {
    // POURQUOI : une réponse `completeSignup` perdue peut faire croire au client
    // à un échec alors que le profil existe. L'abandon qui suit ne doit jamais
    // supprimer le compte d'un citoyen inscrit.
    const t = makeTestClient()
    const userId = await seedShell(t, "ariane.nziengui@idn.ga")
    const asAriane = t.withIdentity({ subject: userId })
    await asAriane.mutation(api.onboarding.completeSignup, {
      profileType: "citizen",
      pivot,
      handle: "ariane.nziengui",
      pin: "246813",
    })

    const result = await asAriane.mutation(
      api.onboarding.abandonIncompleteSignup,
      {},
    )

    expect(result).toEqual({ abandoned: false })
    expect(await findUser(t, userId)).not.toBeNull()
  })

  test("conserve une coquille trop ancienne pour être une inscription en cours", async () => {
    // POURQUOI : au-delà de 24 h, un compte sans profil peut venir d'un autre
    // tunnel ; son sort relève de la réparation admin, auditée, pas d'un appel
    // client.
    const t = makeTestClient()
    const userId = await seedShell(t, "ancien@idn.ga", {
      createdAt: Date.now() - 25 * HOUR,
    })

    const result = await t
      .withIdentity({ subject: userId })
      .mutation(api.onboarding.abandonIncompleteSignup, {})

    expect(result).toEqual({ abandoned: false })
    expect(await findUser(t, userId)).not.toBeNull()
  })

  test("exige une session", async () => {
    const t = makeTestClient()
    await expect(
      t.mutation(api.onboarding.abandonIncompleteSignup, {}),
    ).rejects.toThrow(/UNAUTHENTICATED/)
  })
})
