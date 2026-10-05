import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '@/design/text';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { IdnButton } from '@/design/components/idn-button';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import { Icon } from '@/design/icons';
import { api } from '@/lib/api';

type Step = 'choose' | 'locating' | 'form';

type FormState = {
  latitude: number | null;
  longitude: number | null;
  district: string;
  city: string;
  postalCode: string;
  country: string;
  addressLine: string;
};

const INITIAL_FORM: FormState = {
  latitude: null,
  longitude: null,
  district: '',
  city: '',
  postalCode: '',
  country: 'Gabon',
  addressLine: '',
};

/**
 * Sheet de configuration de l'adresse iBoîte (équivalent mobile du
 * `AddressSetupModal` web). Au Gabon les adresses formelles sont rares ; on
 * privilégie la géolocalisation native (`expo-location`) puis on laisse le
 * citoyen affiner. Tombe en saisie manuelle si la géoloc est refusée ou
 * impossible.
 */
export default function IBoiteAddressSetup() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ accountId?: string }>();
  const { isAuthenticated } = useConvexAuth();
  const setAddress = useMutation(api.iboite.accounts.setAddress);

  const [step, setStep] = useState<Step>('choose');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  async function startGps() {
    if (!isAuthenticated || !params.accountId) {
      Alert.alert('Erreur', 'Compte iBoîte introuvable.');
      return;
    }
    setStep('locating');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Géolocalisation refusée',
          'Autorise la géolocalisation dans les réglages ou saisis ton adresse à la main.',
        );
        setStep('choose');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      let resolved: Location.LocationGeocodedAddress | null = null;
      try {
        const list = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        resolved = list[0] ?? null;
      } catch {
        // Reverse geocoder indisponible — on continue avec juste les coords.
      }
      const districtParts = [resolved?.subregion, resolved?.district, resolved?.name]
        .filter((s): s is string => Boolean(s && s.trim()));
      const addressLine = [
        resolved?.streetNumber,
        resolved?.street,
        resolved?.city,
        resolved?.region,
        resolved?.country,
      ]
        .filter((s): s is string => Boolean(s && s.trim()))
        .join(', ');
      setForm({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        district: districtParts[0] ?? '',
        city: resolved?.city ?? resolved?.subregion ?? '',
        postalCode: resolved?.postalCode ?? '',
        country: resolved?.country ?? 'Gabon',
        addressLine,
      });
      setStep('form');
    } catch (err) {
      Alert.alert(
        'Géolocalisation impossible',
        err instanceof Error ? err.message : 'Réessaie ou saisis ton adresse à la main.',
      );
      setStep('choose');
    }
  }

  function startManual() {
    setForm(INITIAL_FORM);
    setStep('form');
  }

  async function submit() {
    if (submitting) return;
    if (!params.accountId) {
      Alert.alert('Erreur', 'Compte iBoîte introuvable.');
      return;
    }
    if (form.latitude === null && !form.city.trim()) {
      Alert.alert('Adresse incomplète', 'Indique au moins ta ville ou active la géolocalisation.');
      return;
    }
    setSubmitting(true);
    try {
      await setAddress({
        accountId: params.accountId as never,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        district: form.district.trim() || undefined,
        addressLine: form.addressLine.trim() || undefined,
        city: form.city.trim() || undefined,
        postalCode: form.postalCode.trim() || undefined,
        country: form.country.trim() || 'Gabon',
      });
      router.back();
    } catch (err) {
      Alert.alert(
        'Enregistrement impossible',
        err instanceof Error ? err.message : 'Réessaie plus tard.',
      );
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader t={t} title="Mon adresse postale" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 14,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'choose' ? (
          <View style={{ gap: 10 }}>
            <Pressable
              onPress={startGps}
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: t.dark ? '#0F2A18' : idnTokens.greenSoft,
                borderWidth: 1,
                borderColor: idnTokens.green,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  backgroundColor: idnTokens.green,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="pinLoc" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: idnTokens.green }}>
                  Utiliser ma position GPS
                </Text>
                <Text style={{ fontSize: 11, color: t.ink2, marginTop: 2 }}>
                  Recommandé — précis et instantané
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={startManual}
              style={{
                padding: 14,
                borderRadius: 14,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 9999,
                  backgroundColor: t.surface2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="edit" size={18} color={t.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>
                  Saisir manuellement
                </Text>
              </View>
            </Pressable>

            {/* Note explicative — placée *sous* les deux options pour ne
                pas ouvrir la modal sur un bloc de texte petit et froid. */}
            <Text style={{ fontSize: 12, color: t.muted, lineHeight: 18, marginTop: 14 }}>
              Au Gabon les adresses postales formelles sont rares. Nous utilisons ta
              position GPS pour localiser ton logement — tu peux compléter
              manuellement si besoin.
            </Text>
          </View>
        ) : null}

        {step === 'locating' ? (
          <View style={{ paddingVertical: 24, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={idnTokens.green} />
            <Text style={{ fontSize: 13, color: t.ink, fontWeight: '600' }}>
              Localisation en cours…
            </Text>
            <Text style={{ fontSize: 11, color: t.muted, textAlign: 'center', maxWidth: 260 }}>
              Autorise la géolocalisation à l’invite système pour continuer.
            </Text>
          </View>
        ) : null}

        {step === 'form' ? (
          <View style={{ gap: 12 }}>
            {form.latitude !== null && form.longitude !== null ? (
              <View
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: t.dark ? '#0F2A18' : idnTokens.greenSoft,
                  borderWidth: 1,
                  borderColor: idnTokens.green,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Icon name="pinLoc" size={16} color={idnTokens.green} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: idnTokens.green }}>
                    Adresse détectée
                  </Text>
                  <Text style={{ fontSize: 10, color: t.ink2, marginTop: 2 }}>
                    Vérifie les champs ci-dessous avant de confirmer.
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: t.muted,
                      fontFamily: idnTokens.mono,
                      marginTop: 4,
                    }}
                  >
                    {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                  </Text>
                </View>
              </View>
            ) : null}

            <Field
              t={t}
              label="Quartier"
              placeholder="ex. Akanda, Glass, Nzeng-Ayong"
              value={form.district}
              onChange={(v) => setForm({ ...form, district: v })}
            />
            <Field
              t={t}
              label="Ville"
              placeholder="ex. Libreville"
              value={form.city}
              onChange={(v) => setForm({ ...form, city: v })}
            />
            <Field
              t={t}
              label="Boîte postale (optionnel)"
              placeholder="ex. BP 1000"
              value={form.postalCode}
              onChange={(v) => setForm({ ...form, postalCode: v })}
            />
            <Field
              t={t}
              label="Pays"
              value={form.country}
              onChange={(v) => setForm({ ...form, country: v })}
            />
            <Field
              t={t}
              label="Adresse complète"
              placeholder="Précise si besoin (point de repère, immeuble…)"
              value={form.addressLine}
              onChange={(v) => setForm({ ...form, addressLine: v })}
              multiline
            />

            <Pressable
              onPress={startGps}
              style={{ alignSelf: 'flex-start', paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Icon name="rotate" size={12} color={idnTokens.green} />
              <Text style={{ fontSize: 11, color: idnTokens.green, fontWeight: '600' }}>
                Réessayer la géolocalisation
              </Text>
            </Pressable>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <IdnButton t={t} variant="ghost" size="md" onPress={() => router.back()} disabled={submitting}>
                Annuler
              </IdnButton>
              <View style={{ flex: 1 }}>
                <IdnButton t={t} variant="primary" size="md" full onPress={submit} disabled={submitting}>
                  {submitting ? 'Enregistrement…' : 'Enregistrer mon adresse'}
                </IdnButton>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Field({
  t,
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  t: ReturnType<typeof useIdnTheme>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 11, color: t.ink2, fontWeight: '600' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        style={{
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 10,
          minHeight: multiline ? 56 : 40,
          backgroundColor: t.surface,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: 10,
          color: t.ink,
          fontSize: 13,
        }}
      />
    </View>
  );
}
