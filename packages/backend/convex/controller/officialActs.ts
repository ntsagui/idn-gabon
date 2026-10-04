import { ConvexError, v } from "convex/values"

import { internal } from "../_generated/api"
import { action, internalMutation, internalQuery } from "../_generated/server"
import { requireController } from "../lib/auth"
import {
  administrationVerifyApiUrl,
  codeFromInput,
  formatVerificationCode,
  isDefinitiveResult,
  parseVerifyResponse,
  type VerifyResult,
  verifyEndpoints,
} from "./officialActModel"

/**
 * Espace contrôleur — « Vérifier signature » d'un acte officiel.
 *
 * Réutilise le vérificateur public des actes officiels (commit 0fb7516) :
 * mêmes routes publiques d'administration.ga, même lecture de la réponse.
 * La requête part du SERVEUR pour que l'issue inscrite au journal du
 * contrôleur (`signature_verified`) soit celle de l'émetteur.
 */

const FETCH_TIMEOUT_MS = 10_000

const found = {
  documentNumber: v.string(),
  typeLabel: v.string(),
  issuerName: v.string(),
  issuedAt: v.number(),
  signed: v.boolean(),
  signedAt: v.optional(v.number()),
  contentSha256Prefix: v.string(),
}

const RESULT = v.union(
  v.object({ kind: v.literal("valid"), ...found }),
  v.object({
    kind: v.literal("revoked"),
    ...found,
    revokedAt: v.optional(v.number()),
    revokedReason: v.optional(v.string()),
  }),
  v.object({
    kind: v.literal("superseded"),
    ...found,
    revokedAt: v.optional(v.number()),
    supersededByDocumentNumber: v.optional(v.string()),
  }),
  v.object({ kind: v.literal("unknown") }),
  v.object({ kind: v.literal("unavailable") }),
  v.object({ kind: v.literal("rate_limited"), retryAfterMs: v.number() }),
  v.object({ kind: v.literal("error") }),
)

export const _controllerId = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => (await requireController(ctx)).userId,
})

export const _record = internalMutation({
  args: {
    actorId: v.string(),
    code: v.string(),
    kind: v.string(),
    documentNumber: v.optional(v.string()),
    typeLabel: v.optional(v.string()),
    issuerName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.audit.recordAudit, {
      actorId: args.actorId,
      action: "signature_verified",
      targetType: "document",
      targetId: args.code,
      metadata: {
        kind: args.kind,
        ...(args.documentNumber ? { documentNumber: args.documentNumber } : {}),
        ...(args.typeLabel ? { typeLabel: args.typeLabel } : {}),
        ...(args.issuerName ? { issuerName: args.issuerName } : {}),
      },
    })
    return null
  },
})

export const verify = action({
  args: { input: v.string() },
  returns: v.object({
    code: v.string(),
    displayCode: v.string(),
    pdfUrl: v.union(v.string(), v.null()),
    checkedAt: v.number(),
    result: RESULT,
  }),
  handler: async (ctx, args) => {
    const actorId: string = await ctx.runQuery(
      internal.controller.officialActs._controllerId,
      {},
    )
    const code = codeFromInput(args.input)
    if (!code) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message:
          "Ce n'est pas un code de vérification d'acte : 12 caractères, chiffres et lettres (ex. ABCD-EFGH-JKMN).",
      })
    }

    const endpoints = verifyEndpoints(administrationVerifyApiUrl(process.env), code)
    let result: VerifyResult
    try {
      const response = await fetch(endpoints.statusUrl, {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      })
      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      result = parseVerifyResponse(response.status, body)
    } catch {
      result = { kind: "unavailable" }
    }

    if (isDefinitiveResult(result)) {
      const details =
        result.kind === "valid" || result.kind === "revoked" || result.kind === "superseded"
          ? {
              documentNumber: result.documentNumber,
              typeLabel: result.typeLabel,
              issuerName: result.issuerName,
            }
          : {}
      await ctx.runMutation(internal.controller.officialActs._record, {
        actorId,
        code,
        kind: result.kind,
        ...details,
      })
    }

    const hasDocument =
      result.kind === "valid" || result.kind === "revoked" || result.kind === "superseded"
    return {
      code,
      displayCode: formatVerificationCode(code),
      pdfUrl: hasDocument ? endpoints.pdfUrl : null,
      checkedAt: Date.now(),
      result,
    }
  },
})
