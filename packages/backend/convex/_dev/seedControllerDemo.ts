import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import type { Id } from "../_generated/dataModel"
import { internalAction, internalQuery } from "../_generated/server"
import { internalMutation } from "../functions"
import { findBetterAuthUserByEmail } from "../lib/incompleteSignup"

/**
 * Jeu de démonstration de l'espace contrôleur — DÉVELOPPEMENT UNIQUEMENT.
 *
 * Crée des personnes FICTIVES (noms gabonais plausibles, pièces « spécimen »
 * dessinées en SVG et marquées comme telles) pour exercer l'examen KYC,
 * l'agenda Niveau 3 et le contrôle terrain :
 *
 *   bunx convex run _dev/seedControllerDemo:seed '{"controllerEmail":"…"}'
 *   bunx convex run _dev/seedControllerDemo:reset
 *   bunx convex run _dev/seedControllerDemo:mintPresentation '{"person":"mireille"}'
 *
 * Toutes les lignes créées portent un `userId` préfixé `seed-ctrl-` : la
 * remise à zéro ne touche qu'elles, jamais un dossier réel. Le journal
 * d'audit, append-only, n'est jamais effacé. Refuse de tourner sur le
 * déploiement de production.
 */

const PREFIX = "seed-ctrl-"
const PRODUCTION_DEPLOYMENT = "flexible-panda-248"
const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function assertNotProduction() {
  const url = process.env.CONVEX_CLOUD_URL ?? ""
  if (url.includes(PRODUCTION_DEPLOYMENT)) {
    throw new ConvexError({
      code: "FORBIDDEN_IN_PRODUCTION",
      message: "Jeu de démonstration interdit sur le déploiement de production.",
    })
  }
}

type Gender = "M" | "F"
type Person = {
  key: string
  firstName: string
  lastName: string
  gender: Gender
  dateOfBirth: string
  birthPlace: string
  nip: string
  idnId: string
  skin: string
}

type Scenario =
  | {
      kind: "kyc_review"
      submittedAgo: number
      documentType: "cni_gabon" | "passport" | "residence_card"
      score?: number
      faceMatchScore?: number
      liveness?: "real" | "spoof" | "uncertain"
      ocrAvailable: boolean
      biometricAvailable: boolean
      /** Valeurs lues sur la pièce quand elles diffèrent du déclaré. */
      readOverrides?: Partial<Record<"lastName" | "firstName" | "dateOfBirth" | "birthPlace", string>>
      duplicate?: { signal: "nip" | "face" | "pivot"; with: string; score?: number }
      previousRejected?: { ago: number; reason: string }
    }
  | { kind: "kyc_complement"; submittedAgo: number; message: string; requestedAgo: number }
  | { kind: "l3_booked"; startsIn: number; durationMin: 30 | 45 | 60 }
  | { kind: "l3_waiting"; requestedAgo: number; documentsSubmitted: boolean }
  | { kind: "twin" }

const PEOPLE: Array<Person & { scenario: Scenario }> = [
  {
    key: "mireille", firstName: "Mireille", lastName: "Ndong Obiang", gender: "F",
    dateOfBirth: "1991-04-12", birthPlace: "Libreville", nip: "19910412004587", idnId: "GA-7MN4-K2QD", skin: "#8A5A3C",
    scenario: { kind: "kyc_review", submittedAgo: 2 * HOUR, documentType: "cni_gabon", score: 0.91, faceMatchScore: 0.88, liveness: "real", ocrAvailable: true, biometricAvailable: true },
  },
  {
    key: "jean-baptiste", firstName: "Jean-Baptiste", lastName: "Mba Ella", gender: "M",
    dateOfBirth: "1985-11-03", birthPlace: "Oyem", nip: "19851103011246", idnId: "GA-3PX8-W7RB", skin: "#6B4329",
    scenario: { kind: "kyc_review", submittedAgo: 20 * HOUR, documentType: "cni_gabon", score: 0.74, faceMatchScore: 0.81, liveness: "real", ocrAvailable: true, biometricAvailable: true, readOverrides: { dateOfBirth: "1985-11-08" }, previousRejected: { ago: 41 * DAY, reason: "Photo du recto floue, numéro de pièce illisible." } },
  },
  {
    key: "rodrigue", firstName: "Rodrigue", lastName: "Nzé Mintsa", gender: "M",
    dateOfBirth: "1979-02-28", birthPlace: "Bitam", nip: "19790228030918", idnId: "GA-9TQ2-H4LC", skin: "#5C3A24",
    scenario: { kind: "kyc_review", submittedAgo: 2 * DAY + 3 * HOUR, documentType: "cni_gabon", score: 0.86, faceMatchScore: 0.79, liveness: "real", ocrAvailable: true, biometricAvailable: true, duplicate: { signal: "nip", with: "rodrigue-twin" } },
  },
  {
    key: "prisca", firstName: "Prisca", lastName: "Moussavou", gender: "F",
    dateOfBirth: "1998-07-21", birthPlace: "Mouila", nip: "19980721052233", idnId: "GA-4KD7-P9XN", skin: "#9B6646",
    scenario: { kind: "kyc_review", submittedAgo: 4 * DAY + 6 * HOUR, documentType: "passport", score: 0.88, faceMatchScore: 0.92, liveness: "real", ocrAvailable: true, biometricAvailable: true, duplicate: { signal: "face", with: "prisca-twin", score: 0.71 } },
  },
  {
    key: "fabrice", firstName: "Fabrice", lastName: "Ondo Nguema", gender: "M",
    dateOfBirth: "1988-05-17", birthPlace: "Franceville", nip: "19880517061104", idnId: "GA-6WB3-T8FJ", skin: "#704530",
    scenario: { kind: "kyc_review", submittedAgo: 9 * DAY, documentType: "cni_gabon", ocrAvailable: false, biometricAvailable: true, faceMatchScore: 0.83, liveness: "uncertain" },
  },
  {
    key: "annick", firstName: "Annick", lastName: "Koumba Mbadinga", gender: "F",
    dateOfBirth: "1993-09-09", birthPlace: "Port-Gentil", nip: "19930909020571", idnId: "GA-2HV9-M3SK", skin: "#7E5034",
    scenario: { kind: "kyc_review", submittedAgo: 16 * DAY, documentType: "residence_card", score: 0.69, faceMatchScore: 0.77, liveness: "real", ocrAvailable: true, biometricAvailable: true },
  },
  {
    key: "herve", firstName: "Hervé", lastName: "Obame Essono", gender: "M",
    dateOfBirth: "1972-12-24", birthPlace: "Makokou", nip: "19721224070389", idnId: "GA-8RC5-N2VT", skin: "#4F3220",
    scenario: { kind: "kyc_complement", submittedAgo: 6 * DAY, requestedAgo: 3 * DAY, message: "Selfie trop sombre : reprenez-le face à une source de lumière." },
  },
  {
    key: "ghislain", firstName: "Ghislain", lastName: "Nzoghe", gender: "M",
    dateOfBirth: "1990-03-15", birthPlace: "Lambaréné", nip: "19900315041977", idnId: "GA-5JL6-Q8DW", skin: "#664029",
    scenario: { kind: "l3_booked", startsIn: 10 * MIN, durationMin: 30 },
  },
  {
    key: "estelle", firstName: "Estelle", lastName: "Mintsa Mi Nguema", gender: "F",
    dateOfBirth: "1995-06-30", birthPlace: "Oyem", nip: "19950630012468", idnId: "GA-1XF8-B6HR", skin: "#8F5D3F",
    scenario: { kind: "l3_booked", startsIn: DAY + 2 * HOUR, durationMin: 45 },
  },
  {
    key: "brice", firstName: "Brice", lastName: "Ekomie", gender: "M",
    dateOfBirth: "1983-08-02", birthPlace: "Mitzic", nip: "19830802093315", idnId: "GA-7DS2-L5KP", skin: "#5A3826",
    scenario: { kind: "l3_waiting", requestedAgo: 3 * DAY, documentsSubmitted: true },
  },
  {
    key: "laetitia", firstName: "Laetitia", lastName: "Boussougou", gender: "F",
    dateOfBirth: "2000-01-01", birthPlace: "Tchibanga", nip: "20000101084420", idnId: "GA-3QW7-C9MZ", skin: "#94603F",
    scenario: { kind: "l3_waiting", requestedAgo: 30 * HOUR, documentsSubmitted: false },
  },
  // Comptes « en regard » des signaux de doublon : vérifiés de longue date.
  {
    key: "rodrigue-twin", firstName: "Rodrigue", lastName: "Nze Minsta", gender: "M",
    dateOfBirth: "1979-02-28", birthPlace: "Bitam", nip: "19790228030918", idnId: "GA-4BN6-R1TX", skin: "#5C3A24",
    scenario: { kind: "twin" },
  },
  {
    key: "prisca-twin", firstName: "Prisca", lastName: "Moussavou Ibinga", gender: "F",
    dateOfBirth: "1998-07-12", birthPlace: "Mouila", nip: "19980712058801", idnId: "GA-9MK3-V4QS", skin: "#9B6646",
    scenario: { kind: "twin" },
  },
]

// ── Pièces « spécimen » ────────────────────────────────────────────────────

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function frDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}.${m}.${y}`
}

const FONT = "font-family=\"Helvetica, Arial, sans-serif\""

function silhouette(x: number, y: number, w: number, h: number, skin: string): string {
  const cx = x + w / 2
  return [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#DCD8CB"/>`,
    `<ellipse cx="${cx}" cy="${y + h * 0.4}" rx="${w * 0.22}" ry="${h * 0.2}" fill="${skin}"/>`,
    `<path d="M ${x + w * 0.12} ${y + h} Q ${cx} ${y + h * 0.52} ${x + w * 0.88} ${y + h} Z" fill="#3A3D2E"/>`,
  ].join("")
}

function cardFront(p: Person, read: Record<string, string>, documentType: string): string {
  const title =
    documentType === "passport"
      ? "PASSEPORT"
      : documentType === "residence_card"
        ? "CARTE DE SÉJOUR"
        : "CARTE NATIONALE D'IDENTITÉ"
  const field = (label: string, value: string, y: number) =>
    `<text x="280" y="${y}" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">${esc(label)}</text>` +
    `<text x="280" y="${y + 28}" ${FONT} font-size="24" font-weight="600" fill="#16170F">${esc(value)}</text>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
<rect width="856" height="540" rx="28" fill="#F4F1E6"/>
<rect width="856" height="14" fill="#0E7C3A"/><rect y="14" width="856" height="8" fill="#F2C811"/><rect y="22" width="856" height="8" fill="#2563AC"/>
<text x="40" y="76" ${FONT} font-size="22" font-weight="700" fill="#16170F">RÉPUBLIQUE GABONAISE</text>
<text x="40" y="102" ${FONT} font-size="15" fill="#3A3D2E" letter-spacing="1">${esc(title)}</text>
${silhouette(40, 130, 200, 256, p.skin)}
${field("NOM", read.lastName!.toUpperCase(), 150)}
${field("PRÉNOMS", read.firstName!, 214)}
${field("NÉ(E) LE", frDate(read.dateOfBirth!), 278)}
${field("À", read.birthPlace!, 342)}
<text x="600" y="278" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">SEXE</text>
<text x="600" y="306" ${FONT} font-size="24" font-weight="600" fill="#16170F">${p.gender}</text>
<text x="40" y="430" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">NIP</text>
<text x="40" y="460" font-family="Courier New, monospace" font-size="26" font-weight="700" fill="#16170F">${esc(p.nip)}</text>
<text x="428" y="300" text-anchor="middle" transform="rotate(-16 428 300)" ${FONT} font-size="88" font-weight="700" fill="#B3261E" fill-opacity="0.13">SPÉCIMEN</text>
<text x="816" y="512" text-anchor="end" ${FONT} font-size="12" fill="#5E6058">DONNÉES FICTIVES · ENVIRONNEMENT DE DÉVELOPPEMENT</text>
</svg>`
}

function cardBack(p: Person, read: Record<string, string>): string {
  const surname = read.lastName!.toUpperCase().normalize("NFD").replace(/[^A-Z ]/g, "").replaceAll(" ", "<")
  const given = read.firstName!.toUpperCase().normalize("NFD").replace(/[^A-Z-]/g, "").replaceAll("-", "<")
  const dob = read.dateOfBirth!.replaceAll("-", "").slice(2)
  const line1 = `IDGAB${p.nip}`.padEnd(30, "<").slice(0, 30)
  const line2 = `${dob}7${p.gender}3409129GAB`.padEnd(30, "<").slice(0, 30)
  const line3 = `${surname}<<${given}`.padEnd(30, "<").slice(0, 30)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="856" height="540" viewBox="0 0 856 540">
<rect width="856" height="540" rx="28" fill="#F4F1E6"/>
<text x="40" y="70" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">ADRESSE</text>
<text x="40" y="98" ${FONT} font-size="22" fill="#16170F">${esc(read.birthPlace!)}, Gabon</text>
<text x="40" y="146" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">DÉLIVRÉE LE</text>
<text x="40" y="174" ${FONT} font-size="22" fill="#16170F">12.09.2024</text>
<text x="320" y="146" ${FONT} font-size="13" fill="#5E6058" letter-spacing="1.5">EXPIRE LE</text>
<text x="320" y="174" ${FONT} font-size="22" fill="#16170F">${esc(read.expiresOn ? frDate(read.expiresOn) : "11.09.2034")}</text>
<text x="428" y="270" text-anchor="middle" transform="rotate(-16 428 270)" ${FONT} font-size="88" font-weight="700" fill="#B3261E" fill-opacity="0.13">SPÉCIMEN</text>
<rect x="24" y="360" width="808" height="150" rx="8" fill="#FFFFFF"/>
<text x="44" y="404" font-family="Courier New, monospace" font-size="30" fill="#16170F" letter-spacing="3">${esc(line1)}</text>
<text x="44" y="446" font-family="Courier New, monospace" font-size="30" fill="#16170F" letter-spacing="3">${esc(line2)}</text>
<text x="44" y="488" font-family="Courier New, monospace" font-size="30" fill="#16170F" letter-spacing="3">${esc(line3)}</text>
</svg>`
}

function selfie(p: Person): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760" viewBox="0 0 600 760">
<rect width="600" height="760" fill="#E6E4DD"/>
<ellipse cx="300" cy="300" rx="128" ry="160" fill="${p.skin}"/>
<path d="M 60 760 Q 300 470 540 760 Z" fill="#2C3128"/>
<rect x="20" y="20" width="250" height="34" rx="6" fill="#16170F" fill-opacity="0.72"/>
<text x="34" y="43" ${FONT} font-size="15" fill="#FFFFFF" letter-spacing="1">SELFIE · PHOTO FICTIVE</text>
</svg>`
}

function readValues(p: Person, overrides?: Partial<Record<string, string>>): Record<string, string> {
  return {
    lastName: p.lastName,
    firstName: p.firstName,
    dateOfBirth: p.dateOfBirth,
    birthPlace: p.birthPlace,
    gender: p.gender,
    nationality: "GA",
    expiresOn: "2034-09-11",
    ...overrides,
  } as Record<string, string>
}

// ── Seed ────────────────────────────────────────────────────────────────────

export const _controller = internalQuery({
  args: { email: v.string() },
  returns: v.union(v.null(), v.object({ userId: v.string(), isController: v.boolean() })),
  handler: async (ctx, args) => {
    const user = await findBetterAuthUserByEmail(ctx, args.email.trim().toLowerCase())
    if (!user) return null
    const roles = await ctx.db
      .query("userRole")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(10)
    return {
      userId: user._id,
      isController: roles.some((r) => r.role === "identity_controller" && !r.revokedAt),
    }
  },
})

export const seed = internalAction({
  args: { controllerEmail: v.string() },
  returns: v.object({ people: v.number(), kyc: v.number(), level3: v.number() }),
  handler: async (ctx, args): Promise<{ people: number; kyc: number; level3: number }> => {
    assertNotProduction()
    const controller: { userId: string; isController: boolean } | null = await ctx.runQuery(
      internal._dev.seedControllerDemo._controller,
      { email: args.controllerEmail },
    )
    if (!controller?.isController) {
      throw new ConvexError({ code: "NOT_A_CONTROLLER", message: "Compte contrôleur introuvable." })
    }

    const images: Array<{ key: string; front: Id<"_storage">; back: Id<"_storage">; selfie: Id<"_storage"> }> = []
    for (const person of PEOPLE) {
      const scenario = person.scenario
      const read = readValues(person, scenario.kind === "kyc_review" ? scenario.readOverrides : undefined)
      const documentType = scenario.kind === "kyc_review" ? scenario.documentType : "cni_gabon"
      const store = (svg: string) => ctx.storage.store(new Blob([svg], { type: "image/svg+xml" }))
      images.push({
        key: person.key,
        front: await store(cardFront(person, read, documentType)),
        back: await store(cardBack(person, read)),
        selfie: await store(selfie(person)),
      })
    }
    return await ctx.runMutation(internal._dev.seedControllerDemo._insert, {
      controllerId: controller.userId,
      images,
    })
  },
})

export const _insert = internalMutation({
  args: {
    controllerId: v.string(),
    images: v.array(
      v.object({ key: v.string(), front: v.id("_storage"), back: v.id("_storage"), selfie: v.id("_storage") }),
    ),
  },
  returns: v.object({ people: v.number(), kyc: v.number(), level3: v.number() }),
  handler: async (ctx, args) => {
    assertNotProduction()
    const existing = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", `${PREFIX}mireille`))
      .unique()
    if (existing) {
      throw new ConvexError({
        code: "ALREADY_SEEDED",
        message: "Jeu déjà présent : lancez d'abord _dev/seedControllerDemo:reset.",
      })
    }

    const now = Date.now()
    const imagesOf = new Map(args.images.map((i) => [i.key, i]))
    let kycCount = 0
    let level3Count = 0
    const kycByPerson = new Map<string, Id<"kycRequest">>()

    for (const person of PEOPLE) {
      const userId = `${PREFIX}${person.key}`
      const scenario = person.scenario
      const isTwin = scenario.kind === "twin"
      await ctx.db.insert("userProfile", {
        userId,
        profileType: "citizen",
        loa: isTwin ? 2 : 1,
        idnId: person.idnId,
        pivot: {
          firstName: person.firstName,
          lastName: person.lastName,
          dateOfBirth: person.dateOfBirth,
          gender: person.gender,
          birthPlace: person.birthPlace,
          nationality: "GA",
          nip: person.nip,
        },
        nipKey: person.nip,
        createdAt: now - (isTwin ? 400 : 60) * DAY,
        updatedAt: now,
      })
      // Aucun e-mail ni push : ces comptes n'existent que pour la démonstration.
      await ctx.db.insert("notificationPreference", {
        userId,
        email: { security: false, kyc: false, consent: false, comms: false },
        inApp: { security: true, kyc: true, consent: true, comms: true },
        updatedAt: now,
      })

      const img = imagesOf.get(person.key)!
      const audit = async (action: "kyc_submitted" | "kyc_under_review" | "kyc_rejected" | "kyc_complement_requested", targetId: string, at: number, actorId?: string, metadata?: Record<string, unknown>) => {
        await ctx.db.insert("auditLog", { actorId, action, targetType: "kyc", targetId, metadata, createdAt: at })
      }

      if (scenario.kind === "kyc_review" || scenario.kind === "kyc_complement") {
        const submittedAt = now - scenario.submittedAgo
        if (scenario.kind === "kyc_review" && scenario.previousRejected) {
          const at = now - scenario.previousRejected.ago
          const previous = await ctx.db.insert("kycRequest", {
            userId,
            documentType: "cni_gabon",
            documentImages: {},
            status: "rejected",
            reviewerId: `${PREFIX}reviewer`,
            reviewedAt: at + 5 * HOUR,
            rejectionReason: scenario.previousRejected.reason,
            submittedAt: at,
            createdAt: at,
            updatedAt: at + 5 * HOUR,
          })
          await audit("kyc_submitted", previous, at, userId)
          await audit("kyc_rejected", previous, at + 5 * HOUR, `${PREFIX}reviewer`, { reason: scenario.previousRejected.reason })
        }
        const read = readValues(person, scenario.kind === "kyc_review" ? scenario.readOverrides : undefined)
        const kycId = await ctx.db.insert("kycRequest", {
          userId,
          documentType: scenario.kind === "kyc_review" ? scenario.documentType : "cni_gabon",
          documentImages: { front: img.front, back: img.back },
          selfieImage: img.selfie,
          status: scenario.kind === "kyc_review" ? "under_review" : "complement_required",
          ...(scenario.kind === "kyc_review"
            ? {
                score: scenario.score,
                faceMatchScore: scenario.faceMatchScore,
                livenessVerdict: scenario.liveness,
                ocrAvailable: scenario.ocrAvailable,
                biometricAvailable: scenario.biometricAvailable,
                duplicateFlagged: scenario.duplicate ? true : undefined,
                extractedFields: scenario.ocrAvailable
                  ? {
                      lastName: read.lastName!,
                      firstName: read.firstName!,
                      dateOfBirth: read.dateOfBirth!,
                      birthPlace: read.birthPlace!,
                      gender: read.gender!,
                      nationality: read.nationality!,
                      expiresOn: read.expiresOn!,
                    }
                  : undefined,
              }
            : {
                score: 0.82,
                faceMatchScore: 0.58,
                livenessVerdict: "uncertain" as const,
                ocrAvailable: true,
                biometricAvailable: true,
                reviewerId: `${PREFIX}reviewer`,
                complementRequest: {
                  message: scenario.message,
                  requestedAt: now - scenario.requestedAgo,
                  requestedBy: `${PREFIX}reviewer`,
                },
              }),
          submittedAt,
          createdAt: submittedAt - 10 * MIN,
          updatedAt: now,
        })
        kycByPerson.set(person.key, kycId)
        kycCount++
        await audit("kyc_submitted", kycId, submittedAt, userId)
        await audit("kyc_under_review", kycId, submittedAt + 2 * MIN)
        if (scenario.kind === "kyc_complement") {
          await audit("kyc_complement_requested", kycId, now - scenario.requestedAgo, `${PREFIX}reviewer`, { message: scenario.message })
        }
      }

      if (scenario.kind === "l3_booked" || scenario.kind === "l3_waiting") {
        const requestedAt = scenario.kind === "l3_waiting" ? now - scenario.requestedAgo : now - 5 * DAY
        const documentsSubmitted = scenario.kind === "l3_booked" || scenario.documentsSubmitted
        const kycId = await ctx.db.insert("kycRequest", {
          userId,
          documentType: "cni_gabon",
          documentImages: documentsSubmitted ? { front: img.front, back: img.back } : {},
          selfieImage: documentsSubmitted ? img.selfie : undefined,
          status: documentsSubmitted ? "submitted" : "pending",
          submittedAt: documentsSubmitted ? requestedAt + 20 * MIN : undefined,
          createdAt: requestedAt,
          updatedAt: now,
        })
        const verificationId = await ctx.db.insert("level3Verification", {
          userId,
          status: "waiting_controller",
          roomName: "pending",
          kycRequestId: kycId,
          entryLoa: 1,
          requestedAt,
          updatedAt: now,
        })
        level3Count++
        if (scenario.kind === "l3_booked") {
          const startsAt = now + scenario.startsIn
          const endsAt = startsAt + scenario.durationMin * MIN
          const slotId = await ctx.db.insert("level3AppointmentSlot", {
            controllerId: args.controllerId,
            startsAt,
            endsAt,
            status: "booked",
            verificationId,
            bookedUserId: userId,
            createdAt: now,
            updatedAt: now,
          })
          await ctx.db.patch(verificationId, {
            roomName: `idn-l3-${verificationId}`,
            status: "claimed",
            controllerId: args.controllerId,
            handledVia: "controller_app",
            appointmentSlotId: slotId,
            scheduledAt: startsAt,
            scheduledEndAt: endsAt,
            claimedAt: now - 2 * DAY,
          })
        } else {
          await ctx.db.patch(verificationId, { roomName: `idn-l3-${verificationId}` })
        }
      }
    }

    // Signaux de doublon, levés comme le ferait le pipeline.
    for (const person of PEOPLE) {
      const scenario = person.scenario
      if (scenario.kind !== "kyc_review" || !scenario.duplicate) continue
      const twin = PEOPLE.find((p) => p.key === scenario.duplicate!.with)!
      await ctx.db.insert("duplicateSignal", {
        userId: `${PREFIX}${person.key}`,
        matchedUserId: `${PREFIX}${twin.key}`,
        signal: scenario.duplicate.signal,
        groupKey: scenario.duplicate.signal === "nip" ? person.nip : "",
        score: scenario.duplicate.score,
        sourceKycRequestId: kycByPerson.get(person.key),
        status: "open",
        detectedAt: now - scenario.submittedAgo + 3 * MIN,
      })
    }

    return { people: PEOPLE.length, kyc: kycCount, level3: level3Count }
  },
})

/** Supprime le jeu de démonstration (et lui seul). Le journal d'audit est conservé. */
export const reset = internalMutation({
  args: {},
  returns: v.object({ deleted: v.number() }),
  handler: async (ctx) => {
    assertNotProduction()
    let deleted = 0
    for (const person of [...PEOPLE.map((p) => p.key), "reviewer"]) {
      const userId = `${PREFIX}${person}`
      for (const row of await ctx.db
        .query("kycRequest")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(20)) {
        for (const file of [row.documentImages.front, row.documentImages.back, row.selfieImage]) {
          if (file) await ctx.storage.delete(file)
        }
        for (const review of await ctx.db
          .query("kycReview")
          .withIndex("by_kycRequest", (q) => q.eq("kycRequestId", row._id))
          .take(20)) {
          await ctx.db.delete(review._id)
        }
        await ctx.db.delete(row._id)
        deleted++
      }
      for (const row of await ctx.db
        .query("level3Verification")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(20)) {
        for (const slot of await ctx.db
          .query("level3AppointmentSlot")
          .withIndex("by_verificationId", (q) => q.eq("verificationId", row._id))
          .take(20)) {
          await ctx.db.delete(slot._id)
        }
        for (const review of await ctx.db
          .query("level3Review")
          .withIndex("by_verificationId", (q) => q.eq("verificationId", row._id))
          .take(20)) {
          await ctx.db.delete(review._id)
        }
        await ctx.db.delete(row._id)
        deleted++
      }
      for (const row of await ctx.db
        .query("duplicateSignal")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(20)) {
        await ctx.db.delete(row._id)
      }
      for (const row of await ctx.db
        .query("notification")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(200)) {
        await ctx.db.delete(row._id)
      }
      for (const row of await ctx.db
        .query("notificationPreference")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .take(5)) {
        await ctx.db.delete(row._id)
      }
      const profile = await ctx.db
        .query("userProfile")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique()
      if (profile) {
        await ctx.db.delete(profile._id)
        deleted++
      }
    }
    return { deleted }
  },
})

// ── QR de présentation d'une personne fictive (test du contrôle terrain) ────

export const _presentationPayload = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      idn: v.string(), fn: v.string(), ln: v.string(), dob: v.string(),
      pt: v.string(), loa: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfile")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique()
    if (!profile?.idnId || !profile.pivot) return null
    return {
      idn: profile.idnId,
      fn: profile.pivot.firstName,
      ln: profile.pivot.lastName,
      dob: profile.pivot.dateOfBirth,
      pt: profile.profileType,
      loa: profile.loa,
    }
  },
})

function base64url(bytes: Uint8Array): string {
  let s = ""
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!)
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

/**
 * Jeton `idn:p1:` valide 30 s pour une personne FICTIVE du jeu, signé avec
 * la même clé que `presentation.mintToken` — c'est ce que l'app mobile
 * afficherait en QR. Réservé aux `userId` du jeu de démonstration.
 */
export const mintPresentation = internalAction({
  args: { person: v.string(), ttlMs: v.optional(v.number()) },
  returns: v.object({ token: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args): Promise<{ token: string; expiresAt: number }> => {
    assertNotProduction()
    const userId = `${PREFIX}${args.person}`
    const payload: { idn: string; fn: string; ln: string; dob: string; pt: string; loa: number } | null =
      await ctx.runQuery(internal._dev.seedControllerDemo._presentationPayload, { userId })
    if (!payload) throw new ConvexError({ code: "NOT_FOUND", message: "Personne fictive introuvable." })
    const key = process.env.PRESENTATION_HMAC_KEY
    if (!key) throw new ConvexError({ code: "CONFIG_MISSING", message: "PRESENTATION_HMAC_KEY absente." })
    const now = Date.now()
    const exp = now + Math.min(Math.max(args.ttlMs ?? 30_000, 1_000), 120_000)
    const encoded = base64url(
      new TextEncoder().encode(JSON.stringify({ v: 1, uid: userId, ...payload, iat: now, exp })),
    )
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(key),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(encoded))
    return { token: `idn:p1:${encoded}.${base64url(new Uint8Array(sig))}`, expiresAt: exp }
  },
})
