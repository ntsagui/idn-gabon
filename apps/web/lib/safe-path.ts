/**
 * Chemin interne sûr pour une redirection pilotée par l'URL (`redirect_to`).
 *
 * Renvoie `pathname + search + hash` d'un chemin de CETTE origine, ou `null`.
 * Refuse tout ce qu'un navigateur pourrait interpréter comme un autre site :
 * `//evil.com`, `/\evil.com` (le navigateur lit `\` comme `/`), et les
 * caractères de contrôle (`/\t/evil.com` : la tabulation est supprimée à la
 * navigation, ce qui redonne `//evil.com`). La vérification finale compare
 * l'origine résolue à une base fictive.
 */
export function toInternalPath(input: string | null | undefined): string | null {
  if (!input || !input.startsWith("/") || input.startsWith("//")) return null
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(input)) return null
  const base = "https://idn.invalid"
  let url: URL
  try {
    url = new URL(input, base)
  } catch {
    return null
  }
  if (url.origin !== base) return null
  return `${url.pathname}${url.search}${url.hash}`
}
