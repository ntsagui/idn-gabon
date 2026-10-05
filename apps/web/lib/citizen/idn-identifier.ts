/**
 * Adresse IDN saisie à la connexion et dans « Code PIN oublié » : même règle
 * que apps/mobile/src/app/(auth)/login.tsx et forgot-pin.tsx.
 */
export const IDN_DOMAIN = "@idn.ga"
export const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/

/** Accepte `handle` ou `handle@idn.ga` ; renvoie l'adresse Better Auth normalisée. */
export function normalizeIdnIdentifier(input: string): { handle: string; email: string } | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null
  const handle = raw.endsWith(IDN_DOMAIN) ? raw.slice(0, -IDN_DOMAIN.length) : raw
  if (handle.length < 3 || handle.length > 32) return null
  if (!HANDLE_REGEX.test(handle)) return null
  return { handle, email: `${handle}${IDN_DOMAIN}` }
}
