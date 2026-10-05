import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from '@/design/text';
import { useRouter } from 'expo-router';
import { useConvex, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import * as Crypto from 'expo-crypto';
import { useIdnTheme } from '@/design/theme';
import { ErrorNote } from '@/design/components/list';
import { Keypad, PinDots } from '@/design/components/pin-pad';
import { SignupScreen } from '@/components/auth/signup-screen';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { getOnboardingHandle, getOnboardingPivot, getOnboardingProfile, type OnboardingPivot, type OnboardingProfile } from '@/hooks/use-onboarding-state';

function generateInternalPassword(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const bytes = Crypto.getRandomBytes(32);
  let password = '';
  for (const byte of bytes) password += alphabet[byte % alphabet.length];
  return password;
}

type CurrentUser = { email?: string } | null;

/** Attend l'utilisateur exact pour ne jamais finaliser sous une ancienne session. */
async function waitForConvexAuth(fetchMe: () => Promise<CurrentUser>, expectedEmail: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const me = await fetchMe();
      if (me?.email?.toLowerCase() === expectedEmail) return;
    } catch {
      // Le JWT peut être momentanément absent pendant le changement de compte.
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error('La nouvelle session ne s’est pas synchronisée. Réessaie.');
}

function convexErrorData(error: unknown): { code?: string; message?: string } | null {
  if (!(error instanceof ConvexError) || typeof error.data !== 'object') return null;
  return error.data as { code?: string; message?: string };
}

type SignupContext = {
  profile: OnboardingProfile;
  pivot: OnboardingPivot;
  handle: string;
};

export default function SignupPin() {
  const t = useIdnTheme();
  const router = useRouter();
  const convex = useConvex();
  const completeSignup = useMutation(api.onboarding.completeSignup);
  const abandonIncompleteSignup = useMutation(api.onboarding.abandonIncompleteSignup);
  const [signupContext, setSignupContext] = useState<SignupContext | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submitInFlight = useRef(false);

  useEffect(() => {
    void (async () => {
      const [profile, pivot, handle] = await Promise.all([getOnboardingProfile(), getOnboardingPivot(), getOnboardingHandle()]);
      if (!profile || !pivot) {
        router.replace('/(auth)/hub');
        return;
      }
      if (!handle) {
        router.replace('/(auth)/signup/idn');
        return;
      }
      setSignupContext({ profile, pivot, handle });
    })();
  }, [router]);

  async function ensureExpectedSession(handle: string): Promise<void> {
    const expectedEmail = `${handle}@idn.ga`;
    const currentSession = await authClient.getSession();
    const currentEmail = currentSession?.data?.user?.email?.toLowerCase();

    if (currentEmail && currentEmail !== expectedEmail) {
      await authClient.signOut();
    }

    if (currentEmail !== expectedEmail) {
      const result = await authClient.signUp.email({
        email: expectedEmail,
        password: generateInternalPassword(),
        name: handle,
      });
      if (result?.error) {
        const code = result.error.code as string | undefined;
        throw new Error(
          code === 'USER_ALREADY_EXISTS'
            ? 'Cette adresse existe déjà. Si ton inscription a été interrompue, contacte le support.'
            : (result.error.message ?? 'Impossible de créer le compte. Réessaie.'),
        );
      }
    }

    await authClient.updateSession?.();
    await waitForConvexAuth(() => convex.query(api.profile.getCurrentUser, {}), expectedEmail);
  }

  const current = phase === 'enter' ? pin : confirm;
  const filled = current.length;

  function digit(k: string) {
    if (submitting) return;
    setError(null);
    if (phase === 'enter') {
      if (pin.length >= 6) return;
      const next = pin + k;
      setPin(next);
      if (next.length === 6) setTimeout(() => setPhase('confirm'), 150);
    } else {
      if (confirm.length >= 6) return;
      const next = confirm + k;
      setConfirm(next);
      if (next.length === 6) void submit(pin, next);
    }
  }

  function erase() {
    if (submitting) return;
    if (phase === 'enter') setPin((v) => v.slice(0, -1));
    else setConfirm((v) => v.slice(0, -1));
  }

  async function submit(originalPin: string, confirmPin: string) {
    if (submitInFlight.current) return;
    if (originalPin !== confirmPin) {
      setError('Les deux codes sont différents. Recommence.');
      setPin('');
      setConfirm('');
      setPhase('enter');
      return;
    }
    if (!/^\d{6}$/.test(originalPin)) {
      setError('Le PIN doit faire exactement 6 chiffres.');
      return;
    }
    if (!signupContext) {
      setError('Les informations d’inscription sont incomplètes. Recommence.');
      return;
    }
    submitInFlight.current = true;
    setSubmitting(true);
    try {
      await ensureExpectedSession(signupContext.handle);
      await completeSignup({
        profileType: signupContext.profile,
        pivot: signupContext.pivot,
        handle: signupContext.handle,
        pin: originalPin,
      });
      router.replace('/(auth)/signup/bio');
    } catch (err) {
      const data = convexErrorData(err);
      if (data?.code === 'NIP_ALREADY_VERIFIED') {
        setError('Ce NIP est déjà rattaché à une identité vérifiée. Vérifie ta saisie ou contacte le support.');
      } else if (data?.code === 'IDENTITY_ALREADY_VERIFIED') {
        setError('Une identité vérifiée correspond déjà à ces informations. Vérifie ta saisie ou contacte le support.');
      } else {
        setError(data?.message ?? (err instanceof Error ? err.message : 'Erreur lors de l’enregistrement du PIN.'));
      }
      if (data?.code === 'NIP_ALREADY_VERIFIED' || data?.code === 'IDENTITY_ALREADY_VERIFIED') {
        // Le refus est définitif pour cet état civil : le compte ouvert par
        // `ensureExpectedSession` resterait sans profil ni PIN et confisquerait
        // l'adresse choisie. On le supprime et on ferme la session, pour qu'une
        // nouvelle tentative (après correction de l'identité) reparte de zéro.
        try {
          await abandonIncompleteSignup({});
          await authClient.signOut();
        } catch {
          // Nettoyage de courtoisie : un échec ici ne change rien au refus.
        }
      }
      setPin('');
      setConfirm('');
      setPhase('enter');
      submitInFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <SignupScreen
      step={2}
      scroll={false}
      onBack={() => {
        if (phase === 'confirm') {
          setPhase('enter');
          setConfirm('');
          setError(null);
        } else {
          router.back();
        }
      }}
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 8 }}>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
          {submitting ? 'Création de ton compte…' : phase === 'enter' ? 'Crée ton code PIN' : 'Confirme ton code PIN'}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center', maxWidth: 320 }}>
          {phase === 'enter' ? '6 chiffres pour déverrouiller ton identité. Évite ta date de naissance.' : 'Saisis le même code une seconde fois.'}
        </Text>
        {submitting ? <ActivityIndicator color={t.green} style={{ marginTop: 28 }} /> : <PinDots filled={filled} error={!!error} />}
        <View style={{ alignSelf: 'stretch' }}>
          <ErrorNote>{error}</ErrorNote>
        </View>
      </View>
      <View style={{ marginHorizontal: -20, paddingBottom: 12 }}>
        <Keypad onDigit={digit} onDelete={erase} disabled={submitting} />
      </View>
    </SignupScreen>
  );
}
