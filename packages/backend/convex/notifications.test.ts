/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, expect, test, vi } from "vitest"

import { api } from "./_generated/api"
import schema from "./schema"

const modules = import.meta.glob("/convex/**/*.ts")

/**
 * `clearAll` s'authentifie via `requireAuth` (convex/lib/auth.ts), qui
 * délègue en prod à la session Better Auth — hors de portée de convex-test
 * (cf. documents.test.ts). On le stub pour dériver l'identité de
 * `ctx.auth.getUserIdentity()`, piloté par `t.withIdentity({ subject })`.
 */
vi.mock("./lib/auth", async () => {
  const { ConvexError } = await import("convex/values")
  return {
    requireAuth: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity) {
        throw new ConvexError({
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
    },
  }
})

// `notifications.ts` importe `authComponent` pour les dispatchers (email du
// destinataire) : rien de tout cela n'est exercé ici, et monter Better Auth
// coûte plusieurs minutes sur certaines machines.
vi.mock("./auth", () => ({
  authComponent: { getAnyUserById: async () => null },
}))

function makeTestClient() {
  return convexTest(schema, modules)
}
// Via `makeTestClient`, pas `typeof convexTest` : le générique du schéma
// serait perdu et `withIndex` dans `t.run` ne connaîtrait plus les index.
type TestClient = ReturnType<typeof makeTestClient>

const CITIZEN = "citizen_big"
const NEIGHBOUR = "citizen_other"
/** Horodatage de référence des seeds — arbitraire mais stable. */
const T0 = 1_700_000_000_000

async function seed(
  t: TestClient,
  rows: {
    userId: string
    title: string
    createdAt: number
    deletedAt?: number
  }[],
) {
  await t.run(async (ctx) => {
    for (const row of rows) {
      await ctx.db.insert("notification", {
        ...row,
        channel: "in_app",
        category: "system",
        body: "—",
      })
    }
  })
}

async function loadAll(t: TestClient, userId: string) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("notification")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect(),
  )
}

describe("« Tout effacer » du centre de notifications", () => {
  test("efface tout au-delà de 200 notifications, sans toucher aux autres citoyens", async () => {
    // POURQUOI : la première version bouclait sur `.paginate({ numItems: 200 })`.
    // Convex n'autorise qu'UN appel paginé par exécution de fonction : la
    // deuxième page levait une erreur serveur, et le bouton échouait pour
    // tout citoyen ayant plus de 200 notifications — ceux qui en avaient le
    // plus besoin. `convex-test` n'émule pas cette limite ; le test fixe
    // donc le comportement attendu à cette échelle : 1 203 notifications,
    // soit trois passes de `CLEAR_BATCH` (500) — la première dans l'appel,
    // les suivantes replanifiées — avec des paquets de sept émises à la
    // même milliseconde pour que les frontières de lot tombent au milieu
    // d'ex æquo.
    const t = makeTestClient()
    const LIVE = 1203
    await seed(
      t,
      Array.from({ length: LIVE }, (_, i) => ({
        userId: CITIZEN,
        title: `Notification ${i}`,
        createdAt: T0 + Math.floor(i / 7),
      })),
    )
    // Déjà effacées avant le clic : leur date d'effacement doit survivre.
    await seed(
      t,
      [0, 1, 2].map((i) => ({
        userId: CITIZEN,
        title: `Déjà effacée ${i}`,
        createdAt: T0 - 1000 + i,
        deletedAt: T0 - 500,
      })),
    )
    // Un voisin : ses notifications ne sont pas concernées.
    await seed(
      t,
      [0, 1, 2, 3].map((i) => ({
        userId: NEIGHBOUR,
        title: `Voisin ${i}`,
        createdAt: T0 + i,
      })),
    )

    const citizen = t.withIdentity({ subject: CITIZEN })
    vi.useFakeTimers()
    try {
      await citizen.mutation(api.notifications.clearAll, {})
      // Arrivée entre le clic et la fin des passes replanifiées : le citoyen
      // ne l'a jamais vue, elle doit rester.
      await seed(t, [
        {
          userId: CITIZEN,
          title: "Arrivée pendant l'effacement",
          createdAt: T0 + 10_000,
        },
      ])
      await t.finishAllScheduledFunctions(vi.runAllTimers)
    } finally {
      vi.useRealTimers()
    }

    const mine = await loadAll(t, CITIZEN)
    expect(mine).toHaveLength(LIVE + 3 + 1)

    const cleared = mine.filter((n) => n.title.startsWith("Notification "))
    expect(cleared).toHaveLength(LIVE)
    expect(cleared.every((n) => n.deletedAt !== undefined)).toBe(true)
    // Un seul clic = une seule date d'effacement, même sur trois passes.
    expect(new Set(cleared.map((n) => n.deletedAt)).size).toBe(1)

    expect(
      mine
        .filter((n) => n.title.startsWith("Déjà effacée"))
        .map((n) => n.deletedAt),
    ).toEqual([T0 - 500, T0 - 500, T0 - 500])
    expect(
      mine.find((n) => n.title === "Arrivée pendant l'effacement")?.deletedAt,
    ).toBeUndefined()

    const neighbour = await loadAll(t, NEIGHBOUR)
    expect(neighbour).toHaveLength(4)
    expect(neighbour.every((n) => n.deletedAt === undefined)).toBe(true)

    // Vue citoyen : le centre ne montre plus que la nouvelle venue.
    const visible = await citizen.query(api.notifications.listMine, {})
    expect(visible.map((n) => n.title)).toEqual([
      "Arrivée pendant l'effacement",
    ])

    // Trois passes : deux continuations replanifiées, toutes abouties — la
    // preuve que le volume a bien été découpé, et pas avalé en une seule
    // transaction qui dépasserait les limites Convex.
    const scheduled = await t.run(async (ctx) =>
      ctx.db.system.query("_scheduled_functions").collect(),
    )
    expect(scheduled.map((job) => job.state.kind)).toEqual([
      "success",
      "success",
    ])
  })

  test("exige une session", async () => {
    const t = makeTestClient()
    await expect(t.mutation(api.notifications.clearAll, {})).rejects.toThrow(
      /connecté/,
    )
  })
})
