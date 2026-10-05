import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Text, TextInput } from '@/design/text';
import { useRouter } from 'expo-router';
import { useQuery } from 'convex/react';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { Badge } from '@/design/components/badge';
import { ErrorNote, IconTile, ScreenTitle } from '@/design/components/list';
import { SignupScreen } from '@/components/auth/signup-screen';
import { api } from '@/lib/api';
import {
  getOnboardingHandle,
  getOnboardingPivot,
  getOnboardingProfile,
  setOnboardingHandle,
  type OnboardingPivot,
  type OnboardingProfile,
} from '@/hooks/use-onboarding-state';

const HANDLE_REGEX = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

export default function SignupIdn() {
  const t = useIdnTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [pivot, setPivot] = useState<OnboardingPivot | null>(null);
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await getOnboardingProfile();
      const pv = await getOnboardingPivot();
      const savedHandle = await getOnboardingHandle();
      if (!p || !pv) {
        router.replace('/(auth)/hub');
        return;
      }
      setProfile(p);
      setPivot(pv);
      if (savedHandle) setHandle(savedHandle);
    })();
  }, [router]);

  const suggestions = useQuery(
    api.onboarding.suggestIdnHandles,
    pivot
      ? {
          firstName: pivot.firstName,
          lastName: pivot.lastName,
          dateOfBirth: pivot.dateOfBirth,
        }
      : 'skip',
  );

  useEffect(() => {
    if (!suggestions || suggestions.length === 0 || handle) return;
    const first = suggestions.find((s) => s.available) ?? suggestions[0];
    if (first) setHandle(first.handle);
  }, [suggestions, handle]);

  const handleNormalized = handle.trim().toLowerCase();
  const handleValid = handleNormalized.length >= 3 && handleNormalized.length <= 32 && HANDLE_REGEX.test(handleNormalized);
  const availability = useQuery(api.onboarding.checkIdnHandleAvailability, handleValid ? { handle: handleNormalized } : 'skip');

  const status = useMemo(() => {
    if (!handle) {
      return { ok: false, neutral: true, label: 'Choisis une adresse' };
    }
    if (!handleValid) {
      return {
        ok: false,
        neutral: false,
        label: 'Caractères autorisés : lettres minuscules, chiffres, points, tirets.',
      };
    }
    if (!availability) {
      return { ok: false, neutral: true, label: 'Vérification…' };
    }
    if (availability.available) {
      return {
        ok: true,
        neutral: false,
        label: 'Disponible',
      };
    }
    return {
      ok: false,
      neutral: false,
      label: 'Déjà attribuée à un autre compte',
    };
  }, [handle, handleValid, availability]);

  async function reserve() {
    if (!profile || !pivot || !handleValid || !availability?.available) return;
    setError(null);
    await setOnboardingHandle(handleNormalized);
    router.push('/(auth)/signup/pin');
  }

  const visibleSuggestions = suggestions ? suggestions.slice(0, 4) : [];
  const customIsSuggestion = visibleSuggestions.some((s) => s.handle === handleNormalized);

  return (
    <SignupScreen
      step={1}
      keyboard
      footer={
        <IdnButton t={t} full onPress={reserve} disabled={!status.ok}>
          {status.ok ? `Valider ${handleNormalized}@idn.ga` : 'Valider cette adresse'}
        </IdnButton>
      }
    >
      <ScreenTitle
        title="Choisis ton adresse souveraine"
        lead="Ton adresse @idn.ga est ton identifiant officiel et l’adresse de ton iBoîte. Elle ne pourra plus être modifiée."
      />
      <Text style={{ marginTop: 24, marginBottom: 8, fontSize: 14, fontWeight: '600', color: t.ink }}>Propositions</Text>
      {suggestions === undefined ? (
        <ActivityIndicator color={t.green} style={{ marginVertical: 16 }} />
      ) : (
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          {visibleSuggestions.map((s) => {
            const sel = s.handle === handleNormalized;
            return (
              <Pressable
                key={s.handle}
                onPress={() => s.available && setHandle(s.handle)}
                disabled={!s.available}
                accessibilityRole="radio"
                accessibilityState={{ checked: sel, disabled: !s.available }}
                accessibilityLabel={`${s.handle}@idn.ga, ${s.available ? 'disponible' : 'déjà attribuée'}`}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1,
                  borderColor: sel ? t.green : t.border,
                  backgroundColor: sel ? t.greenBadge : s.available ? t.surface : t.surface2,
                }}
              >
                <IconTile icon="mail" tone={s.available ? 'green' : 'neutral'} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text numberOfLines={1} style={{ fontFamily: t.mono, fontSize: 14, color: t.ink }}>{s.handle}@idn.ga</Text>
                  <Badge tone={s.available ? 'green' : 'neutral'} icon={s.available ? 'check' : 'close'} style={{ paddingVertical: 1, paddingHorizontal: 8 }}>
                    {s.available ? 'Disponible' : 'Déjà attribuée'}
                  </Badge>
                </View>
                <View style={{ width: 20, height: 20, borderRadius: 9999, borderWidth: 1.5, borderStyle: s.available ? 'solid' : 'dashed', borderColor: sel ? t.green : t.muted, alignItems: 'center', justifyContent: 'center' }}>
                  {sel ? <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: t.green }} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={{ marginTop: 24, marginBottom: 6, fontSize: 14, fontWeight: '600', color: t.ink }}>Ou choisis la tienne</Text>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 10, paddingHorizontal: 13,
          borderWidth: 2, backgroundColor: t.surface,
          borderColor: handle && !customIsSuggestion ? (status.ok ? t.green : status.neutral ? t.muted : t.redText) : t.border,
        }}
      >
        <TextInput
          value={customIsSuggestion ? '' : handle}
          onChangeText={(v) => setHandle(v.toLowerCase().trim())}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="prenom.nom"
          placeholderTextColor={t.muted}
          accessibilityLabel="Adresse personnalisée, avant @idn.ga"
          style={{ flex: 1, color: t.ink, fontSize: 16, fontFamily: t.mono, height: '100%', paddingVertical: 0 }}
        />
        <Text style={{ fontFamily: t.mono, fontSize: 16, color: t.muted }}>@idn.ga</Text>
      </View>
      {handle && !customIsSuggestion ? (
        <Text accessibilityLiveRegion="polite" style={{ marginTop: 6, fontSize: 13, color: status.neutral ? t.muted : status.ok ? t.greenText : t.redText }}>{status.label}</Text>
      ) : (
        <Text style={{ marginTop: 6, fontSize: 13, color: t.muted }}>Lettres minuscules, chiffres, points et tirets.</Text>
      )}
      <ErrorNote>{error}</ErrorNote>
    </SignupScreen>
  );
}
