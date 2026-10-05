/** Étapes affichées dans le stepper du parcours KYC (prototype « kyc »). */
export const KYC_STEPS = ["Recto", "Verso", "Selfie", "Envoi"]

export type KycEntryRoute = "review" | "level3" | "documents"

export function kycEntryRoute(args: {
  targetLoa: 2 | 3
  currentLoa: number
  activeStatus?: string
}): KycEntryRoute {
  if (
    args.activeStatus &&
    ["submitted", "under_review", "complement_required"].includes(
      args.activeStatus,
    )
  )
    return "review"
  if (args.targetLoa === 3 && args.currentLoa >= 2) return "level3"
  return "documents"
}

export function kycPostSubmitRoute(
  targetLoa: 2 | 3,
  wasComplement: boolean,
): "review" | "level3" {
  if (wasComplement) return "review"
  return targetLoa === 3 ? "level3" : "review"
}
