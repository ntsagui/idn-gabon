/// <reference types="vite/client" />
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { makeFunctionReference } from "convex/server"
import { convexTest } from "convex-test"
import { expect, test } from "vitest"

import schema from "../schema"
import {
  isPhoneRegistryReady,
  isPhoneUsedByAnotherProfile,
} from "../lib/phoneRegistry"

const modules = import.meta.glob("/convex/**/*.ts")
const migrate = makeFunctionReference<
  "mutation",
  { cursor?: string | null },
  { scanned: number; patched: number; done: boolean; nextCursor: string | null }
>("_dev/backfillPhoneKey:run")

test("migre toutes les pages sans perdre les doublons historiques ni les profils sans numéro", async () => {
  const t = convexTest(schema, modules)
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  const ids = await t.run(async (ctx) => {
    const ids = []
    for (let i = 0; i < 205; i++) {
      ids.push(
        await ctx.db.insert("userProfile", {
          userId: `historical-${i}`,
          profileType: "citizen",
          loa: 1,
          ...(i < 5
            ? {
                pivot: {
                  firstName: "Historique",
                  lastName: `Test${i}`,
                  dateOfBirth: "1990-01-02",
                  gender: "F" as const,
                  birthPlace: "Libreville",
                  nationality: i === 2 ? "FR" : "GA",
                  phone: [
                    "06 22 14 89",
                    "+241 06 22 14 89",
                    "06 12 34 56 78",
                    "invalide",
                    "07 11 22 33",
                  ][i],
                },
              }
            : {}),
          ...(i === 4 ? { deletedAt: 1, phoneKey: "+24107112233" } : {}),
          createdAt: i,
          updatedAt: i,
        }),
      )
    }
    return ids
  })
  expect(await t.run(isPhoneRegistryReady)).toBe(false)
  const first = await t.mutation(migrate, {})
  expect(first).toMatchObject({ scanned: 200, patched: 200, done: false })
  expect(await t.run(isPhoneRegistryReady)).toBe(false)
  const last = await t.mutation(migrate, { cursor: first.nextCursor })
  expect(last).toMatchObject({
    scanned: 5,
    patched: 5,
    done: true,
    nextCursor: null,
  })
  expect(await t.run(isPhoneRegistryReady)).toBe(true)

  const profiles = await t.run(async (ctx) =>
    Promise.all(ids.slice(0, 6).map((id) => ctx.db.get(id))),
  )
  expect(profiles.map((p) => p?.phoneKey)).toEqual([
    "+24106221489",
    "+24106221489",
    "+33612345678",
    null,
    undefined,
    null,
  ])
  expect(
    await t.run((ctx) =>
      isPhoneUsedByAnotherProfile(ctx, "+24106221489", ids[0]),
    ),
  ).toBe(true)
  expect(
    await t.run((ctx) =>
      isPhoneUsedByAnotherProfile(ctx, "+33612345678", ids[2]),
    ),
  ).toBe(false)

  const repeat = await t.mutation(migrate, {})
  const repeatLast = await t.mutation(migrate, { cursor: repeat.nextCursor })
  expect(repeat.patched + repeatLast.patched).toBe(0)
})
