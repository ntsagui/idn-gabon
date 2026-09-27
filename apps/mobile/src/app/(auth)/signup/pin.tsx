import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvex, useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import * as Crypto from 'expo-crypto';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { NStepShell } from '@/components/chrome/step-shell';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { getOnboardingHandle, getOnboardingPivot, getOnboardingProfile, type OnboardingPivot, type OnboardingProfile } from '@/hooks/use-onboarding-state';

const KEYS: string[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

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
  throw new Error('La nouvelle session ne s’est pas synchronisée. Réessayez.');
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
        router.replace('/(auth)/signup/profil');
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
            ? 'Cette adresse existe déjà. Si votre inscription a été interrompue, contactez le support.'
            : (result.error.message ?? 'Impossible de créer le compte. Réessayez.'),
        );
      }
    }

    await authClient.updateSession?.();
    await waitForConvexAuth(() => convex.query(api.profile.getCurrentUser, {}), expectedEmail);
  }

  const current = phase === 'enter' ? pin : confirm;
  const filled = current.length;

  function press(k: string) {
    if (k === '') return;
    setError(null);
    if (phase === 'enter') {
      if (k === '⌫') return setPin((v) => v.slice(0, -1));
      if (pin.length >= 6) return;
      const next = pin + k;
      setPin(next);
      if (next.length === 6) setPhase('confirm');
    } else {
      if (k === '⌫') return setConfirm((v) => v.slice(0, -1));
      if (confirm.length >= 6) return;
      const next = confirm + k;
      setConfirm(next);
      if (next.length === 6) void submit(pin, next);
    }
  }

  async function submit(originalPin: string, confirmPin: string) {
    if (submitInFlight.current) return;
    if (originalPin !== confirmPin) {
      setError('Les deux codes ne correspondent pas. Recommencez.');
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
      setError('Les informations d’inscription sont incomplètes. Recommencez.');
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
      router.push('/(auth)/signup/bio');
    } catch (err) {
      const data = convexErrorData(err);
      if (data?.code === 'NIP_ALREADY_VERIFIED') {
        setError('Ce NIP est déjà rattaché à une identité vérifiée. Vérifiez votre saisie ou contactez le support.');
      } else if (data?.code === 'IDENTITY_ALREADY_VERIFIED') {
        setError('Une identité vérifiée correspond déjà à ces informations. Vérifiez votre saisie ou contactez le support.');
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
    <NStepShell
      t={t}
      step={4}
      total={5}
      title={phase === 'enter' ? 'Créez votre code PIN' : 'Confirmez votre PIN'}
      sub={phase === 'enter' ? '6 chiffres pour les actions sensibles : signature, validation, accès rapide.' : 'Saisissez le même code pour confirmer.'}
      primary={submitting ? 'Enregistrement…' : 'Confirmer'}
      onBack={() => {
        if (phase === 'confirm') {
          setPhase('enter');
          setConfirm('');
          setError(null);
        } else {
          router.back();
        }
      }}
      onPrimary={() => phase === 'confirm' && void submit(pin, confirm)}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 18,
          paddingVertical: 18,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={{
              width: 20,
              height: 20,
              borderRadius: 9999,
              backgroundColor: i < filled ? idnTokens.green : 'transparent',
              borderWidth: 2,
              borderColor: i < filled ? idnTokens.green : t.border,
            }}
          />
        ))}
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -6,
          marginTop: 8,
        }}
      >
        {KEYS.map((k, i) => (
          <View key={i} style={{ width: '33.3333%', padding: 6 }}>
            <Pressable
              disabled={k === '' || submitting}
              onPress={() => press(k)}
              style={{
                height: 64,
                borderRadius: 14,
                backgroundColor: k === '' ? 'transparent' : t.surface,
                borderWidth: k === '' ? 0 : 1,
                borderColor: t.borderSoft,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: submitting ? 0.6 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '500',
                  color: t.ink,
                  fontFamily: idnTokens.mono,
                }}
              >
                {k}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {error ? (
        <View
          style={{
            backgroundColor: t.dark ? '#3A1212' : '#FBE5E5',
            borderRadius: 12,
            padding: 14,
            marginTop: 14,
          }}
        >
          <Text
            style={{
              color: idnTokens.danger,
              fontSize: idnTokens.text.footnote,
              lineHeight: 19,
            }}
          >
            {error}
          </Text>
        </View>
      ) : null}
    </NStepShell>
  );
}
