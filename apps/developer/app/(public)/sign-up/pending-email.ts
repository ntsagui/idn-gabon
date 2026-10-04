/** Adresse en attente de vérification, transmise de l'inscription au code. */
export const PENDING_EMAIL_KEY = "idn-dev:pending-verification-email"

export function readPendingEmail(): string | null {
  try {
    return window.sessionStorage.getItem(PENDING_EMAIL_KEY)
  } catch {
    return null
  }
}

export function clearPendingEmail(): void {
  try {
    window.sessionStorage.removeItem(PENDING_EMAIL_KEY)
  } catch {
    // ignoré
  }
}
