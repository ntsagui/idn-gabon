/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")
const ADMIN = "admin_recovery_methods"

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

async function seedAccount(
  t: ReturnType<typeof makeTestClient>,
  options: {
    email: string
    idnId: string
    profileType: "citizen" | "developer"
    role?: "identity_controller" | "developer"
  },
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
    if (options.role) {
      await ctx.db.insert("userRole", {
        userId: user._id,
        role: options.role,
        assignedAt: now,
      })
    }
    await ctx.db.insert("userProfile", {
      userId: user._id,
      profileType: options.profileType,
      loa: 1,
      idnId: options.idnId,
      createdAt: now,
      updatedAt: now,
    })
    return user._id
  })
}

describe("codes provisoires proposés selon le moyen de connexion", () => {
  test("la fiche compte n'expose que les voies utiles au titulaire", async () => {
    // POURQUOI : sur la fiche d'un citoyen, la carte « mot de passe » était
    // prise pour un doublon de la carte PIN, et le code qu'elle émet ne
    // débloque pas `/forgot-pin`. Un contrôleur, lui, se connecte par mot de
    // passe à son app ET par PIN au portail : il garde les deux voies.
    const t = makeTestClient()
    const admin = t.withIdentity({ subject: ADMIN })
    const citizen = await seedAccount(t, {
      email: "citoyen.seul@idn.ga",
      idnId: "GA-TEST-8801",
      profileType: "citizen",
    })
    const controller = await seedAccount(t, {
      email: "agent.controle@idn.ga",
      idnId: "GA-TEST-8802",
      profileType: "citizen",
      role: "identity_controller",
    })
    const developer = await seedAccount(t, {
      email: "dev.partenaire@example.ga",
      idnId: "GA-TEST-8803",
      profileType: "developer",
    })

    const methods = async (userId: string) =>
      (await admin.query(api.admin.users.getProfile, { userId }))
        ?.recoveryMethods

    expect(await methods(citizen)).toEqual({ pin: true, password: false })
    expect(await methods(controller)).toEqual({ pin: true, password: true })
    expect(await methods(developer)).toEqual({ pin: false, password: true })
  })

  test("le serveur refuse un code de mot de passe pour un compte à PIN", async () => {
    // POURQUOI : masquer la carte ne suffit pas. Un mot de passe connu sur un
    // compte citoyen ouvrirait `/api/auth/sign-in/email` sans passer par le
    // PIN : une seconde porte d'entrée que le titulaire ignore.
    const t = makeTestClient()
    const citizen = await seedAccount(t, {
      email: "citoyen.pin-seul@idn.ga",
      idnId: "GA-TEST-8804",
      profileType: "citizen",
    })

    await expect(
      t
        .withIdentity({ subject: ADMIN })
        .action(api.admin.accounts.generatePasswordResetCode, {
          userId: citizen,
          confirmIdentifier: "GA-TEST-8804",
        }),
    ).rejects.toThrow(/se connecte par PIN/)

    const verifications = await t.run(async (ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "verification",
        where: [
          {
            field: "identifier",
            value: "forget-password-otp-citoyen.pin-seul@idn.ga",
            operator: "eq",
          },
        ],
        paginationOpts: { numItems: 10, cursor: null },
      }),
    )
    expect(verifications.page).toHaveLength(0)
  })

  test("le serveur refuse un code de PIN pour un compte développeur", async () => {
    // POURQUOI : un compte développeur n'a pas de PIN. En poser un via ce
    // code lui donnerait un accès au portail citoyen par `/sign-in/pin`.
    const t = makeTestClient()
    const developer = await seedAccount(t, {
      email: "dev.sans-pin@example.ga",
      idnId: "GA-TEST-8805",
      profileType: "developer",
    })

    await expect(
      t
        .withIdentity({ subject: ADMIN })
        .mutation(api.admin.accounts.generatePinResetCode, {
          userId: developer,
          confirmIdentifier: "GA-TEST-8805",
        }),
    ).rejects.toThrow(/se connecte par mot de passe/)

    const challenges = await t.run(async (ctx) =>
      ctx.db
        .query("pinRecoveryChallenge")
        .withIndex("by_userId", (q) => q.eq("userId", developer))
        .collect(),
    )
    expect(challenges).toHaveLength(0)
  })
})
