import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuth from 'expo-local-authentication';
import { authClient } from '@/lib/auth-client';

/**
 * Déverrouillage par Face ID / biométrie, purement local : la session est
 * déjà ouverte, le verrou demande seulement au téléphone de reconnaître son
 * propriétaire au lieu du PIN. Rien ne part au serveur.
 *
 * À ne pas confondre avec les clés d'accès (passkeys, `./passkeys`), qui
 * ouvrent une session quand on est déconnecté.
 */
const FACE_UNLOCK_ACCOUNT_KEY = 'idn.faceUnlockAccount';

export async function faceUnlockEnabledFor(email: string | null | undefined): Promise<boolean> {
  if (Platform.OS === 'web' || !email) return false;
  return (await AsyncStorage.getItem(FACE_UNLOCK_ACCOUNT_KEY)) === email.toLowerCase();
}

/** Active (ou désactive) le déverrouillage biométrique pour le compte de la session ouverte. */
export async function setFaceUnlockForSession(enabled: boolean): Promise<void> {
  if (!enabled) return AsyncStorage.removeItem(FACE_UNLOCK_ACCOUNT_KEY);
  const session = await authClient.getSession();
  const email = session?.data?.user?.email as string | undefined;
  if (email) await AsyncStorage.setItem(FACE_UNLOCK_ACCOUNT_KEY, email.toLowerCase());
}

/**
 * Comptes à qui l'activation a déjà été proposée sur cet appareil : la
 * proposition n'apparaît qu'à la première connexion, pas à chaque fois
 * qu'on a répondu « Plus tard ».
 */
const FACE_UNLOCK_OFFERED_KEY = 'idn.faceUnlockOffered';

async function offeredAccounts(): Promise<string[]> {
  try {
    const list: unknown = JSON.parse((await AsyncStorage.getItem(FACE_UNLOCK_OFFERED_KEY)) ?? '[]');
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/** À proposer à la connexion : jamais proposé à ce compte ici, pas encore actif, capteur prêt. */
export async function shouldOfferFaceUnlock(email: string): Promise<boolean> {
  const account = email.toLowerCase();
  if ((await offeredAccounts()).includes(account)) return false;
  if (await faceUnlockEnabledFor(account)) return false;
  return biometricAvailable();
}

export async function markFaceUnlockOffered(email: string): Promise<void> {
  const account = email.toLowerCase();
  const list = await offeredAccounts();
  if (!list.includes(account)) await AsyncStorage.setItem(FACE_UNLOCK_OFFERED_KEY, JSON.stringify([...list, account]));
}

/** Capteur présent et visage ou empreinte enregistré dans les réglages du téléphone. */
export async function biometricAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hardware, enrolled] = await Promise.all([LocalAuth.hasHardwareAsync(), LocalAuth.isEnrolledAsync()]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

/**
 * Demande Face ID / la biométrie. Le code du téléphone n'est pas proposé en
 * repli : le repli, c'est le PIN IDN. Sur Android, le visage reconnu suffit,
 * sans toucher « Confirmer », comme Face ID.
 */
export async function confirmWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const res = await LocalAuth.authenticateAsync({
      promptMessage,
      cancelLabel: 'Code PIN',
      fallbackLabel: '',
      disableDeviceFallback: true,
      requireConfirmation: false,
    });
    return res.success;
  } catch {
    return false;
  }
}
