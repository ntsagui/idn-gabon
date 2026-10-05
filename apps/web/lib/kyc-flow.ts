export type KycTargetLoa = 2 | 3

/**
 * Hôtes vers lesquels on accepte de renvoyer l'usager après une démarche KYC.
 *
 * C'est une ALLOWLIST de redirection : y ajouter un domaine, c'est accepter
 * d'y renvoyer un usager qui vient de prouver son identité. `demarche.ga` y
 * figure parce que le portail citoyen propose désormais la vérification
 * (Niveau 2 ou Niveau 3) et doit récupérer l'usager à son retour — sans quoi
 * il resterait échoué sur identite.ga, sa démarche interrompue.
 *
 * Ne JAMAIS élargir à un joker : `endsWith(".ga")` accepterait n'importe quel
 * domaine gabonais, y compris un domaine hostile fraîchement déposé.
 */
const ALLOWED_RETURN_HOSTS = ["identite.ga", "demarche.ga"] as const

/** Postes de développement : acceptés hors production uniquement, en http. */
const DEV_RETURN_HOSTS = ["localhost", "127.0.0.1"] as const

export function isAllowedReturnTo(raw: string): boolean {
  try {
    const url = new URL(raw)
    const host = url.hostname
    if (process.env.NODE_ENV !== "production" && (DEV_RETURN_HOSTS as readonly string[]).includes(host)) {
      return url.protocol === "http:" || url.protocol === "https:"
    }
    if (url.protocol !== "https:") return false
    return ALLOWED_RETURN_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    )
  } catch {
    return false
  }
}

export function parseKycFlow(
  search: string,
  currentLoa: number,
): { returnTo: string | null; targetLoa: KycTargetLoa } {
  const params = new URLSearchParams(search)
  const rawReturnTo = params.get("return_to")
  const returnTo =
    rawReturnTo && isAllowedReturnTo(rawReturnTo) ? rawReturnTo : null
  const explicitTarget = params.get("target")
  const targetLoa: KycTargetLoa =
    explicitTarget === "3"
      ? 3
      : explicitTarget === "2"
        ? 2
        : returnTo || currentLoa < 2
          ? 2
          : currentLoa >= 3
            ? 3
            : 2

  return { returnTo, targetLoa }
}

export function buildKycPath({
  returnTo,
  targetLoa,
}: {
  returnTo: string
  targetLoa: KycTargetLoa
}): string {
  const params = new URLSearchParams({
    return_to: returnTo,
    target: String(targetLoa),
  })
  return `/kyc?${params.toString()}`
}
