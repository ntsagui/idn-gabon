/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")
const ADMIN = "admin_recovery"

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
  return t
}

/**
 * Test d'intégration du contrat le plus fragile : le code créé par la
 * console doit être accepté par la route Better Auth déjà utilisée par le
 * portail citoyen, puis supprimé et toutes les sessions doivent être
 * révoquées.
 */
describe("réinitialisation avec le code provisoire administrateur", () => {
  test("le code termine le parcours existant et ferme les anciennes sessions", async () => {
    const t = makeTestClient()
    const now = Date.now()
    const email = "citoyenne.support@idn.ga"
    const seeded = await t.run(async (ctx) => {
      const user = (await ctx.runMutation(
        components.betterAuth.adapter.create,
        {
          input: {
            model: "user",
            data: {
              email,
              name: email,
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      )) as { _id: string }
      const account = (await ctx.runMutation(
        components.betterAuth.adapter.create,
        {
          input: {
            model: "account",
            data: {
              accountId: user._id,
              providerId: "credential",
              userId: user._id,
              password: "ancien-hash",
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      )) as { _id: string }
      await ctx.runMutation(components.betterAuth.adapter.create, {
        input: {
          model: "session",
          data: {
            userId: user._id,
            token: "ancienne-session",
            expiresAt: now + 86_400_000,
            createdAt: now,
            updatedAt: now,
          },
        },
      })
      // Compte d'agent contrôleur : il se connecte à l'app des contrôleurs par
      // email + mot de passe, c'est donc le code de mot de passe qui le sert.
      // Un citoyen sans rôle se voit refuser ce code (recoveryMethods.test.ts).
      await ctx.db.insert("userRole", {
        userId: user._id,
        role: "identity_controller",
        assignedAt: now,
      })
      await ctx.db.insert("userProfile", {
        userId: user._id,
        profileType: "citizen",
        loa: 1,
        idnId: "GA-TEST-9910",
        pivot: {
          firstName: "Citoyenne",
          lastName: "Support",
          dateOfBirth: "1990-01-02",
          gender: "F",
          birthPlace: "Libreville",
          nationality: "GA",
        },
        createdAt: now,
        updatedAt: now,
      })
      return { userId: user._id, accountId: account._id }
    })

    const issued = await t
      .withIdentity({ subject: ADMIN })
      .action(api.admin.accounts.generatePasswordResetCode, {
        userId: seeded.userId,
        confirmIdentifier: "GA-TEST-9910",
      })

    const response = await t.fetch("/api/auth/email-otp/reset-password", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        email,
        otp: issued.code,
        password: "Nouveau-Mot-de-Passe-Test-2026!",
      }),
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })

    const state = await t.run(async (ctx) => {
      const account = await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: "account",
          where: [{ field: "_id", value: seeded.accountId }],
        },
      )
      const sessions = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "session",
          where: [{ field: "userId", value: seeded.userId, operator: "eq" }],
          paginationOpts: { numItems: 10, cursor: null },
        },
      )
      const verifications = await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: "verification",
          where: [
            {
              field: "identifier",
              value: `forget-password-otp-${email}`,
              operator: "eq",
            },
          ],
          paginationOpts: { numItems: 10, cursor: null },
        },
      )
      const audit = await ctx.db
        .query("auditLog")
        .withIndex("by_target", (q) =>
          q.eq("targetType", "user").eq("targetId", seeded.userId),
        )
        .order("desc")
        .first()
      return { account, sessions, verifications, audit }
    })

    expect(state.account?.password).not.toBe("ancien-hash")
    expect(state.sessions.page).toHaveLength(0)
    expect(state.verifications.page).toHaveLength(0)
    expect(state.audit).toMatchObject({
      action: "password_changed",
      metadata: { method: "password_reset_otp" },
    })
  })
})
