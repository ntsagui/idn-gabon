import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from 'convex/react';
import { Screen } from '@/design/components/screen';
import { PinLogin } from '@/components/auth/pin-login';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { biometricEnabledFor, passkeyErrorMessage } from '@/lib/passkeys';
import { BIOMETRIC_TITLE } from '@/lib/biometric-label';
import { clearLastAccount, getLastAccount, initialsOf, type LastAccount } from '@/lib/last-account';

/**
 * Verrou applicatif au démarrage à froid : la session Better Auth est déjà
 * valide (sinon le lancement envoie vers la bienvenue), on demande une
 * confirmation locale d'identité avant d'entrer dans l'app.
 *
 *   - PIN : vérifié contre le pinHash via api.onboarding.verifyPin (la
 *     session courante reste intacte).
 *   - Face ID : s'il est activé sur cet appareil pour ce compte, il est
 *     lancé d'emblée et reste accessible par la touche du clavier ; sinon
 *     seul le PIN est proposé.
 *
 * « Changer de compte » ferme la session et revient à la bienvenue.
 */
export default function Launcher() {
  const router = useRouter();
  const verifyPin = useMutation(api.onboarding.verifyPin);
  const me = useQuery(api.profile.getCurrentUser);
  const [stored, setAccount] = useState<LastAccount | null>(null);
  // Repli sur le profil serveur quand l'appareil n'a pas encore mémorisé le compte.
  const pivot = me?.profile?.pivot;
  const account: LastAccount | null = stored ?? (me ? { email: me.email, firstName: pivot?.firstName, lastName: pivot?.lastName } : null);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryPasskey = React.useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        setError(passkeyErrorMessage(res.error, `${BIOMETRIC_TITLE} n’a pas abouti. Saisis ton code PIN.`));
        setBusy(false);
        return;
      }
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur d’authentification.');
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    void (async () => {
      const last = await getLastAccount();
      setAccount(last);
      const enabled = await biometricEnabledFor(last?.email);
      setBioEnabled(enabled);
      if (enabled) void tryPasskey();
    })();
  }, [tryPasskey]);

  async function submitPin(entered: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyPin({ pin: entered });
      if (!res.valid) {
        setError('Code PIN incorrect.');
        setBusy(false);
        return;
      }
      router.replace('/(tabs)/home');
    } catch {
      // Session expirée ou profil inexistant : retour à la connexion.
      try { await authClient.signOut(); } catch { /* ignore */ }
      router.replace('/(auth)/login');
    }
  }

  async function switchAccount() {
    try { await authClient.signOut(); } catch { /* ignore */ }
    await clearLastAccount();
    router.replace('/(auth)/hub');
  }

  return (
    <Screen scroll={false} contentStyle={{ paddingHorizontal: 0 }}>
      <PinLogin
        initials={initialsOf(account?.firstName, account?.lastName, account?.email)}
        title={account?.firstName ? `Bon retour, ${account.firstName}` : 'Bon retour'}
        subtitle="Saisis ton code PIN à 6 chiffres"
        onComplete={submitPin}
        busy={busy}
        error={error}
        onClearError={() => setError(null)}
        onFaceId={bioEnabled ? () => void tryPasskey() : undefined}
        links={[
          { label: 'Code PIN oublié ?', onPress: () => router.push(account ? `/(auth)/forgot-pin?identifier=${encodeURIComponent(account.email)}` : '/(auth)/forgot-pin') },
          { label: 'Changer de compte', onPress: () => void switchAccount() },
        ]}
      />
    </Screen>
  );
}
