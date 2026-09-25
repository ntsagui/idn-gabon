/**
 * Vérification d'un acte officiel de l'administration gabonaise — règles
 * PURES du lecteur public d'identite.ga (`/verifier/<code>`).
 *
 * Les actes officiels (lettres, notes, communiqués…) sont émis par la
 * plateforme administration.ga (ADR-0187 de son socle) : chacun porte un QR
 * code vers `/verifier/<code>` et un code de 12 caractères imprimé dessous.
 * La plateforme expose deux routes HTTP publiques, sans session :
 *   - `GET <api>/api/verify/<code>`              → fiche d'authenticité JSON ;
 *   - `GET <api>/api/verify/<code>/document.pdf` → le PDF A4 tel qu'émis.
 *
 * Copie minimale et ASSUMÉE du modèle d'administration.ga
 * (`socle/convex/modules/officialDocuments/model.ts` pour le code,
 * `socle/packages/agent-features/src/features/official-documents/
 * verification-model.ts` pour la réponse) : identite.ga est un dépôt et un
 * backend distincts, il n'importe rien du socle. Toute évolution du format du
 * code ou de la réponse publique là-bas se reporte ici.
 *
 * Aucune donnée personnelle : la route publique n'en rend aucune.
 */

/** 12 caractères de l'alphabet Crockford base32 (sans I, L, O ni U). */
const VERIFICATION_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{12}$/

/**
 * Ce qu'un humain a saisi ou ce qu'un QR a porté, ramené à la forme
 * canonique : majuscules, sans espaces ni tirets, `I`/`L` → `1`, `O` → `0`.
 * `null` si le résultat n'est pas un code bien formé : aucune requête ne part
 * jamais sur une chaîne arbitraire.
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

/** `ABCDEFGHJKMN` → `ABCD-EFGH-JKMN` : lecture et dictée plus sûres. */
export function formatVerificationCodeForDisplay(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code
}

/**
 * Adresse HTTP publique du backend de PRODUCTION d'administration.ga
 * (déploiement Convex `charming-hare-796`), où vivent les routes de
 * vérification. Route publique, sans session, CORS ouvert en lecture.
 */
export const DEFAULT_ADMINISTRATION_VERIFY_API_URL = "https://charming-hare-796.convex.site"

/** Une origine seule : `https://hôte[:port]`, ou `http://localhost[:port]` en recette locale. */
const API_ORIGIN_PATTERN = /^(https:\/\/[^\s/]+|http:\/\/(localhost|127\.0\.0\.1)(:\d{2,5})?)\/?$/

/**
 * Base des routes de vérification, lue au rendu SERVEUR :
 * `ADMINISTRATION_VERIFY_API_URL` si elle est posée et bien formée (une
 * origine sans chemin — pour pointer un backend de recette), sinon la
 * production. Jamais une adresse inventée à partir d'une saisie.
 */
export function administrationVerifyApiUrl(env: Record<string, string | undefined>): string {
  const explicit = env.ADMINISTRATION_VERIFY_API_URL?.trim()
  if (explicit && API_ORIGIN_PATTERN.test(explicit)) {
    return explicit.replace(/\/+$/, "")
  }
  return DEFAULT_ADMINISTRATION_VERIFY_API_URL
}

export interface VerifyEndpoints {
  /** `GET` → fiche d'authenticité JSON. */
  statusUrl: string
  /** `GET` → le PDF A4 authentique (inline), déjà bandeauté s'il est révoqué ou remplacé. */
  pdfUrl: string
}

/** Les deux URLs d'un code, ou `null` si le code est mal formé. */
export function verifyEndpoints(apiBaseUrl: string, code: string): VerifyEndpoints | null {
  const normalized = normalizeVerificationCode(code)
  if (!normalized) return null
  const base = apiBaseUrl.trim().replace(/\/+$/, "")
  return {
    statusUrl: `${base}/api/verify/${normalized}`,
    pdfUrl: `${base}/api/verify/${normalized}/document.pdf`,
  }
}

/** Champs communs aux trois statuts trouvés. */
interface FoundActFields {
  documentNumber: string
  typeLabel: string
  issuerName: string
  issuedAt: number
  signed: boolean
  signedAt?: number
  contentSha256Prefix: string
}

/** Une forme par réponse réellement rendue par la route publique. */
export type VerifyResult =
  | ({ kind: "valid" } & FoundActFields)
  | ({ kind: "revoked"; revokedAt?: number; revokedReason?: string } & FoundActFields)
  | ({ kind: "superseded"; revokedAt?: number; supersededByDocumentNumber?: string } & FoundActFields)
  | { kind: "unknown" }
  | { kind: "unavailable" }
  | { kind: "rate_limited"; retryAfterMs: number }
  | { kind: "error" }

export type FoundVerifyResult = Extract<VerifyResult, { kind: "valid" | "revoked" | "superseded" }>

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
 * inconnu, 503 vérification indisponible, 429 rafale (`retryAfterMs` du
 * corps). Toute autre forme devient `error` — jamais une exception.
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

export function isFoundVerifyResult(result: VerifyResult): result is FoundVerifyResult {
  return result.kind === "valid" || result.kind === "revoked" || result.kind === "superseded"
}

/** `12_000` → « 12 secondes » ; `125_000` → « 3 minutes ». Arrondi au-dessus. */
export function formatRetryDelay(retryAfterMs: number): string {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000))
  if (seconds < 60) return `${seconds} seconde${seconds > 1 ? "s" : ""}`
  const minutes = Math.ceil(seconds / 60)
  return `${minutes} minute${minutes > 1 ? "s" : ""}`
}

const ACT_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Africa/Libreville",
})

/** Horodatage d'acte à l'heure de Libreville. */
export function formatActDate(ms: number): string {
  return ACT_DATE_FORMATTER.format(new Date(ms))
}

/** Titre du bandeau d'authenticité, un par forme de `VerifyResult`. */
export function verifyResultTitle(result: VerifyResult): string {
  switch (result.kind) {
    case "valid":
      return "Document authentique"
    case "revoked": {
      const when = result.revokedAt ? ` le ${formatActDate(result.revokedAt)}` : ""
      return `Document RÉVOQUÉ${when}`
    }
    case "superseded": {
      const by = result.supersededByDocumentNumber
        ? ` par l'acte ${result.supersededByDocumentNumber}`
        : ""
      return `Document REMPLACÉ${by}`
    }
    case "unknown":
      return "Code inconnu"
    case "unavailable":
      return "Vérification momentanément indisponible"
    case "rate_limited":
      return `Trop de vérifications : réessayez dans ${formatRetryDelay(result.retryAfterMs)}`
    case "error":
      return "Vérification impossible"
  }
}
