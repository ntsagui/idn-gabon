import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { ErrorNote } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { Icon } from '@/design/icons';
import { SignupScreen } from '@/components/auth/signup-screen';
import { biometricAvailable, confirmWithBiometrics, setFaceUnlockForSession } from '@/lib/face-unlock';
import { BIOMETRIC, BIOMETRIC_TITLE } from '@/lib/biometric-label';

export default function SignupBio() {
  const t = useIdnTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const nextHref: Href = (params.next as Href) ?? '/(auth)/signup/done';
  const [available, setAvailable] = useState<boolean>(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void biometricAvailable().then(setAvailable);
  }, []);

  async function activate() {
    setActivating(true);
    setError(null);
    // On fait reconnaître le visage une fois avant d'activer, pour que le
    // premier déverrouillage ne soit pas un essai à l'aveugle.
    if (!(await confirmWithBiometrics(`Activer ${BIOMETRIC}`))) {
      setError(`${BIOMETRIC_TITLE} n’a pas abouti. Réessaie ou continue avec ton PIN.`);
      setActivating(false);
      return;
    }
    await setFaceUnlockForSession(true);
    router.replace(nextHref);
  }

  async function skip() {
    await setFaceUnlockForSession(false);
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
          ? 'Déverrouille l’app sans saisir ton PIN. La reconnaissance se fait sur ton téléphone : rien n’est envoyé à IDN.'
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
