import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { ErrorNote, ScreenTitle } from '@/design/components/list';
import { PinLogin } from '@/components/auth/pin-login';
import { authClient } from '@/lib/auth-client';
import { passkeyEnabledFor, passkeyErrorMessage } from '@/lib/passkeys';
import { biometricAvailable, faceUnlockEnabledFor } from '@/lib/face-unlock';
import { getLastAccount, initialsOf, type LastAccount } from '@/lib/last-account';
import { setOnboardingDone } from '@/hooks/use-app-state';

type Phase = 'loading' | 'handle' | 'pin';

const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const IDN_DOMAIN = '@idn.ga';

/**
 * Accepte `handle` ou `handle@idn.ga` indifféremment.
 * Renvoie l'email Better Auth normalisé (lower + suffixe @idn.ga).
 */
function normalizeIdnIdentifier(input: string): { handle: string; email: string } | null {
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  const handle = raw.endsWith(IDN_DOMAIN) ? raw.slice(0, -IDN_DOMAIN.length) : raw;
  if (handle.length < 3 || handle.length > 32) return null;
  if (!HANDLE_REGEX.test(handle)) return null;
  return { handle, email: `${handle}${IDN_DOMAIN}` };
}

/**
 * Connexion : adresse @idn.ga (mémorisée), puis clé d'accès lancée d'office
 * si ce compte en a créé une sur cet appareil, sinon PIN 6 chiffres seul.
 */
export default function Login() {
  const t = useIdnTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ identifier?: string | string[] }>();
  const paramIdentifier = Array.isArray(params.identifier) ? (params.identifier[0] ?? '') : (params.identifier ?? '');
  const [phase, setPhase] = useState<Phase>('loading');
  const [identifier, setIdentifier] = useState(paramIdentifier);
  const [last, setLast] = useState<LastAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pinSetupRequired, setPinSetupRequired] = useState(false);
  const [passkey, setPasskey] = useState(false);

  const normalized = normalizeIdnIdentifier(identifier);

  useEffect(() => {
    void getLastAccount().then((account) => {
      setLast(account);
      const fromParam = paramIdentifier ? normalizeIdnIdentifier(paramIdentifier) : null;
      if (paramIdentifier) {
        if (fromParam) void enterPin(fromParam.email);
        else setPhase('handle');
      } else if (account) {
        setIdentifier(account.email);
        void enterPin(account.email);
      } else {
        setPhase('handle');
      }
    });
    // Une seule fois par adresse reçue : relancer la clé d'accès à chaque rendu
    // rouvrirait la fenêtre système.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramIdentifier]);

  async function enterPin(email: string) {
    setPhase('pin');
    const enabled = await passkeyEnabledFor(email);
    setPasskey(enabled);
    if (enabled) void signInWithPasskey(email);
  }

  function goToPin() {
    if (!normalized) {
      setError('Saisis une adresse IDN valide.');
      return;
    }
    setError(null);
    setPinSetupRequired(false);
    void enterPin(normalized.email);
  }

  function backToHandle() {
    setPhase('handle');
    setError(null);
    setPinSetupRequired(false);
  }

  async function routeAfterAuth(email: string) {
    // Déverrouillage Face ID pas encore activé : on le propose avant d'entrer.
    if (!(await faceUnlockEnabledFor(email)) && (await biometricAvailable())) {
      router.replace('/(auth)/signup/bio?next=/(tabs)/home');
      return;
    }
    router.replace('/(tabs)/home');
  }

  async function signInWithPin(entered: string) {
    if (submitting || !normalized) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authClient.$fetch('/sign-in/pin', {
        method: 'POST',
        body: { email: normalized.email, pin: entered },
      });
      const errorBody = (res?.error ?? null) as { code?: string; status?: number; message?: string } | null;
      if (errorBody) {
        const code = errorBody.code;
        setPinSetupRequired(code === 'PIN_SETUP_REQUIRED');
        if (code === 'EMAIL_NOT_VERIFIED') setError('Adresse non vérifiée. Termine ton inscription ou contacte le support.');
        else if (code === 'PIN_SETUP_REQUIRED') setError('Ce compte n’a pas encore de code PIN. Vérifie ton numéro de mobile pour en créer un.');
        else if (errorBody.status === 429) setError('Trop de tentatives. Réessaie plus tard.');
        else if (code === 'INVALID_PIN') setError('Adresse ou code PIN incorrect.');
        else setError('Connexion impossible pour le moment. Réessaie.');
        setSubmitting(false);
        return;
      }
      // 2FA requise : better-auth n'a pas ouvert de session, il faut valider
      // le code TOTP (ou un code de secours) sur l'écran de challenge.
      if ((res?.data as { twoFactorRedirect?: boolean } | undefined)?.twoFactorRedirect) {
        setSubmitting(false);
        router.push('/(auth)/two-factor' as Href);
        return;
      }
      await setOnboardingDone(true);
      await routeAfterAuth(normalized.email);
    } catch {
      setPinSetupRequired(false);
      setError('Connexion impossible pour le moment. Réessaie.');
      setSubmitting(false);
    }
  }

  async function signInWithPasskey(email: string) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        setError(passkeyErrorMessage(res.error, 'La clé d’accès n’a pas abouti. Saisis ton code PIN.'));
        setSubmitting(false);
        return;
      }
      // La clé choisie par iOS peut appartenir à un autre compte de l'appareil.
      if ((res?.data as { user?: { email?: string } } | undefined)?.user?.email?.toLowerCase() !== email) {
        try { await authClient.signOut(); } catch { /* ignore */ }
        setError('Cette clé d’accès appartient à un autre compte. Saisis ton code PIN.');
        setSubmitting(false);
        return;
      }
      if ((res?.data as { twoFactorRedirect?: boolean } | undefined)?.twoFactorRedirect) {
        setSubmitting(false);
        router.push('/(auth)/two-factor' as Href);
        return;
      }
      await setOnboardingDone(true);
      await routeAfterAuth(email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion par clé d’accès impossible.');
      setSubmitting(false);
    }
  }

  function forgotPin() {
    router.push(normalized ? (`/(auth)/forgot-pin?identifier=${encodeURIComponent(normalized.email)}` as Href) : '/(auth)/forgot-pin');
  }

  if (phase === 'loading') return <Screen scroll={false}>{null}</Screen>;

  if (phase === 'pin' && normalized) {
    const known = last && last.email.toLowerCase() === normalized.email ? last : null;
    return (
      <Screen
        scroll={false}
        contentStyle={{ paddingHorizontal: 0 }}
        header={<AppBar border={false} onBack={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/hub'))} />}
      >
        <PinLogin
          initials={initialsOf(known?.firstName, known?.lastName, normalized.handle)}
          title={known?.firstName ? `Bon retour, ${known.firstName}` : 'Saisis ton code PIN'}
          subtitle={known?.firstName ? 'Saisis ton code PIN à 6 chiffres' : <Text style={{ fontFamily: t.mono }}>{normalized.email}</Text>}
          onComplete={signInWithPin}
          busy={submitting}
          error={error}
          onClearError={() => setError(null)}
          onPasskey={passkey ? () => void signInWithPasskey(normalized.email) : undefined}
          links={[
            { label: pinSetupRequired ? 'Configurer mon PIN' : 'Code PIN oublié ?', onPress: forgotPin },
            { label: 'Autre compte', onPress: backToHandle },
          ]}
        />
      </Screen>
    );
  }

  return (
    <Screen
      keyboard
      header={<AppBar title="Connexion" onBack={() => router.back()} />}
      footer={<IdnButton t={t} full onPress={goToPin} disabled={!normalized}>Continuer</IdnButton>}
    >
      <ScreenTitle title="Ton adresse IDN" lead="Saisis ton adresse @idn.ga pour te connecter." />
      <View style={{ marginTop: 24 }}>
        <IdnInput
          t={t}
          label="Adresse IDN"
          value={identifier}
          onChangeText={(v) => setIdentifier(v.toLowerCase().trim())}
          placeholder="prenom.nom@idn.ga"
          hint="Avec ou sans @idn.ga"
          type="email"
          mono
          autoFocus
        />
      </View>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}
