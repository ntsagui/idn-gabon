import type { Doc } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"
import { normalizeRecoveryPhone } from "./phone"
import {
  isPhoneRegistryReady,
  isPhoneUsedByAnotherProfile,
} from "./phoneRegistry"

const MAX_IDENTITY_MATCHES = 50

export const PIN_RECOVERY_BLOCKERS = [
  "account_deleted",
  "email_not_verified",
  "missing_phone",
  "missing_identity_key",
  "shared_identity",
  "shared_nip",
  "shared_phone",
  "phone_index_incomplete",
] as const

export type PinRecoveryBlocker = (typeof PIN_RECOVERY_BLOCKERS)[number]

type RecoveryCtx = Pick<QueryCtx, "db">

/**
 * Décide si le téléphone historique d'un profil peut recevoir un code de
 * récupération. Le téléphone n'était pas vérifié à l'inscription : on exige
 * donc un email vérifié, une identité unique et un numéro unique parmi les
 * profils actifs.
 *
 * Les téléphones sont recherchés par index, indépendamment de la taille du
 * registre. Les profils historiques doivent tous avoir été migrés avant
 * d'autoriser un envoi, pour ne pas manquer un numéro partagé.
 */
export async function assessAutomaticSmsRecovery(
  ctx: RecoveryCtx,
  profile: Doc<"userProfile">,
  emailVerified: boolean,
): Promise<{
  eligible: boolean
  phone: string | null
  blockers: PinRecoveryBlocker[]
}> {
  const blockers: PinRecoveryBlocker[] = []
  const phone = normalizeRecoveryPhone(
    profile.pivot?.phone,
    profile.pivot?.nationality,
  )

  if (profile.deletedAt !== undefined) blockers.push("account_deleted")
  if (!emailVerified) blockers.push("email_not_verified")
  if (!phone) blockers.push("missing_phone")

  if (!profile.pivotKey) {
    blockers.push("missing_identity_key")
  } else if (
    !(await isOnlyActiveProfileWithKey(
      ctx,
      "by_pivotKey",
      "pivotKey",
      profile.pivotKey,
      profile._id,
    ))
  ) {
    blockers.push("shared_identity")
  }

  if (
    profile.nipKey &&
    !(await isOnlyActiveProfileWithKey(
      ctx,
      "by_nipKey",
      "nipKey",
      profile.nipKey,
      profile._id,
    ))
  ) {
    blockers.push("shared_nip")
  }

  if (phone) {
    if (!(await isPhoneRegistryReady(ctx))) {
      blockers.push("phone_index_incomplete")
    } else if (await isPhoneUsedByAnotherProfile(ctx, phone, profile._id)) {
      blockers.push("shared_phone")
    }
  }

  return {
    eligible: blockers.length === 0,
    phone,
    blockers,
  }
}

async function isOnlyActiveProfileWithKey(
  ctx: RecoveryCtx,
  indexName: "by_pivotKey" | "by_nipKey",
  fieldName: "pivotKey" | "nipKey",
  key: string,
  expectedProfileId: Doc<"userProfile">["_id"],
): Promise<boolean> {
  const rows = await ctx.db
    .query("userProfile")
    .withIndex(indexName, (q) => q.eq(fieldName, key))
    .take(MAX_IDENTITY_MATCHES + 1)
  if (rows.length > MAX_IDENTITY_MATCHES) return false

  const active = rows.filter((row) => row.deletedAt === undefined)
  return active.length === 1 && active[0]?._id === expectedProfileId
}
