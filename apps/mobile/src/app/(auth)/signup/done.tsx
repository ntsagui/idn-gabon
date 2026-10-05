import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { Screen } from '@/design/components/screen';
import { LevelBadge } from '@/design/components/badge';
import { Note } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { Icon } from '@/design/icons';
import { api } from '@/lib/api';
import { setLastAccount } from '@/lib/last-account';
import { clearOnboarding } from '@/hooks/use-onboarding-state';
import { setOnboardingDone } from '@/hooks/use-app-state';

/** Compte créé (prototype « signup-done »). */
export default function SignupDone() {
  const t = useIdnTheme();
  const router = useRouter();
  const user = useQuery(api.profile.getCurrentUser);
  const pivot = user?.profile?.pivot;
  const email = user?.email ?? '';
  const level = (user?.profile?.loa ?? 1) as 1 | 2 | 3;

  React.useEffect(() => {
    if (email) void setLastAccount({ email, firstName: pivot?.firstName, lastName: pivot?.lastName });
  }, [email, pivot?.firstName, pivot?.lastName]);

  async function finish(toKyc: boolean) {
    await Promise.all([setOnboardingDone(true), clearOnboarding()]);
    router.replace('/(tabs)/home');
    if (toKyc) router.push('/kyc/intro');
  }

  return (
    <Screen
      scroll={false}
      footer={
        <>
          <IdnButton t={t} full onPress={() => void finish(false)}>Accéder à l’accueil</IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={() => void finish(true)}>Vérifier mon identité</IdnButton>
        </>
      }
    >
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <IdnLottie name="success" size={128} label="Compte créé" />
        <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 22, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
          {pivot?.firstName ? `Bienvenue, ${pivot.firstName}` : 'Bienvenue'}
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
          Ton compte IDN est créé. Ton adresse souveraine est active :
        </Text>
        {email ? (
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.surface2 }}>
            <Icon name="mail" size={16} color={t.ink2} />
            <Text selectable style={{ fontFamily: t.mono, fontSize: 13, color: t.ink }}>{email}</Text>
          </View>
        ) : null}
        <LevelBadge level={level} style={{ marginTop: 12, alignSelf: 'center' }} />
        <Note center style={{ maxWidth: 320 }}>Vérifie ton identité pour passer au Niveau 2 et accéder aux démarches en ligne.</Note>
      </View>
    </Screen>
  );
}
