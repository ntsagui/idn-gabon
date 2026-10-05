import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnMark } from '@/design/mark';
import { IdnButton } from '@/design/components/idn-button';
import { Screen } from '@/design/components/screen';
import { IconTile } from '@/design/components/list';
import { PROFILS } from '@/data/profils';
import { getOnboardingProfile, setOnboardingProfile, type OnboardingProfile } from '@/hooks/use-onboarding-state';

/** Bienvenue et choix du profil (prototype « welcome »). */
export default function Welcome() {
  const t = useIdnTheme();
  const router = useRouter();
  const [profile, setProfile] = React.useState<OnboardingProfile>('citizen');

  React.useEffect(() => {
    void getOnboardingProfile().then((saved) => saved && saved !== 'developer' && setProfile(saved));
  }, []);

  async function createAccount() {
    await setOnboardingProfile(profile);
    router.push('/(auth)/signup/pivot');
  }

  return (
    <Screen
      footer={
        <>
          <IdnButton t={t} full onPress={createAccount}>Créer mon compte</IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={() => router.push('/(auth)/login')}>J’ai déjà un compte</IdnButton>
        </>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
        <IdnMark size={40} />
        <View>
          <Text style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: t.muted }}>République gabonaise</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: t.ink }}>Identité Numérique</Text>
        </View>
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 32, fontSize: 28, fontWeight: '600', lineHeight: 33, letterSpacing: -0.56, color: t.ink }}>
        Ton identité, reconnue par l’État, <Text style={{ color: t.greenText }}>dans ta poche.</Text>
      </Text>
      <Text style={{ marginTop: 12, fontSize: 15, lineHeight: 22, color: t.ink2 }}>
        Un seul compte pour te connecter aux services publics, présenter ta carte et recevoir tes courriers officiels.
      </Text>

      <Text style={{ marginTop: 28, marginBottom: 8, fontSize: 14, fontWeight: '600', color: t.ink }}>Choisis ton profil</Text>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        {PROFILS.map((p) => {
          const sel = p.id === profile;
          return (
            <Pressable
              key={p.id}
              onPress={() => setProfile(p.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sel }}
              accessibilityLabel={`${p.label}, ${p.sub}`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1,
                borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface,
              }}
            >
              <IconTile icon={p.icon} tone={sel ? 'green' : 'neutral'} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: t.ink }}>{p.label}</Text>
                <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{p.sub}</Text>
              </View>
              <View style={{ width: 20, height: 20, borderRadius: 9999, borderWidth: 1.5, borderColor: sel ? t.green : t.muted, alignItems: 'center', justifyContent: 'center' }}>
                {sel ? <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: t.green }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
