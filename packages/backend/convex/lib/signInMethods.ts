import type { Doc } from "../_generated/dataModel"
import type { ROLES } from "../schema"

type Role = (typeof ROLES)[number]

export type SignInMethods = { pin: boolean; password: boolean }

/**
 * Moyens de connexion réellement utilisés par un compte. Décide quel code
 * provisoire l'administration peut émettre pour lui, et donc quelle carte la
 * fiche compte affiche.
 *
 *   • PIN — les profils citoyen, résident et visiteur se connectent au portail
 *     et à l'app mobile par identifiant + PIN. Leur mot de passe Better Auth est
 *     tiré au hasard à l'inscription et ne leur est jamais communiqué.
 *   • Mot de passe — la console admin, l'app des contrôleurs et le portail
 *     développeur se connectent par email + mot de passe : tout compte portant
 *     un rôle, ou un profil développeur, en a donc un qu'il connaît.
 *
 * Un agent citoyen qui est aussi contrôleur utilise les deux.
 *
 * POURQUOI REFUSER L'AUTRE CODE : il n'aide pas le titulaire — un code de mot
 * de passe ne débloque pas `/forgot-pin` — et il ouvrirait une seconde porte
 * d'entrée. Un mot de passe connu sur un compte citoyen permet
 * `/api/auth/sign-in/email` sans jamais passer par le PIN.
 */
export function signInMethods(
  profileType: Doc<"userProfile">["profileType"],
  activeRoles: readonly Role[],
): SignInMethods {
  return {
    pin: profileType !== "developer",
    password: profileType === "developer" || activeRoles.length > 0,
  }
}
