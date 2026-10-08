import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth-client', () => ({ authClient: { $fetch: vi.fn(), getSession: vi.fn() } }));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
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

describe('clés d’accès', () => {
  it('signale le service indisponible (500) au lieu d’une erreur vide', async () => {
    const { authClient } = await import('@/lib/auth-client');
    const { listPasskeys, PasskeyUnavailableError } = await import('./passkeys');
    vi.mocked(authClient.$fetch).mockResolvedValueOnce({ error: { status: 500, statusText: '' } });
    await expect(listPasskeys()).rejects.toBeInstanceOf(PasskeyUnavailableError);
  });

  it('lit la liste renvoyée par la route GET du plugin', async () => {
    const { authClient } = await import('@/lib/auth-client');
    const { listPasskeys } = await import('./passkeys');
    vi.mocked(authClient.$fetch).mockResolvedValueOnce({ data: [{ id: 'k1', createdAt: 1 }] });
    await expect(listPasskeys()).resolves.toHaveLength(1);
    expect(authClient.$fetch).toHaveBeenLastCalledWith('/passkey/list-user-passkeys', { method: 'GET' });
  });

  it('oriente vers le code PIN quand la clé d’accès échoue côté serveur', async () => {
    const { passkeyErrorMessage } = await import('./passkeys');
    expect(passkeyErrorMessage({ status: 500 }, 'x')).toMatch(/code PIN/);
    expect(passkeyErrorMessage({ status: 400, message: 'auth cancelled' }, 'x')).toBe('auth cancelled');
  });

  it('ne lance la clé d’accès que pour le compte qui l’a créée sur cet appareil', async () => {
    // Sinon la connexion d'un autre compte déclencherait une clé d'accès
    // qui ne lui appartient pas, au lieu de passer directement au PIN.
    const { authClient } = await import('@/lib/auth-client');
    const { passkeyEnabledFor, setPasskeyForSession } = await import('./passkeys');
    vi.mocked(authClient.getSession).mockResolvedValueOnce({ data: { user: { email: 'Awa.Ndong@idn.ga' } } });
    await setPasskeyForSession(true);
    expect(await passkeyEnabledFor('awa.ndong@idn.ga')).toBe(true);
    expect(await passkeyEnabledFor('autre@idn.ga')).toBe(false);
    await setPasskeyForSession(false);
    expect(await passkeyEnabledFor('awa.ndong@idn.ga')).toBe(false);
  });
});
