import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/design/text';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { Icon } from '@/design/icons';
import { CardArtIcon } from '@/components/cards/card-art-icon';
import { CARD_GRADIENTS, CUSTOM_COLORS, CUSTOM_ICONS, type GradKey } from '@/data/cards';
import type { IconName } from '@/design/icons';
import { api } from '@/lib/api';
import { gradKeyToGradient } from '@/lib/wallet-adapter';

export default function ICarteCustom() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createCard = useMutation(api.wallet.create);

  const [name, setName] = useState('Ma Carte');
  const [subtitle, setSubtitle] = useState('');
  const [color, setColor] = useState<GradKey>('green');
  const [icon, setIcon] = useState<IconName>('cc');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à ta carte.');
      return;
    }
    setSubmitting(true);
    try {
      await createCard({
        type: 'custom',
        name: name.trim(),
        subtitle: subtitle.trim() || undefined,
        gradient: gradKeyToGradient(color),
        iconKey: icon,
        isOfficialStyle: false,
        data: {},
      });
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Création impossible.';
      Alert.alert('Erreur', msg);
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader t={t} title="Carte personnalisée" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 20, paddingBottom: 14 }} showsVerticalScrollIndicator={false}>
        <View style={{ aspectRatio: 85 / 55, maxWidth: 220, alignSelf: 'center', borderRadius: 14, overflow: 'hidden', marginBottom: 22 }}>
          <LinearGradient colors={CARD_GRADIENTS[color] as unknown as readonly [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 16 }}>
            <CardArtIcon name={icon} color="#fff" size={18} />
            <Text style={{ marginTop: 22, fontSize: 13, fontWeight: '700', color: '#fff' }}>{name || 'Ma Carte'}</Text>
            {subtitle ? <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{subtitle}</Text> : null}
          </LinearGradient>
        </View>

        <IdnInput t={t} label="Nom" value={name} onChangeText={setName} />
        <View style={{ marginTop: 12 }}>
          <IdnInput t={t} label="Sous-titre (optionnel)" value={subtitle} onChangeText={setSubtitle} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 10, color: t.muted, letterSpacing: 1.2, fontWeight: '600', marginBottom: 8 }}>COULEUR</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CUSTOM_COLORS.map((c) => {
              const sel = c.id === color;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setColor(c.id)}
                  style={{ width: '15%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: sel ? idnTokens.green : 'transparent' }}
                >
                  <LinearGradient colors={CARD_GRADIENTS[c.id] as unknown as readonly [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 10, color: t.muted, letterSpacing: 1.2, fontWeight: '600', marginBottom: 8 }}>ICÔNE</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CUSTOM_ICONS.map((ic) => {
              const sel = ic.id === icon;
              return (
                <Pressable
                  key={ic.id}
                  onPress={() => setIcon(ic.id)}
                  style={{ width: '15%', aspectRatio: 1, borderRadius: 10, backgroundColor: t.surface, borderWidth: 2, borderColor: sel ? idnTokens.green : t.border, alignItems: 'center', justifyContent: 'center' }}
                >
                  <CardArtIcon name={ic.id} color={sel ? idnTokens.green : t.ink2} size={18} />
                </Pressable>
              );
            })}
          </View>
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
            leadIcon={<Icon name="plus" size={16} color="#fff" />}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? '…' : 'Créer'}
          </IdnButton>
        </View>
      </View>
    </View>
  );
}
