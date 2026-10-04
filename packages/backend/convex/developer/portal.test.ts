/// <reference types="vite/client" />
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components, internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import schema from "../schema"
import { dayKey, lastDays, windowStart } from "./usage"
import { buildTestEnvelope } from "./webhookTestEnvelope"

const modules = import.meta.glob("/convex/**/*.ts")

/**
 * Fonctions ajoutées pour le portail développeur : usage réel, fiche de
 * l'application, autorisation de l'événement de test des webhooks.
 *
 * Invariants protégés :
 *   • l'usage n'agrège QUE les applications du développeur connecté — jamais
 *     le trafic d'un autre partenaire, et rien d'inventé ;
 *   • le nom et le logo montrés à l'usager sur l'écran de consentement ne
 *     sont modifiables que par le propriétaire, avec des fichiers contrôlés ;
 *   • le niveau de garantie validé pour la production ne peut pas être abaissé
 *     en silence ;
 *   • un événement de test ne part que vers un endpoint vérifié du
 *     propriétaire, et son débit est borné (pas de relais de requêtes).
 */
vi.mock("../lib/auth", async () => {
  const { ConvexError } = await import("convex/values")
  type Ctx = {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
  }
  const load = async (ctx: Ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return {
      userId: identity.subject,
      email: `${identity.subject}@example.ga`,
      emailVerified: true,
      roles: identity.subject.startsWith("citizen") ? [] : ["developer"],
    }
  }
  return {
    getCurrentAuthUser: load,
    requireDeveloper: async (ctx: Ctx) => {
      const user = await load(ctx)
      if (!user || !user.roles.includes("developer")) {
        throw new ConvexError({ code: "FORBIDDEN", message: "Refusé." })
      }
      return user
    },
  }
})

const DAY_MS = 24 * 60 * 60 * 1000

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerBetterAuth(t)
  registerRateLimiter(t)
  return t
}

type T = ReturnType<typeof makeTestClient>

async function seedApp(
  t: T,
  clientId: string,
  userId: string,
  metadata: Record<string, unknown> = {},
) {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "oauthApplication",
        data: {
          clientId,
          userId,
          name: clientId,
          disabled: false,
          redirectUrls: "https://app.example/callback",
          metadata: JSON.stringify({
            env: "sandbox",
            loa: 1,
            scopes: ["openid"],
            ...metadata,
          }),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    })
  })
}

async function seedToken(t: T, clientId: string, createdAt: number) {
  await t.run(async (ctx) => {
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "oauthAccessToken",
        data: {
          clientId,
          userId: "citizen",
          accessToken: `at_${Math.random()}`,
          createdAt,
          updatedAt: createdAt,
        },
      },
    })
  })
}

async function seedEndpoint(
  t: T,
  clientId: string,
  userId: string,
  status: "pending" | "active" | "paused" | "disabled" = "active",
): Promise<Id<"webhookEndpoints">> {
  return await t.run(async (ctx) => {
    const now = Date.now()
    return await ctx.db.insert("webhookEndpoints", {
      appClientId: clientId,
      developerUserId: userId,
      environment: "sandbox",
      name: "Réception",
      url: "https://consumer.example/webhooks",
      status,
      secretCiphertext: "chiffré",
      secretIv: "iv",
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    })
  })
}

async function readApp(t: T, clientId: string) {
  return await t.run(async (ctx) => {
    const raw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "oauthApplication",
      where: [{ field: "clientId", value: clientId, operator: "eq" }],
      paginationOpts: { numItems: 1, cursor: null },
    })) as {
      page: Array<{ name?: string; icon?: string | null; metadata?: string }>
    }
    return raw.page[0]!
  })
}

describe("découpage des jours (heure de Libreville)", () => {
  test("une connexion à 23h30 UTC compte pour le lendemain à Libreville", () => {
    expect(dayKey(Date.parse("2026-03-10T23:30:00Z"))).toBe("2026-03-11")
  })

  test("la fenêtre couvre exactement N jours, aujourd'hui inclus", () => {
    const now = Date.parse("2026-03-10T12:00:00Z")
    expect(lastDays(now, 7)).toHaveLength(7)
    expect(lastDays(now, 7)[6]).toBe("2026-03-10")
    expect(windowStart(now, 7)).toBe(Date.parse("2026-03-03T23:00:00Z"))
  })
})

describe("usage réel des applications", () => {
  test("n'agrège que les applications du développeur connecté", async () => {
    const t = makeTestClient()
    await seedApp(t, "mine", "dev_a")
    await seedApp(t, "theirs", "dev_b")
    const now = Date.now()
    await seedToken(t, "mine", now - 1000)
    await seedToken(t, "mine", now - DAY_MS - 1000)
    await seedToken(t, "theirs", now - 1000)

    const usage = await t
      .withIdentity({ subject: "dev_a" })
      .query(api.developer.usage.overview, { days: 7 })

    expect(usage.apps.map((app) => app.clientId)).toEqual(["mine"])
    expect(usage.totals.tokens).toBe(2)
    expect(usage.daily.reduce((sum, day) => sum + day.tokens, 0)).toBe(2)
    expect(usage.daily).toHaveLength(7)
  })

  test("un jeton hors fenêtre n'est pas compté mais date la dernière activité", async () => {
    const t = makeTestClient()
    await seedApp(t, "mine", "dev_a")
    const old = Date.now() - 20 * DAY_MS
    await seedToken(t, "mine", old)

    const usage = await t
      .withIdentity({ subject: "dev_a" })
      .query(api.developer.usage.overview, { days: 7 })

    expect(usage.totals.tokens).toBe(0)
    expect(usage.apps[0]!.lastActivityAt).toBe(old)
  })

  test("les erreurs sont les livraisons échouées, pas celles encore en cours", async () => {
    const t = makeTestClient()
    await seedApp(t, "mine", "dev_a")
    const endpointId = await seedEndpoint(t, "mine", "dev_a")
    await t.run(async (ctx) => {
      const now = Date.now()
      const eventId = await ctx.db.insert("webhookEvents", {
        eventId: "evt_1",
        type: "iboite.account.updated",
        apiVersion: "1",
        authorization: "oauth_user",
        requiredScope: "idn:iboite.read",
        payloadJson: "{}",
        fanoutStatus: "completed",
        createdAt: now,
        expiresAt: now + DAY_MS,
      })
      for (const status of ["succeeded", "failed", "retrying"] as const) {
        await ctx.db.insert("webhookDeliveries", {
          eventId,
          endpointId,
          appClientId: "mine",
          status,
          attempts: 1,
          nextAttemptAt: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    })

    const usage = await t
      .withIdentity({ subject: "dev_a" })
      .query(api.developer.usage.overview, { days: 7 })

    expect(usage.totals.deliveriesSucceeded).toBe(1)
    expect(usage.totals.deliveriesFailed).toBe(1)
  })

  test("sans rôle développeur, aucune donnée n'est renvoyée", async () => {
    const t = makeTestClient()
    await seedApp(t, "mine", "citizen_x")
    await seedToken(t, "mine", Date.now())
    const usage = await t
      .withIdentity({ subject: "citizen_x" })
      .query(api.developer.usage.overview, { days: 7 })
    expect(usage.apps).toEqual([])
    expect(usage.totals.tokens).toBe(0)
  })
})

describe("fiche de l'application", () => {
  test("le propriétaire modifie nom, description et niveau en sandbox", async () => {
    const t = makeTestClient()
    await seedApp(t, "app", "dev_a", { services: [{ id: "s" }] })
    await t
      .withIdentity({ subject: "dev_a" })
      .mutation(api.developer.appProfile.updateProfile, {
        clientId: "app",
        name: "  Mairie de Libreville  ",
        description: "Actes d'état civil",
        loa: 2,
      })
    const app = await readApp(t, "app")
    const meta = JSON.parse(app.metadata!)
    expect(app.name).toBe("Mairie de Libreville")
    expect(meta.loa).toBe(2)
    expect(meta.description).toBe("Actes d'état civil")
    // Les autres réglages (services, scopes…) ne sont pas écrasés.
    expect(meta.services).toEqual([{ id: "s" }])
  })

  test("un autre développeur ne peut pas renommer l'application", async () => {
    const t = makeTestClient()
    await seedApp(t, "app", "dev_a")
    await expect(
      t
        .withIdentity({ subject: "dev_b" })
        .mutation(api.developer.appProfile.updateProfile, {
          clientId: "app",
          name: "Hameçon",
          description: "",
          loa: 1,
        }),
    ).rejects.toThrow()
    expect((await readApp(t, "app")).name).toBe("app")
  })

  test("le niveau validé d'une application de production ne s'abaisse pas", async () => {
    const t = makeTestClient()
    await seedApp(t, "prod", "dev_a", { env: "production", loa: 3 })
    await expect(
      t
        .withIdentity({ subject: "dev_a" })
        .mutation(api.developer.appProfile.updateProfile, {
          clientId: "prod",
          name: "prod",
          description: "",
          loa: 1,
        }),
    ).rejects.toThrow(/validation/)
  })

  test("un logo non raster est refusé et supprimé du stockage", async () => {
    const t = makeTestClient()
    await seedApp(t, "app", "dev_a")
    const storageId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["<svg/>"], { type: "image/svg+xml" })),
    )
    const result = await t
      .withIdentity({ subject: "dev_a" })
      .mutation(api.developer.appProfile.setLogo, {
        clientId: "app",
        storageId,
      })
    expect(result).toMatchObject({ ok: false, code: "INVALID_LOGO_TYPE" })
    expect(await t.run((ctx) => ctx.db.system.get(storageId))).toBeNull()
    expect((await readApp(t, "app")).icon ?? null).toBeNull()
  })

  // Le chemin « PNG accepté » n'est pas testable ici : convex-test ne conserve
  // pas le type MIME des fichiers stockés. Il est vérifié de bout en bout dans
  // le portail (téléversement réel).

  test("les logos listés sont ceux des seules applications du développeur", async () => {
    const t = makeTestClient()
    await seedApp(t, "mine", "dev_a")
    await seedApp(t, "theirs", "dev_b")
    const branding = await t
      .withIdentity({ subject: "dev_a" })
      .query(api.developer.appProfile.listBranding, {})
    expect(branding).toEqual([{ clientId: "mine", icon: null }])
  })

  test("un autre développeur ne peut pas changer le logo", async () => {
    const t = makeTestClient()
    await seedApp(t, "app", "dev_a")
    await expect(
      t
        .withIdentity({ subject: "dev_b" })
        .mutation(api.developer.appProfile.setLogo, { clientId: "app" }),
    ).rejects.toThrow()
  })
})

describe("événement de test des webhooks", () => {
  async function grantDeveloper(t: T, userId: string) {
    await t.run(async (ctx) => {
      await ctx.db.insert("userRole", {
        userId,
        role: "developer",
        assignedAt: Date.now(),
        assignedBy: userId,
      })
    })
  }

  test("l'enveloppe suit le format v1 et ne porte aucune donnée d'usager", () => {
    const body = JSON.parse(buildTestEnvelope("evt_x", 42, "client_1"))
    expect(body).toMatchObject({
      id: "evt_x",
      type: "webhook.test",
      apiVersion: "1",
      createdAt: 42,
      subject: "client_1",
    })
    expect(Object.keys(body.data)).toEqual(["message"])
  })

  test("refusé vers l'endpoint d'un autre développeur", async () => {
    const t = makeTestClient()
    await grantDeveloper(t, "dev_b")
    await seedApp(t, "app", "dev_a")
    const endpointId = await seedEndpoint(t, "app", "dev_a")
    await expect(
      t.mutation(internal.developer.webhookTestAccess.authorizeTestDelivery, {
        endpointId,
        userId: "dev_b",
      }),
    ).rejects.toThrow(/non autorisé/)
  })

  test("refusé tant que l'endpoint n'a pas passé le challenge", async () => {
    const t = makeTestClient()
    await grantDeveloper(t, "dev_a")
    await seedApp(t, "app", "dev_a")
    const endpointId = await seedEndpoint(t, "app", "dev_a", "pending")
    await expect(
      t.mutation(internal.developer.webhookTestAccess.authorizeTestDelivery, {
        endpointId,
        userId: "dev_a",
      }),
    ).rejects.toThrow(/challenge/)
  })

  test("le débit est borné à dix envois par minute et par endpoint", async () => {
    const t = makeTestClient()
    await grantDeveloper(t, "dev_a")
    await seedApp(t, "app", "dev_a")
    const endpointId = await seedEndpoint(t, "app", "dev_a")
    for (let i = 0; i < 10; i++) {
      const allowed = await t.mutation(
        internal.developer.webhookTestAccess.authorizeTestDelivery,
        { endpointId, userId: "dev_a" },
      )
      expect(allowed.url).toBe("https://consumer.example/webhooks")
    }
    await expect(
      t.mutation(internal.developer.webhookTestAccess.authorizeTestDelivery, {
        endpointId,
        userId: "dev_a",
      }),
    ).rejects.toThrow(/Trop d'envois/)
  })
})

describe("référentiels et statut du compte", () => {
  test("le portail propose exactement les scopes acceptés par le serveur", async () => {
    const t = makeTestClient()
    const catalog = await t.query(api.developer.catalog.scopes, {})
    // `nip` n'est pas un scope : le NIP est un claim de idn:civil_status.
    expect(catalog.oauthScopes).not.toContain("nip")
    expect(catalog.oauthScopes).toContain("idn:civil_status")
    expect(catalog.oauthScopes).toContain("openid")
    expect(catalog.m2mScopes).toContain("citizens:resolve")
  })

  test("la validation du compte reflète le rôle développeur, pas un autre rôle", async () => {
    const t = makeTestClient()
    await t.run(async (ctx) => {
      await ctx.db.insert("userRole", {
        userId: "dev_a",
        role: "developer",
        assignedAt: 1000,
        assignedBy: "dev_a",
        verified: true,
      })
    })
    expect(
      await t
        .withIdentity({ subject: "dev_a" })
        .query(api.developer.catalog.accountStatus, {}),
    ).toEqual({ hasDeveloperRole: true, verified: true, developerSince: 1000 })
    expect(
      await t
        .withIdentity({ subject: "dev_b" })
        .query(api.developer.catalog.accountStatus, {}),
    ).toEqual({ hasDeveloperRole: false, verified: false, developerSince: null })
  })
})

describe("outil de test des webhooks (dev)", () => {
  test("active un endpoint en attente sans toucher à son secret", async () => {
    const t = makeTestClient()
    await seedApp(t, "app", "dev_a")
    const endpointId = await seedEndpoint(t, "app", "dev_a", "pending")
    await t.mutation(internal._dev.forceWebhookEndpointActive.run, { endpointId })
    const row = await t.run((ctx) => ctx.db.get(endpointId))
    expect(row?.status).toBe("active")
    expect(row?.verifiedAt).toBeTypeOf("number")
    expect(row?.secretCiphertext).toBe("chiffré")
  })
})
