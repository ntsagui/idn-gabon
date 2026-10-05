import { listPasskeys, PasskeyUnavailableError, type Passkey } from "@/lib/citizen/passkeys"

/**
 * Liste des clés d'accès avec mémoire de session : tant que le serveur répond
 * 500 aux routes passkey (composant Better Auth sans table `passkey`, cf.
 * lib/citizen/passkeys.ts), on ne le réinterroge pas à chaque écran du
 * compte. Un seul appel à la fois (Profil et Sécurité peuvent le demander
 * ensemble en développement, où les effets React sont joués deux fois).
 */
const KEY = "idn.passkeys.unavailable"
let pending: Promise<Passkey[]> | null = null

export function loadPasskeys(): Promise<Passkey[]> {
  try {
    if (window.sessionStorage.getItem(KEY) === "1") return Promise.reject(new PasskeyUnavailableError())
  } catch {
    // Stockage indisponible : on interroge le serveur.
  }
  pending ??= listPasskeys()
    .catch((err) => {
      if (err instanceof PasskeyUnavailableError) {
        try {
          window.sessionStorage.setItem(KEY, "1")
        } catch {
          // idem
        }
      }
      throw err
    })
    .finally(() => {
      pending = null
    })
  return pending
}
