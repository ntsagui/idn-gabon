import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authClient } from '@/lib/auth-client';
import { BIOMETRIC } from './biometric-label';

/**
 * Gestion des clés d'accès (passkeys). Sur iOS/Android, le client
 * `expo-better-auth-passkey` ne fournit que l'enrôlement et la connexion :
 * `authClient.passkey.listUserPasskeys()` tombait dans le proxy générique de
 * Better Auth avec la mauvaise méthode HTTP. On appelle donc les routes du
 * plugin serveur explicitement.
 *
 * Sans table `passkey` dans le composant Convex Better Auth (portée depuis le
 * 05/10/2026 par son installation locale), le serveur répond 500 à toute
 * route passkey. On le signale par `PasskeyUnavailableError` pour afficher
 * « indisponible » plutôt qu'un bouton qui échoue.
 */
/**
 * Android désactivé tant que `assetlinks.json` et `PASSKEY_RP_ORIGINS` ne
 * portent pas les empreintes SHA-256 de signature (clé EAS + Play App
 * Signing) : sans elles, Credential Manager refuse l'enrôlement.
 */
export const PASSKEYS_ON_DEVICE = Platform.OS !== 'android';

/**
 * Adresse du compte dont Face ID est activé sur cet appareil. La connexion
 * et le verrou ne lancent Face ID que pour ce compte ; les autres passent
 * directement au PIN, sans bouton biométrique voué à l'échec.
 */
const BIOMETRIC_ACCOUNT_KEY = 'idn.biometricAccount';

export async function biometricEnabledFor(email: string | null | undefined): Promise<boolean> {
  if (!PASSKEYS_ON_DEVICE || !email) return false;
  return (await AsyncStorage.getItem(BIOMETRIC_ACCOUNT_KEY)) === email.toLowerCase();
}

/** Mémorise (ou oublie) Face ID pour le compte de la session ouverte. */
export async function setBiometricForSession(enabled: boolean): Promise<void> {
  if (!enabled) return AsyncStorage.removeItem(BIOMETRIC_ACCOUNT_KEY);
  const session = await authClient.getSession();
  const email = session?.data?.user?.email as string | undefined;
  if (email) await AsyncStorage.setItem(BIOMETRIC_ACCOUNT_KEY, email.toLowerCase());
}

export type Passkey = { id: string; name?: string | null; createdAt: string | number | Date; deviceType?: string };

export class PasskeyUnavailableError extends Error {
  constructor() {
    super('Les clés d’accès ne sont pas encore activées sur le service IDN.');
  }
}

type FetchResult<T> = { data?: T | null; error?: { message?: string; status?: number } | null } | null | undefined;

export function isServerFailure(error: { status?: number } | null | undefined): boolean {
  return !!error && typeof error.status === 'number' && error.status >= 500;
}

export async function listPasskeys(): Promise<Passkey[]> {
  if (!PASSKEYS_ON_DEVICE) throw new PasskeyUnavailableError();
  const res = (await authClient.$fetch('/passkey/list-user-passkeys', { method: 'GET' })) as FetchResult<Passkey[]>;
  if (isServerFailure(res?.error)) throw new PasskeyUnavailableError();
  if (res?.error) throw new Error(res.error.message || 'Chargement des clés impossible.');
  return Array.isArray(res?.data) ? res.data : [];
}

export async function deletePasskey(id: string): Promise<void> {
  const res = (await authClient.$fetch('/passkey/delete-passkey', { method: 'POST', body: { id } })) as FetchResult<unknown>;
  if (isServerFailure(res?.error)) throw new PasskeyUnavailableError();
  if (res?.error) throw new Error(res.error.message || 'Suppression impossible.');
}

/** Message à montrer quand une opération de clé d'accès (enrôlement, connexion) échoue. */
export function passkeyErrorMessage(error: { message?: string; status?: number } | null | undefined, fallback: string): string {
  if (isServerFailure(error)) return `La connexion par ${BIOMETRIC} n’est pas encore disponible sur le service IDN. Utilise ton code PIN.`;
  return error?.message || fallback;
}
