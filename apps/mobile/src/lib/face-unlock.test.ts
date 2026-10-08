import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ authClient: { getSession: vi.fn() } }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: vi.fn(),
  isEnrolledAsync: vi.fn(),
  authenticateAsync: vi.fn(),
}));
vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
      removeItem: async (k: string) => void store.delete(k),
    },
  };
});

describe('déverrouillage Face ID', () => {
  beforeEach(() => vi.clearAllMocks());

  it('ne déverrouille que le compte qui l’a activé sur cet appareil', async () => {
    // Un autre compte ouvert sur le même téléphone doit saisir son PIN.
    const { authClient } = await import('@/lib/auth-client');
    const { faceUnlockEnabledFor, setFaceUnlockForSession } = await import('./face-unlock');
    vi.mocked(authClient.getSession).mockResolvedValueOnce({ data: { user: { email: 'Awa.Ndong@idn.ga' } } } as never);
    await setFaceUnlockForSession(true);
    expect(await faceUnlockEnabledFor('awa.ndong@idn.ga')).toBe(true);
    expect(await faceUnlockEnabledFor('autre@idn.ga')).toBe(false);
    await setFaceUnlockForSession(false);
    expect(await faceUnlockEnabledFor('awa.ndong@idn.ga')).toBe(false);
  });

  it('est indépendant des clés d’accès', async () => {
    // Activer Face ID ne doit ni créer ni supposer une clé d'accès : la
    // connexion déconnectée ne la lancerait pas pour autant.
    const { authClient } = await import('@/lib/auth-client');
    const { setFaceUnlockForSession } = await import('./face-unlock');
    const { passkeyEnabledFor } = await import('./passkeys');
    vi.mocked(authClient.getSession).mockResolvedValueOnce({ data: { user: { email: 'awa.ndong@idn.ga' } } } as never);
    await setFaceUnlockForSession(true);
    expect(await passkeyEnabledFor('awa.ndong@idn.ga')).toBe(false);
  });

  it('vérifie localement, sans le code de l’iPhone en repli', async () => {
    // Le code de déverrouillage du téléphone ne doit pas remplacer le PIN IDN.
    const LocalAuth = await import('expo-local-authentication');
    const { confirmWithBiometrics } = await import('./face-unlock');
    vi.mocked(LocalAuth.authenticateAsync).mockResolvedValueOnce({ success: true } as never);
    expect(await confirmWithBiometrics('Déverrouiller')).toBe(true);
    expect(LocalAuth.authenticateAsync).toHaveBeenCalledWith(expect.objectContaining({ disableDeviceFallback: true }));
  });

  it('renvoie au PIN si Face ID est annulé ou échoue', async () => {
    const LocalAuth = await import('expo-local-authentication');
    const { confirmWithBiometrics } = await import('./face-unlock');
    vi.mocked(LocalAuth.authenticateAsync).mockResolvedValueOnce({ success: false, error: 'user_cancel' } as never);
    expect(await confirmWithBiometrics('Déverrouiller')).toBe(false);
    vi.mocked(LocalAuth.authenticateAsync).mockRejectedValueOnce(new Error('boom'));
    expect(await confirmWithBiometrics('Déverrouiller')).toBe(false);
  });

  it('n’est proposé qu’à la première connexion du compte sur l’appareil', async () => {
    // Répondre « Plus tard » ne doit pas faire réapparaître la proposition
    // à chaque connexion ; un autre compte, lui, y a droit.
    const LocalAuth = await import('expo-local-authentication');
    const { markFaceUnlockOffered, shouldOfferFaceUnlock } = await import('./face-unlock');
    vi.mocked(LocalAuth.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuth.isEnrolledAsync).mockResolvedValue(true);
    expect(await shouldOfferFaceUnlock('Paul.Mba@idn.ga')).toBe(true);
    await markFaceUnlockOffered('Paul.Mba@idn.ga');
    expect(await shouldOfferFaceUnlock('paul.mba@idn.ga')).toBe(false);
    expect(await shouldOfferFaceUnlock('autre.compte@idn.ga')).toBe(true);
  });

  it('n’est pas proposé sans biométrie configurée sur le téléphone', async () => {
    const LocalAuth = await import('expo-local-authentication');
    const { shouldOfferFaceUnlock } = await import('./face-unlock');
    vi.mocked(LocalAuth.hasHardwareAsync).mockResolvedValue(true);
    vi.mocked(LocalAuth.isEnrolledAsync).mockResolvedValue(false);
    expect(await shouldOfferFaceUnlock('sans.capteur@idn.ga')).toBe(false);
  });
});
