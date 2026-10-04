import type { Id } from "../_generated/dataModel"
import type { QueryCtx } from "../_generated/server"

type PhoneRegistryCtx = Pick<QueryCtx, "db">

/** Ne pas autoriser un numéro tant qu'un profil actif échappe à l'index. */
export async function isPhoneRegistryReady(
  ctx: PhoneRegistryCtx,
): Promise<boolean> {
  const unindexed = await ctx.db
    .query("userProfile")
    .withIndex("by_phoneKey_and_deletedAt", (q) =>
      q.eq("phoneKey", undefined).eq("deletedAt", undefined),
    )
    .first()
  return unindexed === null
}

export async function isPhoneUsedByAnotherProfile(
  ctx: PhoneRegistryCtx,
  phone: string,
  currentProfileId: Id<"userProfile">,
): Promise<boolean> {
  // Deux résultats suffisent : le profil courant et un éventuel doublon.
  const matches = await ctx.db
    .query("userProfile")
    .withIndex("by_phoneKey_and_deletedAt", (q) =>
      q.eq("phoneKey", phone).eq("deletedAt", undefined),
    )
    .take(2)
  return matches.some((profile) => profile._id !== currentProfileId)
}
