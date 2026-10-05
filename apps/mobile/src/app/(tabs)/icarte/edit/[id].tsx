import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Text } from '@/design/text';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { Icon } from '@/design/icons';
import { CardArtIcon } from '@/components/cards/card-art-icon';
import { CARD_GRADIENTS } from '@/data/cards';
import { api } from '@/lib/api';
import { gradientToGradKey, walletCardToUi } from '@/lib/wallet-adapter';

function formatLabel(key: string): string {
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

export default function ICarteEdit() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const wallet = useQuery(api.wallet.listMine, isAuthenticated ? {} : 'skip');
  const updateCard = useMutation(api.wallet.update);

  const raw = wallet?.cards.find((c) => c._id === id);

  const [name, setName] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [data, setData] = useState<Record<string, string>>({});
  const [backData, setBackData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (raw && !initialised) {
      setName(raw.name);
      setSubtitle(raw.subtitle ?? '');
      setData(raw.data ?? {});
      setBackData(raw.backData ?? {});
      setInitialised(true);
    }
  }, [raw, initialised]);

  if (wallet === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.muted, fontSize: 13 }}>Chargement…</Text>
      </View>
    );
  }
  if (!raw) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <NSheetHeader t={t} title="Carte introuvable" onBack={() => router.back()} />
      </View>
    );
  }

  const card = walletCardToUi(raw);
  const gradKey = gradientToGradKey(raw.gradient);
  const grad = gradKey === 'white' ? CARD_GRADIENTS.green : CARD_GRADIENTS[gradKey];

  async function submit() {
    if (submitting) return;
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Le nom de la carte est obligatoire.');
      return;
    }
    setSubmitting(true);
    try {
      await updateCard({
        cardId: id as never,
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        data,
        backData: Object.keys(backData).length > 0 ? backData : undefined,
      });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Modification impossible.';
      Alert.alert('Erreur', msg);
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader t={t} title="Modifier la carte" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 24, paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ aspectRatio: 85 / 55, maxWidth: 220, alignSelf: 'center', borderRadius: 14, overflow: 'hidden', marginBottom: 24 }}>
          <LinearGradient colors={grad as unknown as readonly [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 16 }}>
            <CardArtIcon name={card.icon} color="#fff" size={18} />
            <View style={{ marginTop: 22 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{name}</Text>
              {subtitle ? <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{subtitle}</Text> : null}
            </View>
          </LinearGradient>
        </View>
        <View style={{ gap: 14 }}>
          <IdnInput t={t} label="Nom" value={name} onChangeText={setName} />
          <IdnInput t={t} label="Sous-titre" value={subtitle} onChangeText={setSubtitle} />
          {Object.keys(data).length > 0 ? (
            <Text style={{ fontSize: 10, color: t.muted, letterSpacing: 1.2, fontWeight: '600', marginTop: 6 }}>RECTO</Text>
          ) : null}
          {Object.entries(data).map(([k, v]) => (
            <IdnInput
              key={`f-${k}`}
              t={t}
              label={formatLabel(k)}
              value={v}
              onChangeText={(nv) => setData((d) => ({ ...d, [k]: nv }))}
            />
          ))}
          {Object.keys(backData).length > 0 ? (
            <Text style={{ fontSize: 10, color: t.muted, letterSpacing: 1.2, fontWeight: '600', marginTop: 6 }}>VERSO</Text>
          ) : null}
          {Object.entries(backData).map(([k, v]) => (
            <IdnInput
              key={`b-${k}`}
              t={t}
              label={formatLabel(k)}
              value={v}
              onChangeText={(nv) => setBackData((d) => ({ ...d, [k]: nv }))}
            />
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 22, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 22), borderTopWidth: 1, borderTopColor: t.borderSoft, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <IdnButton t={t} variant="ghost" size="lg" full onPress={() => router.back()} disabled={submitting}>
            Annuler
          </IdnButton>
        </View>
        <View style={{ flex: 1 }}>
          <IdnButton
            t={t}
            variant="primary"
            size="lg"
            full
            leadIcon={<Icon name="check" size={16} color="#fff" />}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? '…' : 'Enregistrer'}
          </IdnButton>
        </View>
      </View>
    </View>
  );
}
