import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useRouter, type Href } from 'expo-router';
import { useIdnTheme } from '@/design/theme';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { ErrorNote, ScreenTitle } from '@/design/components/list';
import { SignupScreen } from '@/components/auth/signup-screen';
import { IdnDateInput } from '@/design/components/idn-date-input';
import {
  getOnboardingProfile,
  getOnboardingPivot,
  setOnboardingPivot,
} from '@/hooks/use-onboarding-state';

const GENDERS: { v: 'M' | 'F'; label: string }[] = [
  { v: 'M', label: 'Masculin' },
  { v: 'F', label: 'Féminin' },
];

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function SignupPivot() {
  const t = useIdnTheme();
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('F');
  const [nat, setNat] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const profile = await getOnboardingProfile();
      if (!profile) {
        router.replace('/(auth)/hub');
        return;
      }
      const saved = await getOnboardingPivot();
      if (saved) {
        setFirstName(saved.firstName);
        setLastName(saved.lastName);
        setDob(saved.dateOfBirth);
        if (saved.gender === 'M' || saved.gender === 'F') setGender(saved.gender);
        setBirthPlace(saved.birthPlace);
        setNat(saved.nationality);
        if (saved.phone) setPhone(saved.phone);
      } else if (profile === 'citizen') {
        setNat('Gabonaise');
      }
    })();
  }, [router]);

  const dobValid = isIsoDate(dob);
  const canSubmit = !!(firstName.trim() && lastName.trim() && dobValid && birthPlace.trim() && nat.trim()) && !submitting;

  async function next() {
    if (!canSubmit) {
      setError('Tous les champs sont obligatoires.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setOnboardingPivot({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dob,
        gender,
        birthPlace: birthPlace.trim(),
        nationality: nat.trim(),
        phone: phone.trim() || undefined,
      });
      router.push('/(auth)/signup/idn' as Href);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      setError(msg);
      setSubmitting(false);
    }
  }

  return (
    <SignupScreen
      step={0}
      keyboard
      footer={
        <IdnButton t={t} full onPress={next} disabled={!canSubmit} loading={submitting}>
          Continuer
        </IdnButton>
      }
    >
      <ScreenTitle title="Ton identité" lead="Telle qu’elle figure sur tes documents officiels. Tu la feras vérifier ensuite pour passer au Niveau 2." />
      <View style={{ gap: 18, marginTop: 24 }}>
        <IdnInput t={t} label="Prénom" value={firstName} onChangeText={setFirstName} placeholder="Awa" autoCapitalize="words" autoFocus />
        <IdnInput t={t} label="Nom" value={lastName} onChangeText={setLastName} placeholder="Mboumba" autoCapitalize="words" />
        <IdnDateInput t={t} label="Date de naissance" value={dob} onChange={setDob} />
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 6 }}>Sexe</Text>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 8 }}>
            {GENDERS.map((g) => {
              const sel = g.v === gender;
              return (
                <Pressable
                  key={g.v}
                  onPress={() => setGender(g.v)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: sel }}
                  style={{
                    flex: 1, height: 50, borderRadius: 10, borderWidth: sel ? 2 : 1, alignItems: 'center', justifyContent: 'center',
                    borderColor: sel ? t.green : t.muted, backgroundColor: sel ? t.greenBadge : t.surface,
                  }}
                >
                  <Text style={{ fontSize: 15, color: t.ink, fontWeight: sel ? '600' : '400' }}>{g.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <IdnInput t={t} label="Lieu de naissance" value={birthPlace} onChangeText={setBirthPlace} placeholder="Libreville" autoCapitalize="words" />
        <IdnInput t={t} label="Nationalité" value={nat} onChangeText={setNat} autoCapitalize="words" />
        <IdnInput
          t={t}
          label="Téléphone (facultatif)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+241 77 12 34 56"
          type="tel"
          hint="Il sert à récupérer ton code PIN par SMS."
        />
      </View>
      <ErrorNote>{error}</ErrorNote>
    </SignupScreen>
  );
}
