import { toInternalPath } from "@/lib/safe-path"

/**
 * Helpers de redirection sûrs — anti open-redirect.
 *
 * On n'accepte qu'un chemin de cette origine (`toInternalPath` : refuse
 * `//evil.com`, `/\evil.com`, les caractères de contrôle, et vérifie
 * l'origine résolue).
 */
export function safeRedirectTo(input: string | null, fallback: string): string {
  return toInternalPath(input) ?? fallback
}
