/**
 * Copie de apps/mobile/src/lib/passkeys.ts (et du libellé de
 * apps/mobile/src/lib/biometric-label.ts). Dans le navigateur, la biométrie
 * de l'appareil passe par une clé d'accès WebAuthn : on garde le terme
 * générique du mobile hors iPhone (« la biométrie »).
 *
 * Sans table `passkey` dans le composant Convex Better Auth (portée depuis le
 * 05/10/2026 par son installation locale), le serveur répond 500 aux routes
 * qui la lisent (`/passkey/list-user-passkeys`, `/passkey/verify-authentication`…).
 * La requête `authCapabilities.get` le dit sans appel en erreur ; on le
 * signale par `PasskeyUnavailableError` pour afficher « indisponible » plutôt
 * qu'un bouton qui échoue.
 */
import { ConvexHttpClient } from "convex/browser"

import { api } from "@repo/backend/convex/_generated/api"

import { authClient } from "@/lib/auth-client"

let support: Promise<boolean> | null = null

/**
 * Le serveur gère-t-il les clés d'accès ? (`authCapabilities.get`, sans
 * appeler les routes /passkey/* qui répondraient 500 et laisseraient une
 * erreur réseau dans la console). Réponse mise en cache pour la page.
 */
export function passkeysSupported(): Promise<boolean> {
  support ??= new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    .query(api.authCapabilities.get, {})
    .then((c) => c.passkeys)
    .catch(() => {
      support = null
      return false
    })
  return support
}

/** Nom de la biométrie dans une phrase (« Se connecter avec la biométrie »). */
export const BIOMETRIC = "la biométrie"
/** Variante en début de phrase ou en titre. */
export const BIOMETRIC_TITLE = "Biométrie"

/**
 * Adresse du compte dont la biométrie est activée dans ce navigateur. La
 * connexion ne lance la clé d'accès que pour ce compte ; les autres passent
 * directement au PIN, sans bouton biométrique voué à l'échec.
 */
const BIOMETRIC_ACCOUNT_KEY = "idn.biometricAccount"

export function biometricEnabledFor(email: string | null | undefined): boolean {
  try {
    return !!email && window.localStorage.getItem(BIOMETRIC_ACCOUNT_KEY) === email.toLowerCase()
  } catch {
    return false
  }
}

/** Mémorise (ou oublie) la biométrie pour le compte de la session ouverte. */
export async function setBiometricForSession(enabled: boolean): Promise<void> {
  try {
    if (!enabled) return window.localStorage.removeItem(BIOMETRIC_ACCOUNT_KEY)
    const session = await authClient.getSession()
    const email = session?.data?.user?.email
    if (email) window.localStorage.setItem(BIOMETRIC_ACCOUNT_KEY, email.toLowerCase())
  } catch {
    /* stockage indisponible : la connexion reste au PIN */
  }
}

export type Passkey = { id: string; name?: string | null; createdAt: string | number | Date; deviceType?: string }

export class PasskeyUnavailableError extends Error {
  constructor() {
    super("Les clés d’accès ne sont pas encore activées sur le service IDN.")
  }
}

type FetchResult<T> = { data?: T | null; error?: { message?: string; status?: number } | null } | null | undefined

export function isServerFailure(error: { status?: number } | null | undefined): boolean {
  return !!error && typeof error.status === "number" && error.status >= 500
}

export async function listPasskeys(): Promise<Passkey[]> {
  if (!(await passkeysSupported())) throw new PasskeyUnavailableError()
  const res = (await authClient.$fetch("/passkey/list-user-passkeys", { method: "GET" })) as FetchResult<Passkey[]>
  if (isServerFailure(res?.error)) throw new PasskeyUnavailableError()
  if (res?.error) throw new Error(res.error.message || "Chargement des clés impossible.")
  return Array.isArray(res?.data) ? res.data : []
}

export async function deletePasskey(id: string): Promise<void> {
  if (!(await passkeysSupported())) throw new PasskeyUnavailableError()
  const res = (await authClient.$fetch("/passkey/delete-passkey", { method: "POST", body: { id } })) as FetchResult<unknown>
  if (isServerFailure(res?.error)) throw new PasskeyUnavailableError()
  if (res?.error) throw new Error(res.error.message || "Suppression impossible.")
}

/** Message à montrer quand une opération de clé d'accès (enrôlement, connexion) échoue. */
export function passkeyErrorMessage(error: { message?: string; status?: number } | null | undefined, fallback: string): string {
  if (isServerFailure(error)) return `La connexion par ${BIOMETRIC} n’est pas encore disponible sur le service IDN. Utilise ton code PIN.`
  return error?.message || fallback
}
