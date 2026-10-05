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
import { Icon } from '@/design/icons';
import { PinLogin } from '@/components/auth/pin-login';
import { authClient } from '@/lib/auth-client';
import { listPasskeys, passkeyErrorMessage } from '@/lib/passkeys';
import { BIOMETRIC } from '@/lib/biometric-label';
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

/** Connexion : adresse @idn.ga (mémorisée), puis PIN 6 chiffres ou Face ID (passkey). */
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

  const normalized = normalizeIdnIdentifier(identifier);

  useEffect(() => {
    void getLastAccount().then((account) => {
      setLast(account);
      if (paramIdentifier) {
        setPhase(normalizeIdnIdentifier(paramIdentifier) ? 'pin' : 'handle');
      } else if (account) {
        setIdentifier(account.email);
        setPhase('pin');
      } else {
        setPhase('handle');
      }
    });
  }, [paramIdentifier]);

  function goToPin() {
    if (!normalized) {
      setError('Saisis une adresse IDN valide.');
      return;
    }
    setError(null);
    setPinSetupRequired(false);
    setPhase('pin');
  }

  function backToHandle() {
    setPhase('handle');
    setError(null);
    setPinSetupRequired(false);
  }

  async function routeAfterAuth() {
    // Sans passkey enrôlé, on propose Face ID avant d'entrer dans l'app.
    // En cas d'erreur réseau (ou plugin indispo), on va à l'accueil sans bloquer.
    try {
      const data = await listPasskeys();
      if (data.length === 0) {
        router.replace('/(auth)/signup/bio?next=/(tabs)/home');
        return;
      }
    } catch {
      // ignore — fallback home
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
      await routeAfterAuth();
    } catch {
      setPinSetupRequired(false);
      setError('Connexion impossible pour le moment. Réessaie.');
      setSubmitting(false);
    }
  }

  async function signInWithPasskey() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authClient.signIn.passkey();
      if (res?.error) {
        setError(passkeyErrorMessage(res.error, 'Aucune clé d’accès utilisable sur cet appareil.'));
        setSubmitting(false);
        return;
      }
      if ((res?.data as { twoFactorRedirect?: boolean } | undefined)?.twoFactorRedirect) {
        setSubmitting(false);
        router.push('/(auth)/two-factor' as Href);
        return;
      }
      await setOnboardingDone(true);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : `Connexion par ${BIOMETRIC} impossible.`);
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
          onFaceId={signInWithPasskey}
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
      footer={
        <>
          <IdnButton t={t} full onPress={goToPin} disabled={!normalized}>Continuer</IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={signInWithPasskey} loading={submitting} leadIcon={<Icon name="scanFace" size={18} color={t.ink} />}>
            {`Se connecter avec ${BIOMETRIC}`}
          </IdnButton>
        </>
      }
    >
      <ScreenTitle title="Ton adresse IDN" lead="Saisis ton adresse @idn.ga pour te connecter avec ton code PIN." />
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
