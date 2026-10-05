import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '@/design/text';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as LocalAuth from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { ErrorNote } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { Icon } from '@/design/icons';
import { SignupScreen } from '@/components/auth/signup-screen';
import { authClient } from '@/lib/auth-client';
import { passkeyErrorMessage } from '@/lib/passkeys';
import { BIOMETRIC, BIOMETRIC_TITLE } from '@/lib/biometric-label';

// Conservé pour compat des composants existants qui lisent ce flag
// (ex: launcher.tsx, profile.tsx). À terme, on bascule entièrement sur
// l'existence d'un passkey côté serveur (passkey.listUserPasskeys).
export const BIOMETRIC_KEY = 'idn.biometricEnabled';

export default function SignupBio() {
  const t = useIdnTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextHref: Href = (params.next as Href) ?? '/(auth)/signup/done';
  const [available, setAvailable] = useState<boolean>(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Sur web (Expo web), on suppose WebAuthn dispo dans le navigateur.
      // Sur natif, on vérifie le hardware biométrique pour ajuster le copy.
      if (Platform.OS === 'web') {
        setAvailable(typeof window !== 'undefined' && 'PublicKeyCredential' in window);
        return;
      }
      try {
        const hasHw = await LocalAuth.hasHardwareAsync();
        const enrolled = await LocalAuth.isEnrolledAsync();
        setAvailable(hasHw && enrolled);
      } catch {
        setAvailable(false);
      }
    })();
  }, []);

  async function activate() {
    setActivating(true);
    setError(null);
    try {
      const res = await authClient.passkey.addPasskey({ name: BIOMETRIC_TITLE });
      if (res?.error) {
        await AsyncStorage.setItem(BIOMETRIC_KEY, '0');
        setError(passkeyErrorMessage(res.error, 'Impossible de créer la clé d’accès. Réessaie ou continue avec ton PIN.'));
        setActivating(false);
        return;
      }
      await AsyncStorage.setItem(BIOMETRIC_KEY, '1');
    } catch (err) {
      await AsyncStorage.setItem(BIOMETRIC_KEY, '0');
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'activation.');
      setActivating(false);
      return;
    }
    router.replace(nextHref);
  }

  async function skip() {
    await AsyncStorage.setItem(BIOMETRIC_KEY, '0');
    router.replace(nextHref);
  }

  const fromLogin = !!params.next;
  const content = (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <IdnLottie name="biometric" size={128} loop label="Reconnaissance biométrique" />
      <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 22, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
        {available ? `Active ${BIOMETRIC}` : 'Biométrie indisponible'}
      </Text>
      <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center', maxWidth: 320 }}>
        {available
          ? 'Déverrouille l’app et connecte-toi sans saisir ton PIN. Une clé d’accès (passkey) est créée et reste sur cet appareil.'
          : `Aucun capteur biométrique n’est configuré sur cet appareil. Tu pourras activer ${BIOMETRIC} plus tard dans Profil.`}
      </Text>
      <View style={{ alignSelf: 'stretch' }}>
        <ErrorNote>{error}</ErrorNote>
      </View>
    </View>
  );
  const footer = (
    <>
      {available ? (
        <IdnButton t={t} full onPress={activate} loading={activating} leadIcon={<Icon name="scanFace" size={18} color="#fff" />}>
          {`Activer ${BIOMETRIC}`}
        </IdnButton>
      ) : null}
      <IdnButton t={t} variant="ghost" full onPress={skip} disabled={activating}>
        {available ? 'Plus tard' : 'Continuer'}
      </IdnButton>
    </>
  );
  if (fromLogin) {
    return (
      <Screen scroll={false} header={<AppBar title="Connexion rapide" />} footer={footer}>
        {content}
      </Screen>
    );
  }
  return (
    <SignupScreen step={3} scroll={false} footer={footer} onBack={skip}>
      {content}
    </SignupScreen>
  );
}
