/**
 * Nom du déploiement Convex de production (cf. mémoire projet : pas celui de
 * l'ADR-0010). Les outils de recette s'y refusent.
 */
export const PRODUCTION_DEPLOYMENT = "flexible-panda-248"

export function isProductionDeployment(): boolean {
  return (process.env.CONVEX_CLOUD_URL ?? "").includes(PRODUCTION_DEPLOYMENT)
}
