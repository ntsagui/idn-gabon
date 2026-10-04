/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { convexTest } from "convex-test"
import { afterEach, describe, expect, test, vi } from "vitest"

import { api, components } from "../_generated/api"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")

/**
 * Fonctions ajoutées pour la refonte de la console d'administration :
 * annuaire filtrable, journal d'audit lisible, suspension d'application,
 * état des intégrations, tableau de bord.
 *
 * Fil conducteur : la console ne doit ni mentir (un compteur ou un filtre
 * faux fait prendre une mauvaise décision à un agent), ni exposer un secret,
 * ni afficher un identifiant brut quand un nom existe.
 */

vi.mock("../lib/auth", async () => {
  const { ConvexError: CE } = await import("convex/values")
  return {
    requireAdmin: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity?.subject.startsWith("admin_")) {
        throw new CE({ code: "FORBIDDEN", message: "Accès refusé." })
      }
      return {
        userId: identity.subject,
        email: `${identity.subject}@example.ga`,
        emailVerified: true,
        roles: ["admin"],
      }
    },
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  registerAggregate(t, "auditByCategory")
  registerBetterAuth(t)
  return t
}

type T = ReturnType<typeof makeTestClient>

const asAdmin = (t: T) => t.withIdentity({ subject: "admin_1" })

async function createAccount(
  t: T,
  input: {
    email: string
    firstName?: string
    lastName?: string
    loa?: 1 | 2 | 3
    profileType?: "citizen" | "resident" | "visitor" | "developer"
    createdAt?: number
    idnId?: string
    deletedAt?: number
  },
): Promise<string> {
  return await t.run(async (ctx) => {
    const created = (await ctx.runMutation(
      components.betterAuth.adapter.create,
      {
        input: {
          model: "user",
          data: {
            email: input.email,
            name: input.email,
            emailVerified: true,
            createdAt: input.createdAt ?? Date.now(),
            updatedAt: input.createdAt ?? Date.now(),
          },
        },
      },
    )) as { _id: string }
    await ctx.db.insert("userProfile", {
      userId: created._id,
      profileType: input.profileType ?? "citizen",
      loa: input.loa ?? 1,
      idnId: input.idnId,
      pivot: input.firstName
        ? {
            firstName: input.firstName,
            lastName: input.lastName ?? "",
            dateOfBirth: "1990-01-02",
            gender: "F",
            birthPlace: "Libreville",
            nationality: "GA",
          }
        : undefined,
      deletedAt: input.deletedAt,
      createdAt: input.createdAt ?? Date.now(),
      updatedAt: input.createdAt ?? Date.now(),
    })
    return created._id
  })
}

/* -------------------------------------------------------------------------- */
/*  Annuaire                                                                  */
/* -------------------------------------------------------------------------- */

describe("annuaire des comptes", () => {
  async function seed(t: T) {
    const base = Date.parse("2026-03-01T00:00:00Z")
    const ariane = await createAccount(t, {
      email: "ariane@idn.ga",
      firstName: "Ariane",
      lastName: "Nziengui",
      loa: 3,
      createdAt: base,
      idnId: "GA-AAAA-0001",
    })
    const bruno = await createAccount(t, {
      email: "bruno@idn.ga",
      firstName: "Bruno",
      lastName: "Abessolo",
      loa: 2,
      createdAt: base + 1000,
    })
    const dev = await createAccount(t, {
      email: "dev@partenaire.ga",
      profileType: "developer",
      createdAt: base + 2000,
    })
    const gone = await createAccount(t, {
      email: "parti@idn.ga",
      createdAt: base + 3000,
      deletedAt: base + 4000,
    })
    await t.run(async (ctx) => {
      await ctx.db.insert("userRole", {
        userId: dev,
        role: "developer",
        assignedAt: base,
        assignedBy: "admin_1",
      })
      // Rôle révoqué : ne doit pas compter.
      await ctx.db.insert("userRole", {
        userId: bruno,
        role: "identity_controller",
        assignedAt: base,
        assignedBy: "admin_1",
        revokedAt: base + 10,
      })
      // Bruno : un ancien dossier rejeté puis un dossier approuvé. Le statut
      // courant est celui du plus récent.
      await ctx.db.insert("kycRequest", {
        userId: bruno,
        documentType: "cni_gabon",
        documentImages: {},
        status: "rejected",
        createdAt: base,
        updatedAt: base,
      })
      await ctx.db.insert("kycRequest", {
        userId: bruno,
        documentType: "cni_gabon",
        documentImages: {},
        status: "approved",
        createdAt: base + 5000,
        updatedAt: base + 5000,
      })
    })
    return { ariane, bruno, dev, gone }
  }

  // Le compteur de navigation (`countAccounts`) compte aussi les comptes
  // anonymisés : la liste non filtrée doit tomber sur le même nombre, sinon
  // l'agent voit deux totaux différents pour la même chose.
  test("le total sans filtre inclut les comptes anonymisés", async () => {
    const t = makeTestClient()
    await seed(t)
    const all = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
    })
    expect(all.total).toBe(4)
    expect(all.rows.filter((r) => r.deletedAt !== undefined)).toHaveLength(1)
    const count = await asAdmin(t).query(api.admin.directory.countAccounts, {})
    expect(count).toEqual({
      total: 4,
      byLoa: { loa1: 2, loa2: 1, loa3: 1 },
      deleted: 1,
      truncated: false,
    })
  })

  test("le filtre de rôle ignore les rôles révoqués", async () => {
    const t = makeTestClient()
    const { dev } = await seed(t)
    const controllers = await asAdmin(t).query(
      api.admin.directory.listAccounts,
      { page: 0, pageSize: 10, role: "identity_controller" },
    )
    expect(controllers.total).toBe(0)
    const devs = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      role: "developer",
    })
    expect(devs.rows.map((r) => r.userId)).toEqual([dev])
    expect(devs.rows[0]?.roles).toEqual(["developer"])
  })

  test("le statut KYC retenu est celui du dossier le plus récent", async () => {
    const t = makeTestClient()
    const { bruno } = await seed(t)
    const approved = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      kycStatus: "approved",
    })
    expect(approved.rows.map((r) => r.userId)).toEqual([bruno])
    const rejected = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      kycStatus: "rejected",
    })
    expect(rejected.total).toBe(0)
    const none = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      kycStatus: "none",
    })
    expect(none.total).toBe(3)
  })

  test("recherche par nom, par email et par ID IDN ; état anonymisé", async () => {
    const t = makeTestClient()
    const { ariane, dev, gone } = await seed(t)
    const byName = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      q: "nziengui",
    })
    expect(byName.rows.map((r) => r.userId)).toEqual([ariane])
    expect(byName.rows[0]?.name).toBe("Ariane Nziengui")

    const byEmail = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      q: "@partenaire",
    })
    expect(byEmail.rows.map((r) => r.userId)).toEqual([dev])

    const byIdn = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      q: "ga-aaaa-0001",
    })
    expect(byIdn.rows.map((r) => r.userId)).toEqual([ariane])

    const deleted = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      state: "deleted",
    })
    expect(deleted.rows.map((r) => r.userId)).toEqual([gone])
  })

  test("tri par nom : comptes nommés d'abord, dans l'ordre alphabétique du nom de famille", async () => {
    const t = makeTestClient()
    const { ariane, bruno } = await seed(t)
    const sorted = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 10,
      sort: "name",
    })
    expect(sorted.rows.slice(0, 2).map((r) => r.userId)).toEqual([
      bruno, // Abessolo
      ariane, // Nziengui
    ])
  })

  test("la pagination rend chaque compte atteignable une seule fois", async () => {
    const t = makeTestClient()
    await seed(t)
    const first = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 0,
      pageSize: 3,
    })
    const second = await asAdmin(t).query(api.admin.directory.listAccounts, {
      page: 1,
      pageSize: 3,
    })
    expect(first.pageCount).toBe(2)
    const ids = [...first.rows, ...second.rows].map((r) => r.userId)
    expect(new Set(ids).size).toBe(4)
  })

  test("un compte opérateur sans profil citoyen a tout de même une fiche", async () => {
    const t = makeTestClient()
    const operator = await t.run(async (ctx) => {
      const created = (await ctx.runMutation(
        components.betterAuth.adapter.create,
        {
          input: {
            model: "user",
            data: {
              email: "agent@idn.ga",
              name: "Paul Nze",
              emailVerified: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        },
      )) as { _id: string }
      await ctx.db.insert("userRole", {
        userId: created._id,
        role: "identity_controller",
        assignedAt: Date.now(),
        assignedBy: "admin_1",
      })
      return created._id
    })
    expect(
      await asAdmin(t).query(api.admin.users.getProfile, { userId: operator }),
    ).toBeNull()
    const basics = await asAdmin(t).query(
      api.admin.directory.getAccountBasics,
      { userId: operator },
    )
    expect(basics).toMatchObject({
      email: "agent@idn.ga",
      name: "Paul Nze",
      roles: [{ role: "identity_controller" }],
    })
  })

  test("refuse un appelant non administrateur", async () => {
    const t = makeTestClient()
    await expect(
      t
        .withIdentity({ subject: "citizen_1" })
        .query(api.admin.directory.listAccounts, { page: 0, pageSize: 10 }),
    ).rejects.toThrow()
  })
})

/* -------------------------------------------------------------------------- */
/*  Journal d'audit                                                           */
/* -------------------------------------------------------------------------- */

describe("journal d'audit lisible", () => {
  async function seed(t: T) {
    const agent = await createAccount(t, {
      email: "agent@idn.ga",
      firstName: "Paul",
      lastName: "Nze",
    })
    const citizen = await createAccount(t, {
      email: "awa@idn.ga",
      firstName: "Awa",
      lastName: "Mboumba",
    })
    const now = Date.now()
    await t.run(async (ctx) => {
      await ctx.db.insert("auditLog", {
        actorId: agent,
        action: "role_assigned",
        targetType: "user",
        targetId: citizen,
        metadata: { role: "developer" },
        createdAt: now - 3 * 60 * 60 * 1000,
      })
      await ctx.db.insert("auditLog", {
        actorId: citizen,
        action: "login_success",
        targetType: "user",
        targetId: citizen,
        createdAt: now - 60 * 1000,
      })
      await ctx.db.insert("auditLog", {
        action: "kyc_approved",
        targetType: "kyc",
        targetId: "kyc_1",
        createdAt: now - 10 * 24 * 60 * 60 * 1000,
      })
    })
    return { agent, citizen, now }
  }

  test("l'acteur et la cible sont nommés, pas réduits à leur identifiant", async () => {
    const t = makeTestClient()
    const { agent, citizen } = await seed(t)
    const { rows } = await asAdmin(t).query(
      api.admin.auditExplorer.listEvents,
      { category: "admin" },
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]?.actor).toMatchObject({ userId: agent, name: "Paul Nze" })
    expect(rows[0]?.target.person).toMatchObject({
      userId: citizen,
      name: "Awa Mboumba",
    })
  })

  test("filtre par acteur saisi en email, combinable avec la période", async () => {
    const t = makeTestClient()
    const { now } = await seed(t)
    const byActor = await asAdmin(t).query(
      api.admin.auditExplorer.listEvents,
      { actor: "AWA@idn.ga" },
    )
    expect(byActor.rows.map((r) => r.action)).toEqual(["login_success"])

    const lastHourAgent = await asAdmin(t).query(
      api.admin.auditExplorer.listEvents,
      { actor: "agent@idn.ga", dateFrom: now - 60 * 60 * 1000 },
    )
    expect(lastHourAgent.rows).toHaveLength(0)

    const unknown = await asAdmin(t).query(
      api.admin.auditExplorer.listEvents,
      { actor: "inconnu@idn.ga" },
    )
    expect(unknown.actorNotFound).toBe(true)
  })

  test("la période exclut les événements hors bornes", async () => {
    const t = makeTestClient()
    const { now } = await seed(t)
    const week = await asAdmin(t).query(api.admin.auditExplorer.listEvents, {
      dateFrom: now - 7 * 24 * 60 * 60 * 1000,
    })
    expect(week.rows.map((r) => r.action).sort()).toEqual([
      "login_success",
      "role_assigned",
    ])
  })

  test("l'historique d'un compte réunit ce qu'il a fait et ce qu'on lui a fait", async () => {
    const t = makeTestClient()
    const { citizen } = await seed(t)
    const history = await asAdmin(t).query(
      api.admin.auditExplorer.listForUser,
      { userId: citizen },
    )
    expect(history.map((r) => r.action)).toEqual([
      "login_success",
      "role_assigned",
    ])
  })

  test("le détail d'un événement signale la signature sans la divulguer", async () => {
    const t = makeTestClient()
    await seed(t)
    const id = await t.run((ctx) =>
      ctx.db.insert("auditLog", {
        action: "admin_action",
        targetType: "system",
        targetId: "x",
        signature: "secret-hmac",
        createdAt: Date.now(),
      }),
    )
    const detail = await asAdmin(t).query(api.admin.auditExplorer.getEvent, {
      id,
    })
    expect(detail?.signed).toBe(true)
    expect(JSON.stringify(detail)).not.toContain("secret-hmac")
  })
})

/* -------------------------------------------------------------------------- */
/*  Suspension d'application                                                  */
/* -------------------------------------------------------------------------- */

describe("suspension et réactivation d'une application", () => {
  async function seedPair(t: T) {
    await t.run(async (ctx) => {
      for (const [clientId, env, disabled, linked] of [
        ["app_sbx", "sandbox", false, "app_prd"],
        ["app_prd", "production", true, "app_sbx"],
      ] as const) {
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "oauthApplication",
            data: {
              clientId,
              userId: "developer_1",
              name: "Bourses Étudiantes",
              redirectUrls: "https://bourses.ga/callback",
              disabled,
              metadata: JSON.stringify({
                env,
                status: env === "production" ? "pending" : undefined,
                linkedClientId: linked,
                productionStatus: env === "sandbox" ? "pending" : undefined,
                scopes: "openid,profile",
              }),
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          },
        })
      }
    })
  }

  async function disabledFlags(t: T) {
    return await t.run(async (ctx) => {
      const page = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "oauthApplication",
        paginationOpts: { cursor: null, numItems: 10 },
      })) as { page: Array<{ clientId: string; disabled: boolean }> }
      return Object.fromEntries(page.page.map((d) => [d.clientId, d.disabled]))
    })
  }

  test("suspendre coupe les deux environnements ; réactiver restaure l'état d'avant", async () => {
    const t = makeTestClient()
    await seedPair(t)

    await asAdmin(t).mutation(api.admin.appControl.suspend, {
      clientId: "app_sbx",
      reason: "Usage abusif signalé",
    })
    expect(await disabledFlags(t)).toEqual({ app_sbx: true, app_prd: true })

    const owners = await asAdmin(t).query(api.admin.appControl.listOwners, {})
    expect(owners.every((o) => o.suspended?.reason === "Usage abusif signalé"))
      .toBe(true)

    await asAdmin(t).mutation(api.admin.appControl.reactivate, {
      clientId: "app_sbx",
    })
    // La jumelle de production attendait une revue : elle reste désactivée,
    // la réactivation ne vaut pas approbation.
    expect(await disabledFlags(t)).toEqual({ app_sbx: false, app_prd: true })
    const [logical] = await asAdmin(t).query(api.admin.oauthApps.listApps, {})
    expect(logical?.status).toBe("pending")
  })

  test("une double suspension ne perd pas l'état à restaurer", async () => {
    const t = makeTestClient()
    await seedPair(t)
    await asAdmin(t).mutation(api.admin.appControl.suspend, {
      clientId: "app_sbx",
    })
    await asAdmin(t).mutation(api.admin.appControl.suspend, {
      clientId: "app_prd",
    })
    await asAdmin(t).mutation(api.admin.appControl.reactivate, {
      clientId: "app_prd",
    })
    expect(await disabledFlags(t)).toEqual({ app_sbx: false, app_prd: true })
  })

  test("réactiver une application non suspendue est refusé, et chaque action est auditée", async () => {
    const t = makeTestClient()
    await seedPair(t)
    await expect(
      asAdmin(t).mutation(api.admin.appControl.reactivate, {
        clientId: "app_sbx",
      }),
    ).rejects.toThrow(/pas suspendue/)

    await asAdmin(t).mutation(api.admin.appControl.suspend, {
      clientId: "app_sbx",
    })
    await asAdmin(t).mutation(api.admin.appControl.reactivate, {
      clientId: "app_sbx",
    })
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditLog").collect()).map((r) => [
        r.action,
        r.metadata?.kind,
      ]),
    )
    expect(actions).toEqual([
      ["oauth_app_disabled", "suspended"],
      ["oauth_app_modified", "reactivated"],
    ])
  })

  test("l'historique de l'application réunit ses deux environnements", async () => {
    const t = makeTestClient()
    await seedPair(t)
    await asAdmin(t).mutation(api.admin.appControl.suspend, {
      clientId: "app_prd",
    })
    await t.run((ctx) =>
      ctx.db.insert("auditLog", {
        action: "oauth_app_created",
        targetType: "app",
        targetId: "app_sbx",
        createdAt: Date.now() - 60_000,
      }),
    )
    const history = await asAdmin(t).query(api.admin.auditExplorer.listForApp, {
      clientIds: ["app_sbx", "app_prd"],
    })
    expect(history.map((h) => h.action)).toEqual([
      "oauth_app_disabled",
      "oauth_app_created",
    ])
    expect(history[0]?.target.appName).toBe("Bourses Étudiantes")
  })

  test("un non-administrateur ne peut pas suspendre", async () => {
    const t = makeTestClient()
    await seedPair(t)
    await expect(
      t
        .withIdentity({ subject: "developer_1" })
        .mutation(api.admin.appControl.suspend, { clientId: "app_sbx" }),
    ).rejects.toThrow()
    expect(await disabledFlags(t)).toEqual({ app_sbx: false, app_prd: true })
  })
})

/* -------------------------------------------------------------------------- */
/*  Intégrations                                                              */
/* -------------------------------------------------------------------------- */

describe("état des intégrations e-mail et SMS", () => {
  test("sans variables, les deux canaux sont déclarés non configurés", async () => {
    const t = makeTestClient()
    vi.stubEnv("MAIL_BRIDGE_URL", "")
    vi.stubEnv("MAIL_BRIDGE_TOKEN", "")
    vi.stubEnv("BIRD_API_KEY", "")
    const status = await asAdmin(t).query(api.admin.integrations.getStatus, {})
    expect(status.email.configured).toBe(false)
    expect(status.sms.configured).toBe(false)
    expect(status.email.fromAddress).toBe("notifications@idn.ga")
  })

  test("les secrets ne sortent jamais, seule leur présence est rapportée", async () => {
    const t = makeTestClient()
    vi.stubEnv("MAIL_BRIDGE_URL", "https://mail.idn.ga/api")
    vi.stubEnv("MAIL_BRIDGE_TOKEN", "tok-super-secret")
    vi.stubEnv("BIRD_API_KEY", "bk_eu1_abcdefsecret")
    const status = await asAdmin(t).query(api.admin.integrations.getStatus, {})
    expect(status.email.configured).toBe(true)
    expect(status.email.bridgeHost).toBe("mail.idn.ga")
    expect(status.sms.configured).toBe(true)
    expect(status.sms.region).toBe("eu1")
    const serialized = JSON.stringify(status)
    expect(serialized).not.toContain("tok-super-secret")
    expect(serialized).not.toContain("abcdefsecret")
  })

  test("le dernier envoi provient des traces réelles", async () => {
    const t = makeTestClient()
    const userId = await createAccount(t, { email: "awa@idn.ga" })
    const now = Date.now()
    await t.run(async (ctx) => {
      const accountId = await ctx.db.insert("iboiteAccount", {
        userId,
        type: "personal",
        label: "Awa",
        emailAlias: "awa@idn.ga",
        street: "",
        city: "Libreville",
        postalCode: "",
        country: "GA",
        qrCode: "IDNGA-1",
        counters: {
          unreadLetters: 0,
          pendingLetters: 0,
          availablePackages: 0,
          unreadMessages: 0,
        },
        createdAt: now,
        updatedAt: now,
      })
      const message = {
        accountId,
        userId,
        threadId: "th",
        senderKind: "citizen" as const,
        senderName: "Awa",
        senderEmail: "awa@idn.ga",
        recipientName: "X",
        recipientEmail: "x@exemple.ga",
        subject: "s",
        preview: "p",
        body: "b",
        folder: "sent" as const,
        isRead: true,
        isStarred: false,
        hasAttachment: false,
        transport: "smtp" as const,
      }
      await ctx.db.insert("iboiteMessage", {
        ...message,
        deliveryStatus: "sent",
        createdAt: now - 5000,
      })
      await ctx.db.insert("iboiteMessage", {
        ...message,
        deliveryStatus: "failed",
        deliveryError: "Mail bridge 502: upstream x@exemple.ga refused",
        createdAt: now - 1000,
      })
      await ctx.db.insert("auditLog", {
        actorId: userId,
        action: "otp_sent",
        targetType: "user",
        targetId: userId,
        metadata: { channel: "sms", purpose: "pin_recovery" },
        createdAt: now - 2000,
      })
    })
    const status = await asAdmin(t).query(api.admin.integrations.getStatus, {})
    expect(status.email.lastSuccess?.at).toBe(now - 5000)
    expect(status.email.lastFailure).toEqual({
      at: now - 1000,
      detail: "Réponse 502 de la passerelle",
    })
    expect(JSON.stringify(status)).not.toContain("x@exemple.ga")
    expect(status.sms.lastSuccess?.at).toBe(now - 2000)
    expect(status.sms.sentLast7Days).toBe(1)
  })
})

/* -------------------------------------------------------------------------- */
/*  Tableau de bord                                                           */
/* -------------------------------------------------------------------------- */

describe("tableau de bord", () => {
  test("les connexions sont rangées dans la journée locale de l'opérateur", async () => {
    vi.useFakeTimers()
    // 10 mars 2026, 00:30 à Libreville (UTC+1) = 9 mars 23:30 UTC.
    vi.setSystemTime(new Date("2026-03-09T23:30:00Z"))
    try {
      const t = makeTestClient()
      await t.run(async (ctx) => {
        for (const at of [
          "2026-03-09T23:10:00Z", // 10 mars 00:10 locale → aujourd'hui
          "2026-03-09T22:50:00Z", // 9 mars 23:50 locale → hier
        ]) {
          await ctx.db.insert("auditLog", {
            action: "login_success",
            targetType: "user",
            targetId: "u",
            createdAt: Date.parse(at),
          })
        }
      })
      const activity = await asAdmin(t).query(
        api.admin.overview.loginActivity,
        { days: 7, tzOffsetMinutes: -60 },
      )
      expect(activity.buckets).toHaveLength(7)
      expect(activity.buckets[activity.buckets.length - 1]?.count).toBe(1)
      expect(activity.buckets[activity.buckets.length - 2]?.count).toBe(1)
      expect(activity.last24h).toBe(2)
    } finally {
      vi.useRealTimers()
    }
  })

  test("seuls les codes provisoires encore valables sont listés, un par compte et par type", async () => {
    const t = makeTestClient()
    const citizen = await createAccount(t, {
      email: "awa@idn.ga",
      firstName: "Awa",
      lastName: "Mboumba",
    })
    const now = Date.now()
    await t.run(async (ctx) => {
      const issue = (kind: string, createdAt: number, expiresAt: number) =>
        ctx.db.insert("auditLog", {
          actorId: "admin_1",
          action: "admin_action",
          targetType: "user",
          targetId: citizen,
          metadata: { kind, expiresAt },
          createdAt,
        })
      await issue("pin_reset_code_issued", now - 20 * 60 * 1000, now - 5 * 60 * 1000) // expiré
      await issue("password_reset_code_issued", now - 5 * 60 * 1000, now + 5 * 60 * 1000)
      await issue("password_reset_code_issued", now - 2 * 60 * 1000, now + 13 * 60 * 1000) // remplace le précédent
    })
    const codes = await asAdmin(t).query(
      api.admin.overview.activeRecoveryCodes,
      {},
    )
    expect(codes).toHaveLength(1)
    expect(codes[0]).toMatchObject({
      kind: "password",
      expiresAt: now + 13 * 60 * 1000,
      account: { name: "Awa Mboumba" },
    })
  })
})

/* -------------------------------------------------------------------------- */
/*  File des signalements de doublon                                          */
/* -------------------------------------------------------------------------- */

describe("file des signalements de doublon", () => {
  test("un identifiant de compte invalide ne rend pas la file illisible", async () => {
    const t = makeTestClient()
    const real = await createAccount(t, { email: "awa@idn.ga", idnId: "GA-AAAA-0002" })
    await t.run((ctx) =>
      ctx.db.insert("duplicateSignal", {
        userId: real,
        matchedUserId: "seed-compte-de-demo",
        signal: "nip",
        groupKey: "12345678901234",
        status: "open",
        detectedAt: Date.now(),
      }),
    )
    const { flags } = await asAdmin(t).query(
      api.duplicates.queries.listOpenFlags,
      {},
    )
    expect(flags).toHaveLength(1)
    expect(flags[0]?.account).toMatchObject({ email: "awa@idn.ga", exists: true })
    expect(flags[0]?.matched).toMatchObject({ email: "", exists: false })
  })
})

/* -------------------------------------------------------------------------- */
/*  Sessions et appareils                                                     */
/* -------------------------------------------------------------------------- */

describe("sessions et appareils d'un compte", () => {
  test("seules les sessions actives remontent, sans jeton", async () => {
    const t = makeTestClient()
    const userId = await createAccount(t, { email: "awa@idn.ga" })
    const now = Date.now()
    await t.run(async (ctx) => {
      for (const [token, expiresAt] of [
        ["tok-active-secret", now + 60_000],
        ["tok-expired-secret", now - 60_000],
      ] as const) {
        await ctx.runMutation(components.betterAuth.adapter.create, {
          input: {
            model: "session",
            data: {
              token,
              userId,
              userAgent:
                "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit Safari/604.1",
              ipAddress: "41.158.0.1",
              expiresAt,
              createdAt: now - 1000,
              updatedAt: now - 500,
            },
          },
        })
      }
      await ctx.db.insert("nativePushSubscription", {
        userId,
        token: "ExponentPushToken[secret]",
        platform: "ios",
        deviceName: "iPhone de Awa",
        createdAt: now,
        updatedAt: now,
      })
    })
    const result = await asAdmin(t).query(
      api.admin.accountDevices.listForUser,
      { userId },
    )
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0]).toMatchObject({
      device: "iPhone · Safari",
      ipAddress: "41.158.0.1",
    })
    expect(result.devices).toEqual([
      expect.objectContaining({ kind: "ios", label: "iPhone de Awa" }),
    ])
    expect(JSON.stringify(result)).not.toMatch(/secret/)
  })
})
