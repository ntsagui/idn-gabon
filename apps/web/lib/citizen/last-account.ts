/**
 * Dernier compte connecté dans ce navigateur, pour accueillir l'utilisateur
 * par son prénom (« Bon retour, Awa ») et lui éviter de ressaisir son
 * adresse @idn.ga (même rôle que apps/mobile/src/lib/last-account.ts).
 * Aucune donnée d'authentification : seulement l'adresse et le nom, déjà
 * affichés à l'écran une fois connecté.
 */
const KEY = "idn.lastAccount"

export type LastAccount = { email: string; firstName?: string; lastName?: string }

export function initialsOf(firstName?: string, lastName?: string, email?: string): string {
  const a = firstName?.trim()?.[0]
  const b = lastName?.trim()?.[0]
  if (a || b) return `${a ?? ""}${b ?? ""}`.toUpperCase()
  return (email?.[0] ?? "?").toUpperCase()
}

export function getLastAccount(): LastAccount | null {
  if (typeof window === "undefined") return null
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as LastAccount | null
    return typeof parsed?.email === "string" ? parsed : null
  } catch {
    return null
  }
}

export function setLastAccount(account: LastAccount): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(account))
  } catch {
    // Stockage indisponible (navigation privée) : l'accueil par le prénom est facultatif.
  }
}

export function clearLastAccount(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // idem
  }
}
