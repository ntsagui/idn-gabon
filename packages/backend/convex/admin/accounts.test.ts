/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { ConvexError } from "convex/values"
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api, components } from "../_generated/api"
import { usersByLoa, usersByProfile } from "../aggregates"
import schema from "../schema"

const modules = import.meta.glob("/convex/**/*.ts")

/**
 * CE QUI EST EN JEU : l'admin dispose de deux actions destructrices sur un
 * compte citoyen, et elles ne se distinguent que par ce qu'elles laissent
 * derrière elles. Anonymiser garde le compte Better Auth vivant — le handle
 * @idn.ga reste donc réservé. Supprimer le détruit — le handle redevient
 * attribuable. Si cette différence s'efface, les deux boutons de la console
 * mentent sur ce qu'ils font, et l'admin qui voulait libérer un handle de
 * doublon croira l'avoir fait.
 *
 * Ces tests verrouillent aussi les garde-fous : la console admin ne doit pas
 * pouvoir se saborder elle-même, et un journal d'audit qui ne dit plus QUI a
 * été supprimé ne vaut rien (conservation 5 ans, loi 001/2011).
 */

const ADMIN = "admin_1"

vi.mock("../lib/auth", async () => {
  const { ConvexError: CE } = await import("convex/values")
  const authUser = async (ctx: {
    auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
  }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new CE({ code: "UNAUTHENTICATED", message: "Connexion requise." })
    }
    return {
      userId: identity.subject,
      email: `${identity.subject}@example.ga`,
      emailVerified: true,
      roles: identity.subject.startsWith("admin_") ? ["admin"] : [],
    }
  }
  return {
    requireAuth: authUser,
    requireVerifiedAuth: authUser,
    getCurrentAuthUser: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      try {
        return await authUser(ctx)
      } catch {
        return null
      }
    },
    requireAdmin: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      const user = await authUser(ctx)
      if (!user.roles.includes("admin")) {
        throw new CE({ code: "FORBIDDEN", message: "Accès refusé." })
      }
      return user
    },
  }
})

// `revokeAllSessions` passe par `authComponent.getAuth(createAuth, ctx)`,
// qui monte tout Better Auth (OIDC, JWT, trusted origins) — hors de portée
// de convex-test. On mocke la révocation : ce que ces tests vérifient est
// ce qui reste en base après la purge, pas la mécanique de session.
vi.mock("../auth", async () => {
  const actual = await vi.importActual<typeof import("../auth")>("../auth")
  return {
    ...actual,
    authComponent: {
      ...actual.authComponent,
      getAuth: async () => ({
        auth: { api: { revokeSession: async () => undefined } },
        headers: new Headers(),
      }),
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

/** Citoyen complet : compte Better Auth + profil + pivot. */
async function seedCitizen(
  t: ReturnType<typeof convexTest>,
  opts: { handle: string; idnId: string; loa?: 1 | 2 | 3 },
) {
  const now = Date.now()
  const email = `${opts.handle}@idn.ga`
  const userId = await t.run(async (ctx) => {
    const created = (await ctx.runMutation(
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
    const profileId = await ctx.db.insert("userProfile", {
      userId: created._id,
      profileType: "citizen",
      loa: opts.loa ?? 2,
      idnId: opts.idnId,
      pivot: {
        firstName: "Jean",
        lastName: "Mbadinga",
        dateOfBirth: "1990-01-02",
        gender: "M",
        birthPlace: "Libreville",
        nationality: "GA",
      },
      createdAt: now,
      updatedAt: now,
    })
    // `t.run` écrit hors des wrappers de functions.ts : sans ces deux appels
    // les agrégats resteraient à zéro et le test de décrémentation ne
    // mesurerait rien.
    const doc = (await ctx.db.get(profileId))!
    await usersByLoa.insertIfDoesNotExist(ctx, doc)
    await usersByProfile.insertIfDoesNotExist(ctx, doc)
    return created._id
  })
  return { userId, email, idnId: opts.idnId }
}

/**
 * Agent contrôleur : citoyen portant le rôle `identity_controller`. Le code
 * provisoire de mot de passe ne sert que les comptes qui se connectent par mot
 * de passe (`lib/signInMethods.ts`) ; un citoyen sans rôle se le voit refuser
 * (`RECOVERY_METHOD_NOT_USED`, verrouillé par `recoveryMethods.test.ts`). Sur
 * un tel compte, le cas du mauvais identifiant buterait sur le moyen de
 * connexion avant d'atteindre la confirmation, et ne prouverait plus rien.
 */
async function seedController(
  t: ReturnType<typeof convexTest>,
  opts: { handle: string; idnId: string },
) {
  const account = await seedCitizen(t, opts)
  await t.run((ctx) =>
    ctx.db.insert("userRole", {
      userId: account.userId,
      role: "identity_controller",
      assignedBy: ADMIN,
      assignedAt: Date.now(),
    }),
  )
  return account
}

describe("suppression d'un compte par l'admin", () => {
  test("la suppression définitive libère le handle @idn.ga, l'anonymisation non", async () => {
    // POURQUOI : c'est la seule différence observable entre les deux actions
    // et la raison d'être de leur coexistence. Si elle disparaît, la console
    // propose deux boutons pour un même effet.
    const t = makeTestClient()
    const soft = await seedCitizen(t, { handle: "soft", idnId: "GA-0001-0001" })
    const hard = await seedCitizen(t, { handle: "hard", idnId: "GA-0002-0002" })
    const asAdmin = t.withIdentity({ subject: ADMIN })

    await asAdmin.mutation(api.admin.accounts.anonymizeUser, {
      userId: soft.userId,
      confirmIdnId: soft.idnId,
    })
    await asAdmin.mutation(api.admin.accounts.deleteUserPermanently, {
      userId: hard.userId,
      confirmIdnId: hard.idnId,
    })

    expect(
      await t.query(api.onboarding.checkIdnHandleAvailability, {
        handle: "soft",
      }),
    ).toEqual({ handle: "soft", available: false })

    expect(
      await t.query(api.onboarding.checkIdnHandleAvailability, {
        handle: "hard",
      }),
    ).toEqual({ handle: "hard", available: true })
  })

  test("la suppression définitive décrémente l'agrégat des comptes", async () => {
    // POURQUOI : la mutation doit passer par le wrapper à triggers de
    // functions.ts. Écrite avec `_generated/server`, elle supprimerait la
    // ligne sans décrémenter `usersByLoa` — et le tableau de bord admin
    // afficherait un total faux, sans erreur nulle part pour le signaler.
    const t = makeTestClient()
    const citizen = await seedCitizen(t, {
      handle: "compte",
      idnId: "GA-0003-0003",
    })

    const before = await t.run((ctx) => usersByLoa.count(ctx))

    await t.withIdentity({ subject: ADMIN }).mutation(
      api.admin.accounts.deleteUserPermanently,
      { userId: citizen.userId, confirmIdnId: citizen.idnId },
    )

    expect(await t.run((ctx) => usersByLoa.count(ctx))).toBe(before - 1)
  })

  test("le journal d'audit conserve l'email et l'IDN du compte supprimé", async () => {
    // POURQUOI : après un hard delete, l'auditLog est la SEULE trace. S'il ne
    // porte que l'identifiant technique Better Auth — qui n'existe plus — le
    // journal ne permet plus de répondre à « quel compte a été supprimé ? »,
    // ce qui vide de sens la conservation 5 ans (loi 001/2011).
    const t = makeTestClient()
    const citizen = await seedCitizen(t, {
      handle: "trace",
      idnId: "GA-0004-0004",
    })

    await t.withIdentity({ subject: ADMIN }).mutation(
      api.admin.accounts.deleteUserPermanently,
      {
        userId: citizen.userId,
        confirmIdnId: citizen.idnId,
        reason: "doublon",
      },
    )

    const entry = await t.run(async (ctx) => {
      const rows = await ctx.db.query("auditLog").collect()
      return rows.find((r) => r.metadata?.kind === "account_hard_deleted")
    })

    expect(entry?.actorId).toBe(ADMIN)
    expect(entry?.metadata?.email).toBe(citizen.email)
    expect(entry?.metadata?.idnId).toBe("GA-0004-0004")
    expect(entry?.metadata?.reason).toBe("doublon")
  })

  test("un identifiant de confirmation erroné bloque la suppression", async () => {
    // POURQUOI : l'action est irréversible et la liste affiche des lignes
    // voisines. Sans revérification serveur, un clic sur la mauvaise ligne
    // supprime le mauvais citoyen — la modale seule ne protège de rien.
    const t = makeTestClient()
    const citizen = await seedCitizen(t, {
      handle: "protege",
      idnId: "GA-0005-0005",
    })

    await expect(
      t.withIdentity({ subject: ADMIN }).mutation(
        api.admin.accounts.deleteUserPermanently,
        { userId: citizen.userId, confirmIdnId: "GA-9999-9999" },
      ),
    ).rejects.toThrow(ConvexError)

    const stillThere = await t.run((ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", citizen.userId))
        .unique(),
    )
    expect(stillThere).not.toBeNull()
  })

  test("un admin ne peut supprimer ni son propre compte ni celui d'un autre admin", async () => {
    // POURQUOI : verrouillage de la console. Un admin qui se supprime, ou qui
    // supprime le dernier de ses pairs, laisse la plateforme sans personne
    // pour rétablir les habilitations.
    const t = makeTestClient()
    const peer = await seedCitizen(t, { handle: "pair", idnId: "GA-0007-0007" })

    await t.run(async (ctx) => {
      await ctx.db.insert("userRole", {
        userId: peer.userId,
        role: "admin",
        assignedBy: ADMIN,
        assignedAt: Date.now(),
      })
    })

    const asAdmin = t.withIdentity({ subject: ADMIN })

    // Le sujet de l'identité EST le userId côté requireAdmin : viser ADMIN,
    // c'est se viser soi-même.
    await expect(
      asAdmin.mutation(api.admin.accounts.deleteUserPermanently, {
        userId: ADMIN,
        confirmIdnId: "peu importe",
      }),
    ).rejects.toThrow(/propre compte/)

    await expect(
      asAdmin.mutation(api.admin.accounts.deleteUserPermanently, {
        userId: peer.userId,
        confirmIdnId: peer.idnId,
      }),
    ).rejects.toThrow(/administrateur/)

    // Et le pair est toujours là.
    const stillThere = await t.run((ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", peer.userId))
        .unique(),
    )
    expect(stillThere).not.toBeNull()
  })

  test("un compte anonymisé disparaît de la liste des comptes", async () => {
    // POURQUOI : la purge RGPD vide le pivot. Une ligne sans nom ni email
    // dans /users n'apprend rien à l'admin et brouille le comptage réel.
    const t = makeTestClient()
    const citizen = await seedCitizen(t, {
      handle: "efface",
      idnId: "GA-0008-0008",
    })
    const asAdmin = t.withIdentity({ subject: ADMIN })

    await asAdmin.mutation(api.admin.accounts.anonymizeUser, {
      userId: citizen.userId,
      confirmIdnId: citizen.idnId,
    })

    const listed = await asAdmin.query(api.admin.users.listProfiles, {
      page: 0,
      pageSize: 50,
    })
    expect(listed.rows.map((r) => r.userId)).not.toContain(citizen.userId)
  })
})

describe("code provisoire de réinitialisation", () => {
  test("génère un code à six chiffres compatible avec Better Auth sans le stocker en clair", async () => {
    const t = makeTestClient()
    const controller = await seedController(t, {
      handle: "recuperation",
      idnId: "GA-0010-0010",
    })
    const before = Date.now()

    const issued = await t
      .withIdentity({ subject: ADMIN })
      .action(api.admin.accounts.generatePasswordResetCode, {
        userId: controller.userId,
        confirmIdentifier: controller.idnId,
      })

    expect(issued.code).toMatch(/^\d{6}$/)
    expect(issued.expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000)
    expect(issued.expiresAt).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000)

    const records = await t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "verification",
        where: [
          {
            field: "identifier",
            value: `forget-password-otp-${controller.email}`,
            operator: "eq",
          },
        ],
        paginationOpts: { numItems: 10, cursor: null },
      }),
    )
    expect(records.page).toHaveLength(1)
    expect(records.page[0]?.value).toMatch(/^[A-Za-z0-9_-]{43}:0$/)
    expect(records.page[0]?.value).not.toContain(issued.code)

    const audit = await t.run((ctx) =>
      ctx.db
        .query("auditLog")
        .withIndex("by_target", (q) =>
          q.eq("targetType", "user").eq("targetId", controller.userId),
        )
        .order("desc")
        .first(),
    )
    expect(audit).toMatchObject({
      actorId: ADMIN,
      action: "admin_action",
      metadata: {
        kind: "password_reset_code_issued",
        channel: "admin_manual",
      },
    })
    expect(audit?.metadata).not.toHaveProperty("code")
  })

  test("une nouvelle génération invalide le code précédent", async () => {
    const t = makeTestClient()
    const controller = await seedController(t, {
      handle: "rotation",
      idnId: "GA-0011-0011",
    })
    const asAdmin = t.withIdentity({ subject: ADMIN })
    const args = {
      userId: controller.userId,
      confirmIdentifier: controller.idnId,
    }

    await asAdmin.action(api.admin.accounts.generatePasswordResetCode, args)
    await asAdmin.action(api.admin.accounts.generatePasswordResetCode, args)

    const records = await t.run((ctx) =>
      ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: "verification",
        where: [
          {
            field: "identifier",
            value: `forget-password-otp-${controller.email}`,
            operator: "eq",
          },
        ],
        paginationOpts: { numItems: 10, cursor: null },
      }),
    )
    expect(records.page).toHaveLength(1)
  })

  test("bloque un mauvais identifiant de confirmation et les non-admins", async () => {
    const t = makeTestClient()
    const controller = await seedController(t, {
      handle: "protege-reset",
      idnId: "GA-0012-0012",
    })
    const args = {
      userId: controller.userId,
      confirmIdentifier: "GA-9999-9999",
    }

    await expect(
      t
        .withIdentity({ subject: ADMIN })
        .action(api.admin.accounts.generatePasswordResetCode, args),
    ).rejects.toThrow(/correspond pas/)

    await expect(
      t
        .withIdentity({ subject: "citizen_1" })
        .action(api.admin.accounts.generatePasswordResetCode, {
          ...args,
          confirmIdentifier: controller.idnId,
        }),
    ).rejects.toThrow(/refusé/)
  })

  test("refuse de délivrer un code pour un autre administrateur", async () => {
    const t = makeTestClient()
    const peer = await seedCitizen(t, {
      handle: "admin-reset",
      idnId: "GA-0013-0013",
    })
    await t.run((ctx) =>
      ctx.db.insert("userRole", {
        userId: peer.userId,
        role: "admin",
        assignedBy: ADMIN,
        assignedAt: Date.now(),
      }),
    )

    await expect(
      t
        .withIdentity({ subject: ADMIN })
        .action(api.admin.accounts.generatePasswordResetCode, {
          userId: peer.userId,
          confirmIdentifier: peer.idnId,
        }),
    ).rejects.toThrow(/procédure renforcée/)
  })
})
