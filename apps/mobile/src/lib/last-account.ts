import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dernier compte connecté sur cet appareil, pour accueillir l'utilisateur
 * par son prénom (« Bon retour, Awa ») et lui éviter de ressaisir son
 * adresse @idn.ga. Aucune donnée d'authentification : seulement l'adresse
 * et le prénom, déjà affichés à l'écran une fois connecté.
 */
const KEY = 'idn.lastAccount';

export type LastAccount = { email: string; firstName?: string; lastName?: string };

export function initialsOf(firstName?: string, lastName?: string, email?: string): string {
  const a = firstName?.trim()?.[0];
  const b = lastName?.trim()?.[0];
  if (a || b) return `${a ?? ''}${b ?? ''}`.toUpperCase();
  return (email?.[0] ?? '?').toUpperCase();
}

export async function getLastAccount(): Promise<LastAccount | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LastAccount;
    return typeof parsed?.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export async function setLastAccount(account: LastAccount): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(account));
}

export async function clearLastAccount(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
