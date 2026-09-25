import { describe, expect, test } from "bun:test"

import {
  administrationVerifyApiUrl,
  DEFAULT_ADMINISTRATION_VERIFY_API_URL,
  formatRetryDelay,
  formatVerificationCodeForDisplay,
  isFoundVerifyResult,
  normalizeVerificationCode,
  parseVerifyResponse,
  verifyEndpoints,
  verifyResultTitle,
} from "../apps/web/lib/official-act-verification"

const FOUND = {
  documentNumber: "MFP/CAB/2026/000001",
  typeLabel: "Lettre officielle",
  issuerName: "Ministère de la Fonction Publique",
  issuedAt: Date.UTC(2026, 8, 25, 9, 0),
  signed: true,
  signedAt: Date.UTC(2026, 8, 25, 10, 30),
  contentSha256Prefix: "0123456789ab",
}

describe("normalizeVerificationCode", () => {
  test("ramène une saisie humaine à la forme canonique", () => {
    expect(normalizeVerificationCode(" abcd-efgh-jkmn ")).toBe("ABCDEFGHJKMN")
    expect(normalizeVerificationCode("ABCD EFGH JKMN")).toBe("ABCDEFGHJKMN")
  })

  test("confond I et L avec 1, O avec 0, comme l'alphabet Crockford", () => {
    expect(normalizeVerificationCode("ILO0-ABCD-EFGH")).toBe("1100ABCDEFGH")
  })

  test("refuse une longueur ou un caractère hors alphabet", () => {
    expect(normalizeVerificationCode("")).toBeNull()
    expect(normalizeVerificationCode("ABCDEFGHJKM")).toBeNull()
    expect(normalizeVerificationCode("ABCDEFGHJKMNP")).toBeNull()
    expect(normalizeVerificationCode("ABCDEFGHJKMU")).toBeNull()
    expect(normalizeVerificationCode("../../etc/pas")).toBeNull()
  })

  test("s'affiche par groupes de quatre", () => {
    expect(formatVerificationCodeForDisplay("ABCDEFGHJKMN")).toBe("ABCD-EFGH-JKMN")
  })
})

describe("administrationVerifyApiUrl", () => {
  test("vise la production d'administration.ga sans réglage", () => {
    expect(administrationVerifyApiUrl({})).toBe(DEFAULT_ADMINISTRATION_VERIFY_API_URL)
  })

  test("accepte une origine https explicite, sans barre finale", () => {
    expect(
      administrationVerifyApiUrl({ ADMINISTRATION_VERIFY_API_URL: "https://recette.convex.site/" }),
    ).toBe("https://recette.convex.site")
  })

  test("accepte http seulement pour une recette locale", () => {
    expect(
      administrationVerifyApiUrl({ ADMINISTRATION_VERIFY_API_URL: "http://localhost:3420" }),
    ).toBe("http://localhost:3420")
  })

  test("ignore une valeur mal formée plutôt que d'interroger une adresse inventée", () => {
    for (const value of [
      "http://recette.convex.site",
      "http://localhost.attaquant.ga",
      "https://a.b/chemin",
      "pas une url",
      "  ",
    ]) {
      expect(administrationVerifyApiUrl({ ADMINISTRATION_VERIFY_API_URL: value })).toBe(
        DEFAULT_ADMINISTRATION_VERIFY_API_URL,
      )
    }
  })
})

describe("verifyEndpoints", () => {
  test("construit les deux routes publiques sur le code normalisé", () => {
    expect(verifyEndpoints("https://x.convex.site/", "abcd-efgh-jkmn")).toEqual({
      statusUrl: "https://x.convex.site/api/verify/ABCDEFGHJKMN",
      pdfUrl: "https://x.convex.site/api/verify/ABCDEFGHJKMN/document.pdf",
    })
  })

  test("ne construit rien pour un code mal formé", () => {
    expect(verifyEndpoints("https://x.convex.site", "nimporte")).toBeNull()
  })
})

describe("parseVerifyResponse", () => {
  test("lit un acte authentique", () => {
    const result = parseVerifyResponse(200, { status: "valid", ...FOUND })
    expect(result).toEqual({ kind: "valid", ...FOUND })
    expect(isFoundVerifyResult(result)).toBe(true)
    expect(verifyResultTitle(result)).toBe("Document authentique")
  })

  test("lit un acte révoqué avec sa date et son motif", () => {
    const revokedAt = Date.UTC(2026, 8, 26, 8, 0)
    const result = parseVerifyResponse(200, {
      status: "revoked",
      ...FOUND,
      revokedAt,
      revokedReason: "Erreur matérielle",
    })
    expect(result).toMatchObject({ kind: "revoked", revokedReason: "Erreur matérielle" })
    expect(verifyResultTitle(result)).toStartWith("Document RÉVOQUÉ le ")
  })

  test("lit un acte remplacé par un autre", () => {
    const result = parseVerifyResponse(200, {
      status: "superseded",
      ...FOUND,
      supersededByDocumentNumber: "MFP/CAB/2026/000002",
    })
    expect(verifyResultTitle(result)).toBe("Document REMPLACÉ par l'acte MFP/CAB/2026/000002")
  })

  test("distingue code inconnu, service indisponible et rafale", () => {
    expect(parseVerifyResponse(404, { status: "unknown" })).toEqual({ kind: "unknown" })
    expect(parseVerifyResponse(503, { status: "unavailable" })).toEqual({ kind: "unavailable" })
    expect(parseVerifyResponse(429, { retryAfterMs: 12_000 })).toEqual({
      kind: "rate_limited",
      retryAfterMs: 12_000,
    })
    expect(parseVerifyResponse(429, null)).toEqual({ kind: "rate_limited", retryAfterMs: 60_000 })
  })

  test("rend `error` pour toute réponse inattendue, sans lever", () => {
    expect(parseVerifyResponse(500, null)).toEqual({ kind: "error" })
    expect(parseVerifyResponse(200, "texte")).toEqual({ kind: "error" })
    expect(parseVerifyResponse(200, { status: "valid" })).toEqual({ kind: "error" })
    expect(parseVerifyResponse(200, { status: "autre", ...FOUND })).toEqual({ kind: "error" })
  })

  test("n'invente aucun champ facultatif absent", () => {
    const { signedAt: _signedAt, ...unsigned } = FOUND
    const result = parseVerifyResponse(200, { status: "valid", ...unsigned, signed: false })
    expect(result).toEqual({ kind: "valid", ...unsigned, signed: false })
  })
})

describe("formatRetryDelay", () => {
  test("arrondit au-dessus, jamais un délai plus court que le réel", () => {
    expect(formatRetryDelay(1)).toBe("1 seconde")
    expect(formatRetryDelay(12_000)).toBe("12 secondes")
    expect(formatRetryDelay(61_000)).toBe("2 minutes")
  })
})
