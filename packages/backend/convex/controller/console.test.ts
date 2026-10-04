/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { register as registerAggregate } from "@convex-dev/aggregate/test"
import { afterEach, describe, expect, test, vi } from "vitest"

import { api, internal } from "../_generated/api"
import schema from "../schema"
import { codeFromInput, isDefinitiveResult, parseVerifyResponse } from "./officialActModel"

/**
 * Console contrôleur : ce que ces tests verrouillent, et pourquoi.
 *
 * - Les compteurs de l'interface (pastille, en-tête, liste) doivent dire la
 *   même chose : un agent qui lit « 4 en attente » au-dessus de 2 dossiers
 *   cesse de faire confiance à l'outil.
 * - L'agenda ne doit jamais planifier un entretien que le contrôleur ne
 *   pourrait pas instruire (pièces non soumises), ni toucher au créneau d'un
 *   autre contrôleur ; annuler un rendez-vous ne doit pas clore la demande.
 * - La photo d'un titulaire n'est rendue qu'après un contrôle réel de SON
 *   jeton par CE contrôleur — sinon un identifiant IDN suffirait.
 * - L'historique ne compte qu'une fois une approbation issue d'un entretien.
 * - La vérification d'acte n'inscrit au journal que des issues rendues par
 *   l'émetteur, jamais une panne réseau.
 * - Le jeu de démonstration se retire sans toucher aux dossiers réels.
 */

vi.mock("../lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/auth")>()
  const { ConvexError: CE } = await import("convex/values")
  return {
    ...original,
    requireController: async (ctx: {
      auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
    }) => {
      const identity = await ctx.auth.getUserIdentity()
      if (!identity) throw new CE({ code: "UNAUTHENTICATED", message: "Vous devez être connecté." })
      return { userId: identity.subject, email: "", emailVerified: true, roles: ["identity_controller"] }
    },
  }
})

const modules = import.meta.glob("/convex/**/*.ts")

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerAggregate(t, "kycByStatus")
  registerAggregate(t, "usersByLoa")
  registerAggregate(t, "usersByProfile")
  return t
}

type T = ReturnType<typeof makeTestClient>
const CTRL = "controller_a"
const OTHER = "controller_b"
const MIN = 60_000

async function citizen(t: T, userId: string, opts: { loa?: 1 | 2 | 3; idnId?: string } = {}) {
  const now = Date.now()
  await t.run(async (ctx) => {
    await ctx.db.insert("userProfile", {
      userId,
      profileType: "citizen",
      loa: opts.loa ?? 1,
      idnId: opts.idnId,
      pivot: {
        firstName: "Awa",
        lastName: "Mboumba",
        dateOfBirth: "1990-01-01",
        gender: "F",
        birthPlace: "Libreville",
        nationality: "GA",
      },
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("notificationPreference", {
      userId,
      email: { security: false, kyc: false, consent: false, comms: false },
      inApp: { security: true, kyc: true, consent: true, comms: true },
      updatedAt: now,
    })
  })
}

async function kyc(t: T, userId: string, status: "under_review" | "submitted" | "pending") {
  const now = Date.now()
  return await t.run((ctx) =>
    ctx.db.insert("kycRequest", {
      userId,
      documentType: "cni_gabon",
      documentImages: {},
      status,
      submittedAt: now - 2 * 24 * 60 * MIN,
      createdAt: now,
      updatedAt: now,
    }),
  )
}

async function waitingLevel3(t: T, userId: string, kycRequestId?: string) {
  const now = Date.now()
  return await t.run(async (ctx) =>
    ctx.db.insert("level3Verification", {
      userId,
      status: "waiting_controller",
      roomName: "room",
      kycRequestId: kycRequestId ? ctx.db.normalizeId("kycRequest", kycRequestId)! : undefined,
      entryLoa: 1,
      requestedAt: now,
      updatedAt: now,
    }),
  )
}

async function slot(t: T, controllerId: string, startsIn: number) {
  const now = Date.now()
  return await t.run((ctx) =>
    ctx.db.insert("level3AppointmentSlot", {
      controllerId,
      startsAt: now + startsIn,
      endsAt: now + startsIn + 30 * MIN,
      status: "available",
      createdAt: now,
      updatedAt: now,
    }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("compteurs cohérents", () => {
  test("la pastille et l'en-tête comptent exactement la liste par défaut, sans les demandes Niveau 3", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    await citizen(t, "c2")
    await citizen(t, "c3")
    await kyc(t, "c1", "under_review")
    await kyc(t, "c2", "under_review")
    await waitingLevel3(t, "c3")
    await waitingLevel3(t, "c3")
    const asCtrl = t.withIdentity({ subject: CTRL })

    const counts = await asCtrl.query(api.controller.dashboard.counts, {})
    const list = await asCtrl.query(api.controller.queue.listForReview, {
      status: "under_review",
      page: 0,
      pageSize: 20,
    })
    expect(counts.queue).toBe(2)
    expect(list.total).toBe(counts.queue)

    const summary = await asCtrl.query(api.controller.dashboard.summary, {})
    expect(summary.queue.toReview).toBe(2)
    expect(summary.queue.byAge.d1to3).toBe(2)
    expect(summary.level3.waitingForSlot).toBe(2)
  })
})

describe("ordre de la file", () => {
  test("la file se lit du dépôt le plus ancien au plus récent, quel que soit l'ordre de création", async () => {
    const t = makeTestClient()
    const now = Date.now()
    for (const [userId, ageDays] of [["recent", 0.1], ["ancien", 16], ["moyen", 4]] as const) {
      await citizen(t, userId)
      await t.run((ctx) =>
        ctx.db.insert("kycRequest", {
          userId,
          documentType: "cni_gabon",
          documentImages: {},
          status: "under_review",
          submittedAt: now - ageDays * 24 * 60 * MIN,
          createdAt: now,
          updatedAt: now,
        }),
      )
    }
    const list = await t.withIdentity({ subject: CTRL }).query(api.controller.queue.listForReview, {
      status: "under_review",
      page: 0,
      pageSize: 20,
    })
    const order = await t.run(async (ctx) =>
      Promise.all(list.items.map(async (item) => (await ctx.db.get(item._id))!.userId)),
    )
    expect(order).toEqual(["ancien", "moyen", "recent"])
  })
})

describe("agenda : planifier et annuler", () => {
  test("planifier une demande sur son créneau la prend en charge et notifie le citoyen", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    const kycId = await kyc(t, "c1", "submitted")
    const verificationId = await waitingLevel3(t, "c1", kycId)
    const slotId = await slot(t, CTRL, 60 * MIN)

    await t.withIdentity({ subject: CTRL }).mutation(api.controller.agenda.assignSlot, {
      verificationId,
      slotId,
    })

    const [verification, booked, notifications] = await t.run(async (ctx) => [
      await ctx.db.get(verificationId),
      await ctx.db.get(slotId),
      await ctx.db.query("notification").collect(),
    ])
    expect(verification?.status).toBe("claimed")
    expect(verification?.controllerId).toBe(CTRL)
    expect(booked?.status).toBe("booked")
    expect(booked?.verificationId).toBe(verificationId)
    expect(notifications.some((n) => n.userId === "c1")).toBe(true)
  })

  test("refuse de planifier un entretien dont les pièces ne sont pas soumises", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    const kycId = await kyc(t, "c1", "pending")
    const verificationId = await waitingLevel3(t, "c1", kycId)
    const slotId = await slot(t, CTRL, 60 * MIN)

    await expect(
      t.withIdentity({ subject: CTRL }).mutation(api.controller.agenda.assignSlot, {
        verificationId,
        slotId,
      }),
    ).rejects.toThrow(/pièces/)
    const unchanged = await t.run((ctx) => ctx.db.get(slotId))
    expect(unchanged?.status).toBe("available")
  })

  test("refuse d'utiliser le créneau d'un autre contrôleur", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    const kycId = await kyc(t, "c1", "submitted")
    const verificationId = await waitingLevel3(t, "c1", kycId)
    const slotId = await slot(t, OTHER, 60 * MIN)
    await expect(
      t.withIdentity({ subject: CTRL }).mutation(api.controller.agenda.assignSlot, {
        verificationId,
        slotId,
      }),
    ).rejects.toThrow(/introuvable/)
  })

  test("annuler un rendez-vous rend la demande à la file d'attente, retire le créneau et trace le motif", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    const kycId = await kyc(t, "c1", "submitted")
    const verificationId = await waitingLevel3(t, "c1", kycId)
    const slotId = await slot(t, CTRL, 3 * 60 * MIN)
    const asCtrl = t.withIdentity({ subject: CTRL })
    await asCtrl.mutation(api.controller.agenda.assignSlot, { verificationId, slotId })

    await expect(
      asCtrl.mutation(api.controller.agenda.cancelAppointment, { verificationId, reason: "non" }),
    ).rejects.toThrow(/motif/)

    await asCtrl.mutation(api.controller.agenda.cancelAppointment, {
      verificationId,
      reason: "Contrôleur indisponible ce jour-là",
    })
    const [verification, cancelled, audit] = await t.run(async (ctx) => [
      await ctx.db.get(verificationId),
      await ctx.db.get(slotId),
      await ctx.db
        .query("auditLog")
        .withIndex("by_action", (q) => q.eq("action", "level3_appointment_cancelled"))
        .collect(),
    ])
    expect(verification?.status).toBe("waiting_controller")
    expect(verification?.controllerId).toBeUndefined()
    expect(verification?.scheduledAt).toBeUndefined()
    expect(cancelled?.status).toBe("cancelled")
    expect(audit).toHaveLength(1)
    expect(audit[0]!.metadata?.reason).toBe("Contrôleur indisponible ce jour-là")
  })

  test("de bout en bout : entretien planifié, ouvert puis validé → le citoyen passe au Niveau 3", async () => {
    const t = makeTestClient()
    await citizen(t, "c1")
    const kycId = await kyc(t, "c1", "submitted")
    const verificationId = await waitingLevel3(t, "c1", kycId)
    const slotId = await slot(t, CTRL, 5 * MIN)
    const asCtrl = t.withIdentity({ subject: CTRL })

    await asCtrl.mutation(api.controller.agenda.assignSlot, { verificationId, slotId })
    const room = await asCtrl.query(api.controller.agenda.interview, { verificationId })
    expect(room?.canJoin).toBe(true)
    expect(room?.assignedToMe).toBe(true)

    await asCtrl.mutation(api.level3.beginInterview, { verificationId })
    await expect(
      asCtrl.mutation(api.controller.agenda.cancelAppointment, {
        verificationId,
        reason: "Changement d'avis",
      }),
    ).rejects.toThrow(/décision/)
    await asCtrl.mutation(api.level3.approve, { verificationId })

    const profile = await t.run((ctx) =>
      ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "c1"))
        .unique(),
    )
    expect(profile?.loa).toBe(3)
    const history = await asCtrl.query(api.controller.activity.list, {})
    // La piste documentaire approuvée par l'entretien n'est pas une seconde décision.
    expect(history.rows.map((r) => r.label)).toEqual([
      "Niveau 3 accordé",
      "Entretien vidéo ouvert",
      "Rendez-vous planifié",
    ])
  })
})

describe("contrôle terrain : photo du titulaire", () => {
  test("rien sans contrôle préalable ; la photo après le contrôle de CE contrôleur seulement", async () => {
    const t = makeTestClient()
    await citizen(t, "c1", { loa: 2, idnId: "GA-AAAA-BBBB" })
    const photo = await t.run(async (ctx) => {
      const id = await ctx.storage.store(new Blob(["x"], { type: "image/png" }))
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", "c1"))
        .unique()
      await ctx.db.patch(profile!._id, { photoStorageRef: id })
      return id
    })
    expect(photo).toBeTruthy()
    const asCtrl = t.withIdentity({ subject: CTRL })
    expect(await asCtrl.query(api.controller.scan.holder, { idnId: "GA-AAAA-BBBB" })).toBeNull()

    await t.mutation(internal.audit.recordAudit, {
      actorId: OTHER,
      action: "identity_check_performed",
      targetType: "user",
      targetId: "c1",
      metadata: { idnId: "GA-AAAA-BBBB", loa: 2 },
    })
    expect(await asCtrl.query(api.controller.scan.holder, { idnId: "GA-AAAA-BBBB" })).toBeNull()

    await t.mutation(internal.audit.recordAudit, {
      actorId: CTRL,
      action: "identity_check_performed",
      targetType: "user",
      targetId: "c1",
      metadata: { idnId: "GA-AAAA-BBBB", loa: 2 },
    })
    const holder = await asCtrl.query(api.controller.scan.holder, { idnId: "GA-AAAA-BBBB" })
    expect(holder?.photoSource).toBe("profile")
    expect(holder?.photoUrl).toBeTruthy()
    expect(holder?.currentLoa).toBe(2)
    expect(holder?.accountState).toBe("active")
  })
})

describe("historique filtrable", () => {
  test("filtre par type et par issue sur les actions du contrôleur courant uniquement", async () => {
    const t = makeTestClient()
    await citizen(t, "c1", { idnId: "GA-AAAA-BBBB" })
    const kycId = await kyc(t, "c1", "under_review")
    const record = (actorId: string, action: "kyc_rejected" | "identity_check_performed" | "signature_verified", targetId: string, metadata: Record<string, unknown>) =>
      t.mutation(internal.audit.recordAudit, {
        actorId,
        action,
        targetType: action === "signature_verified" ? "document" : action === "kyc_rejected" ? "kyc" : "user",
        targetId,
        metadata,
      })
    await record(CTRL, "kyc_rejected", kycId, { reason: "Pièce expirée" })
    await record(CTRL, "identity_check_performed", "c1", { idnId: "GA-AAAA-BBBB", location: "Aéroport" })
    await record(CTRL, "signature_verified", "ABCDEFGHJKMN", { kind: "valid", documentNumber: "N° 12/2026" })
    await record(OTHER, "identity_check_performed", "c1", { idnId: "GA-AAAA-BBBB" })
    const asCtrl = t.withIdentity({ subject: CTRL })

    const all = await asCtrl.query(api.controller.activity.list, {})
    expect(all.rows).toHaveLength(3)
    const scans = await asCtrl.query(api.controller.activity.list, { type: "scan" })
    expect(scans.rows).toHaveLength(1)
    expect(scans.rows[0]!.subject).toBe("Awa Mboumba")
    expect(scans.rows[0]!.location).toBe("Aéroport")
    const rejected = await asCtrl.query(api.controller.activity.list, { outcome: "rejected" })
    expect(rejected.rows.map((r) => r.detail)).toEqual(["Pièce expirée"])
    const future = await asCtrl.query(api.controller.activity.list, { from: Date.now() + 60 * MIN })
    expect(future.rows).toHaveLength(0)
  })
})

describe("vérification d'un acte officiel", () => {
  test("lecture du code : saisie libre, tirets, confusions I/L/O, URL du QR", () => {
    expect(codeFromInput("abcd-efgh-jkmn")).toBe("ABCDEFGHJKMN")
    expect(codeFromInput("ABCD EFGH JKMO")).toBe("ABCDEFGHJKM0")
    expect(codeFromInput("https://identite.ga/verifier/ABCD-EFGH-JKMN?x=1")).toBe("ABCDEFGHJKMN")
    expect(codeFromInput("ABCDEFGHJKMNU")).toBeNull()
    expect(codeFromInput("<script>")).toBeNull()
  })

  test("seules les issues rendues par l'émetteur sont des vérifications", () => {
    expect(isDefinitiveResult(parseVerifyResponse(404, null))).toBe(true)
    expect(isDefinitiveResult(parseVerifyResponse(503, null))).toBe(false)
    expect(isDefinitiveResult(parseVerifyResponse(429, { retryAfterMs: 5000 }))).toBe(false)
    expect(parseVerifyResponse(200, { status: "valid" }).kind).toBe("error")
  })

  test("un acte authentique est inscrit au journal avec son émetteur", async () => {
    const t = makeTestClient()
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: "valid",
            documentNumber: "N° 0412/MINT/SG",
            typeLabel: "Note de service",
            issuerName: "Ministère de l'Intérieur",
            issuedAt: 1_780_000_000_000,
            signed: true,
            signedAt: 1_780_000_100_000,
            contentSha256Prefix: "9f2c41ab",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    )
    const result = await t
      .withIdentity({ subject: CTRL })
      .action(api.controller.officialActs.verify, { input: "https://identite.ga/verifier/abcd-efgh-jkmn" })
    expect(result.result.kind).toBe("valid")
    expect(result.displayCode).toBe("ABCD-EFGH-JKMN")
    expect(result.pdfUrl).toMatch(/\/api\/verify\/ABCDEFGHJKMN\/document\.pdf$/)
    const audit = await t.run((ctx) =>
      ctx.db.query("auditLog").withIndex("by_action", (q) => q.eq("action", "signature_verified")).collect(),
    )
    expect(audit).toHaveLength(1)
    expect(audit[0]!.actorId).toBe(CTRL)
    expect(audit[0]!.metadata?.issuerName).toBe("Ministère de l'Intérieur")
  })

  test("une panne réseau n'est pas inscrite comme vérification", async () => {
    const t = makeTestClient()
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("network down")
    }))
    const result = await t
      .withIdentity({ subject: CTRL })
      .action(api.controller.officialActs.verify, { input: "ABCDEFGHJKMN" })
    expect(result.result.kind).toBe("unavailable")
    const audit = await t.run((ctx) => ctx.db.query("auditLog").collect())
    expect(audit).toHaveLength(0)
  })

  test("un code mal formé est refusé sans requête", async () => {
    const t = makeTestClient()
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await expect(
      t.withIdentity({ subject: CTRL }).action(api.controller.officialActs.verify, { input: "pas un code" }),
    ).rejects.toThrow(/code de vérification/)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe("jeu de démonstration", () => {
  test("reset retire le jeu et lui seul", async () => {
    const t = makeTestClient()
    await citizen(t, "real-citizen")
    const realKyc = await kyc(t, "real-citizen", "under_review")
    const images = await t.run(async (ctx) => {
      const store = () => ctx.storage.store(new Blob(["<svg/>"], { type: "image/svg+xml" }))
      const keys = [
        "mireille", "jean-baptiste", "rodrigue", "prisca", "fabrice", "annick", "herve",
        "ghislain", "estelle", "brice", "laetitia", "rodrigue-twin", "prisca-twin",
      ]
      const out = []
      for (const key of keys) out.push({ key, front: await store(), back: await store(), selfie: await store() })
      return out
    })
    const created = await t.mutation(internal._dev.seedControllerDemo._insert, {
      controllerId: CTRL,
      images,
    })
    expect(created.kyc).toBe(7)
    const counts = await t.withIdentity({ subject: CTRL }).query(api.controller.dashboard.counts, {})
    expect(counts.queue).toBe(7) // 6 dossiers du jeu + le dossier réel
    const summary = await t.withIdentity({ subject: CTRL }).query(api.controller.dashboard.summary, {})
    expect(summary.level3.upcoming.map((a) => a.name)).toEqual(["Ghislain Nzoghe", "Estelle Mintsa Mi Nguema"])

    await t.mutation(internal._dev.seedControllerDemo.reset, {})
    const [kycs, profiles, slots] = await t.run(async (ctx) => [
      await ctx.db.query("kycRequest").collect(),
      await ctx.db.query("userProfile").collect(),
      await ctx.db.query("level3AppointmentSlot").collect(),
    ])
    expect(kycs.map((k) => k._id)).toEqual([realKyc])
    expect(profiles.map((p) => p.userId)).toEqual(["real-citizen"])
    expect(slots).toHaveLength(0)
  })
})
