import { hashOpaqueSecret } from "./pin"

/**
 * Code provisoire de récupération du PIN, remis de la main à la main par un
 * agent habilité (console admin) quand le SMS automatique est bloqué ou
 * n'arrive pas. Mêmes bornes que le code provisoire de mot de passe :
 * 15 minutes, trois essais.
 */
export const ADMIN_PIN_CODE_TTL_MS = 15 * 60 * 1000
export const ADMIN_PIN_CODE_MAX_ATTEMPTS = 3

/**
 * Empreinte du code, salée par l'utilisateur : six chiffres se devinent hors
 * ligne en un million d'essais, une table précalculée ne doit donc servir
 * qu'un seul compte, jamais toute la base.
 */
export function hashAdminPinCode(userId: string, code: string) {
  return hashOpaqueSecret(`idn:pin-recovery-code:${userId}:${code}`)
}
