import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { ErrorNote, ScreenTitle } from '@/design/components/list';
import { OtpInput } from '@/design/components/otp-input';
import { authClient } from '@/lib/auth-client';
import { setOnboardingDone } from '@/hooks/use-app-state';

/**
 * Challenge 2FA au login. Atteint quand un sign-in renvoie
 * `twoFactorRedirect: true` (cf. login.tsx). L'utilisateur saisit son code
 * TOTP à 6 chiffres (`authClient.twoFactor.verifyTotp`) ou, en secours, un
 * code de récupération (`authClient.twoFactor.verifyBackupCode`).
 */
export default function TwoFactorChallenge() {
  const t = useIdnTheme();
  const router = useRouter();
  const [mode, setMode] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBackup = mode === 'backup';
  const canSubmit = isBackup ? code.trim().length > 0 : code.trim().length === 6;

  async function submit() {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = isBackup
        ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
        : await authClient.twoFactor.verifyTotp({ code: code.trim() });
      if (res?.error) {
        setError(
          isBackup
            ? 'Code de secours invalide ou déjà utilisé.'
            : 'Code incorrect. Vérifie ton application d’authentification.',
        );
        setCode('');
        setSubmitting(false);
        return;
      }
      await setOnboardingDone(true);
      router.replace('/(tabs)/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vérification impossible. Réessaie.');
      setCode('');
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode((m) => (m === 'totp' ? 'backup' : 'totp'));
    setCode('');
    setError(null);
  }

  return (
    <Screen
      keyboard
      header={<AppBar title="Double authentification" onBack={() => router.back()} />}
      footer={
        <>
          <IdnButton t={t} full onPress={submit} disabled={!canSubmit} loading={submitting}>Vérifier</IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={switchMode}>
            {isBackup ? 'Utiliser mon application d’authentification' : 'Utiliser un code de secours'}
          </IdnButton>
        </>
      }
    >
      <ScreenTitle
        title={isBackup ? 'Code de secours' : 'Code de ton application'}
        lead={isBackup
          ? 'Saisis l’un des codes de secours que tu as conservés lors de l’activation.'
          : 'Ouvre ton application d’authentification et saisis le code à 6 chiffres affiché pour IDN.'}
      />
      <View style={{ marginTop: 24 }}>
        {isBackup ? (
          <IdnInput t={t} label="Code de secours" value={code} onChangeText={setCode} autoCapitalize="none" mono autoFocus />
        ) : (
          <OtpInput value={code} onChange={(v) => { setError(null); setCode(v); }} autoFocus error={!!error} />
        )}
      </View>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}
