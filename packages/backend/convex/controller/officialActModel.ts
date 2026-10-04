/**
 * Vérification d'un acte officiel de l'administration gabonaise — règles
 * PURES, côté backend, pour l'outil « Vérifier signature » du contrôleur.
 *
 * Même source que le lecteur public d'identite.ga
 * (`apps/web/lib/official-act-verification.ts`, commit 0fb7516), elle-même
 * copie assumée du modèle d'administration.ga. Le contrôleur vérifie côté
 * SERVEUR (action Convex) pour que l'issue inscrite à son historique soit
 * celle réellement rendue par l'émetteur, pas celle qu'un navigateur
 * prétendrait avoir reçue. Toute évolution du format du code ou de la réponse
 * publique se reporte dans les deux copies.
 */

/** 12 caractères de l'alphabet Crockford base32 (sans I, L, O ni U). */
const VERIFICATION_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{12}$/

/**
 * Saisie humaine ou contenu de QR ramené à la forme canonique : majuscules,
 * sans espaces ni tirets, `I`/`L` → `1`, `O` → `0`. `null` si ce n'est pas un
 * code bien formé : aucune requête ne part jamais sur une chaîne arbitraire.
 */
export function normalizeVerificationCode(raw: string): string | null {
  const canonical = raw
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0")
  return VERIFICATION_CODE_PATTERN.test(canonical) ? canonical : null
}

/**
 * Le QR d'un acte porte l'URL `https://<hôte>/verifier/<code>` ; la saisie
 * manuelle porte le code seul. Accepte les deux et rend le code canonique.
 */
export function codeFromInput(input: string): string | null {
  const trimmed = input.trim()
  const fromUrl = trimmed.match(/\/verifier\/([^/?#\s]+)/i)
  return normalizeVerificationCode(fromUrl ? decodeURIComponent(fromUrl[1]!) : trimmed)
}

/** `ABCDEFGHJKMN` → `ABCD-EFGH-JKMN`. */
export function formatVerificationCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code
}

/** Backend de PRODUCTION d'administration.ga, routes publiques sans session. */
export const DEFAULT_ADMINISTRATION_VERIFY_API_URL = "https://charming-hare-796.convex.site"

const API_ORIGIN_PATTERN = /^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?)\/?$/

/** `ADMINISTRATION_VERIFY_API_URL` si posée et bien formée (origine seule), sinon la production. */
export function administrationVerifyApiUrl(env: Record<string, string | undefined>): string {
  const explicit = env.ADMINISTRATION_VERIFY_API_URL?.trim()
  if (explicit && API_ORIGIN_PATTERN.test(explicit)) return explicit.replace(/\/+$/, "")
  return DEFAULT_ADMINISTRATION_VERIFY_API_URL
}

export function verifyEndpoints(apiBaseUrl: string, code: string) {
  const base = apiBaseUrl.trim().replace(/\/+$/, "")
  return {
    statusUrl: `${base}/api/verify/${code}`,
    pdfUrl: `${base}/api/verify/${code}/document.pdf`,
  }
}

type FoundActFields = {
  documentNumber: string
  typeLabel: string
  issuerName: string
  issuedAt: number
  signed: boolean
  signedAt?: number
  contentSha256Prefix: string
}

export type VerifyResult =
  | ({ kind: "valid" } & FoundActFields)
  | ({ kind: "revoked"; revokedAt?: number; revokedReason?: string } & FoundActFields)
  | ({ kind: "superseded"; revokedAt?: number; supersededByDocumentNumber?: string } & FoundActFields)
  | { kind: "unknown" }
  | { kind: "unavailable" }
  | { kind: "rate_limited"; retryAfterMs: number }
  | { kind: "error" }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readFoundFields(body: Record<string, unknown>): FoundActFields | null {
  if (
    typeof body.documentNumber !== "string" ||
    typeof body.typeLabel !== "string" ||
    typeof body.issuerName !== "string" ||
    typeof body.issuedAt !== "number" ||
    typeof body.signed !== "boolean" ||
    typeof body.contentSha256Prefix !== "string"
  ) {
    return null
  }
  return {
    documentNumber: body.documentNumber,
    typeLabel: body.typeLabel,
    issuerName: body.issuerName,
    issuedAt: body.issuedAt,
    signed: body.signed,
    contentSha256Prefix: body.contentSha256Prefix,
    ...(typeof body.signedAt === "number" ? { signedAt: body.signedAt } : {}),
  }
}

/**
 * Lit la réponse de `GET …/api/verify/<code>` : 200 + statut trouvé, 404 code
 * inconnu, 503 indisponible, 429 rafale. Toute autre forme devient `error`.
 */
export function parseVerifyResponse(httpStatus: number, body: unknown): VerifyResult {
  if (httpStatus === 429) {
    const retryAfterMs =
      isRecord(body) && typeof body.retryAfterMs === "number" && body.retryAfterMs > 0
        ? body.retryAfterMs
        : 60_000
    return { kind: "rate_limited", retryAfterMs }
  }
  if (httpStatus === 503) return { kind: "unavailable" }
  if (httpStatus === 404) return { kind: "unknown" }
  if (httpStatus !== 200 || !isRecord(body)) return { kind: "error" }

  if (body.status === "unknown") return { kind: "unknown" }
  if (body.status === "unavailable") return { kind: "unavailable" }
  if (body.status !== "valid" && body.status !== "revoked" && body.status !== "superseded") {
    return { kind: "error" }
  }
  const fields = readFoundFields(body)
  if (!fields) return { kind: "error" }

  if (body.status === "valid") return { kind: "valid", ...fields }
  if (body.status === "revoked") {
    return {
      kind: "revoked",
      ...fields,
      ...(typeof body.revokedAt === "number" ? { revokedAt: body.revokedAt } : {}),
      ...(typeof body.revokedReason === "string" ? { revokedReason: body.revokedReason } : {}),
    }
  }
  return {
    kind: "superseded",
    ...fields,
    ...(typeof body.revokedAt === "number" ? { revokedAt: body.revokedAt } : {}),
    ...(typeof body.supersededByDocumentNumber === "string"
      ? { supersededByDocumentNumber: body.supersededByDocumentNumber }
      : {}),
  }
}

/**
 * Une issue n'entre à l'historique que si l'émetteur a réellement statué
 * sur le code. Une panne réseau ou une rafale ne sont pas des vérifications.
 */
export function isDefinitiveResult(result: VerifyResult): boolean {
  return (
    result.kind === "valid" ||
    result.kind === "revoked" ||
    result.kind === "superseded" ||
    result.kind === "unknown"
  )
}
