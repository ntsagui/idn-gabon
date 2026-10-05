import React, { useState } from 'react';
import { View, Pressable, Alert, Modal, ScrollView, Share } from 'react-native';
import { Text } from '@/design/text';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import { IdnButton } from '@/design/components/idn-button';
import { IdnFlagBars } from '@/design/mark';
import { CardArtIcon } from '@/components/cards/card-art-icon';
import { Icon } from '@/design/icons';
import { CARD_GRADIENTS } from '@/data/cards';
import { api } from '@/lib/api';
import { gradientToGradKey, walletCardToUi } from '@/lib/wallet-adapter';

function formatLabel(key: string): string {
  if (!key) return '';
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

export default function ICarteCardDetail() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const wallet = useQuery(api.wallet.listMine, isAuthenticated ? {} : 'skip');
  const removeCard = useMutation(api.wallet.remove);
  const [verso, setVerso] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  function confirmDelete() {
    if (!raw || deleting) return;
    Alert.alert(
      'Supprimer cette carte ?',
      `« ${raw.name} » sera retirée de ton portefeuille. Cette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await removeCard({ cardId: raw._id });
              router.back();
            } catch {
              setDeleting(false);
              Alert.alert('Erreur', 'Suppression impossible. Réessaie.');
            }
          },
        },
      ],
    );
  }

  const raw = wallet?.cards.find((c) => c._id === id);

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
        <View style={{ flex: 1, padding: 22, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <Icon name="wallet" size={40} color={t.mutedSoft} />
          <Text style={{ color: t.muted, fontSize: 13 }}>Cette carte n’existe plus.</Text>
        </View>
      </View>
    );
  }

  const card = walletCardToUi(raw);
  const gradKey = gradientToGradKey(raw.gradient);
  const grad = gradKey === 'white' ? CARD_GRADIENTS.green : CARD_GRADIENTS[gradKey];

  const frontEntries = Object.entries(raw.data ?? {});
  const backEntries = Object.entries(raw.backData ?? {});
  const visible = verso ? backEntries : frontEntries;
  const hasBack = backEntries.length > 0;
  const hasContent = visible.length > 0 && visible.some(([, v]) => v && v.length > 0);

  // Champs renseignés uniquement — aucun vide/undefined dans les payloads.
  const filledFront = frontEntries.filter(([, v]) => v && v.length > 0);
  const filledBack = backEntries.filter(([, v]) => v && v.length > 0);

  // Payload QR : représentation locale des champs de la carte (aucune
  // vérification serveur n'existe pour ces cartes déclaratives).
  const qrPayload = JSON.stringify({
    card: raw.name,
    ...(raw.subtitle ? { subtitle: raw.subtitle } : {}),
    data: Object.fromEntries(filledFront),
    ...(filledBack.length > 0 ? { backData: Object.fromEntries(filledBack) } : {}),
  });

  async function shareCard() {
    if (!raw) return;
    const lines: string[] = [raw.name];
    if (raw.subtitle) lines.push(raw.subtitle);
    if (filledFront.length > 0) {
      lines.push('');
      for (const [k, val] of filledFront) lines.push(`${formatLabel(k)} : ${val}`);
    }
    if (filledBack.length > 0) {
      lines.push('');
      for (const [k, val] of filledBack) lines.push(`${formatLabel(k)} : ${val}`);
    }
    try {
      await Share.share({ title: raw.name, message: lines.join('\n') });
    } catch {
      // partage annulé
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader
        t={t}
        title={raw.name}
        onBack={() => router.back()}
        right={
          <Pressable onPress={() => router.push(`/icarte/edit/${raw._id}` as never)} style={{ padding: 4 }}>
            <Icon name="edit" size={18} color={t.muted} />
          </Pressable>
        }
      />
      <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18 }}>
        <View style={{ aspectRatio: 85 / 55, borderRadius: 18, overflow: 'hidden', shadowColor: '#0E7C3A', shadowOpacity: 0.32, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 8 }}>
          <LinearGradient colors={grad as unknown as readonly [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 20 }}>
            <View style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <View style={{ position: 'absolute', right: 14, bottom: 14 }}><IdnFlagBars width={32} height={3} /></View>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <CardArtIcon name={card.icon} color="#fff" size={28} />
              {hasBack ? (
                <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <Text style={{ fontSize: 9, fontWeight: '600', color: '#fff', letterSpacing: 0.4 }}>{verso ? 'VERSO' : 'RECTO'}</Text>
                </View>
              ) : null}
            </View>
            <View style={{ marginTop: 18, flex: 1 }}>
              {!hasContent ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 }}>
                  <Icon name="edit" size={18} color="rgba(255,255,255,0.85)" />
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>Renseigne tes informations</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {visible.map(([k, v], i) => (
                    <View key={`${verso ? 'b' : 'f'}-${i}`} style={{ width: '50%', marginBottom: 12 }}>
                      <Text style={{ fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2 }}>{formatLabel(k).toUpperCase()}</Text>
                      <Text numberOfLines={1} style={{ fontFamily: idnTokens.mono, fontSize: 13, color: '#fff', marginTop: 2 }}>{v || '—'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {hasBack ? (
          <Pressable onPress={() => setVerso((v) => !v)} style={{ marginTop: 14, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="rotate" size={16} color={t.muted} />
            <Text style={{ color: t.muted, fontSize: 12 }}>Toucher pour retourner</Text>
          </Pressable>
        ) : null}

        <View style={{ flex: 1 }} />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <IdnButton
              t={t}
              variant="ghost"
              full
              leadIcon={<Icon name="edit" size={16} color={t.ink} />}
              onPress={() => router.push(`/icarte/edit/${raw._id}` as never)}
            >
              Modifier
            </IdnButton>
          </View>
          <View style={{ flex: 1 }}>
            <IdnButton t={t} variant="ghost" full leadIcon={<Icon name="qr" size={16} color={t.ink} />} onPress={() => setQrOpen(true)}>QR Code</IdnButton>
          </View>
        </View>
        <View style={{ marginTop: 10 }}>
          <IdnButton t={t} variant="primary" size="lg" full leadIcon={<Icon name="share" size={16} color="#fff" />} onPress={shareCard}>Partager</IdnButton>
        </View>
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          style={{ marginTop: 12, padding: 12, alignItems: 'center', opacity: deleting ? 0.5 : 1 }}
        >
          <Text style={{ color: '#B83A3A', fontSize: 13, fontWeight: '600' }}>
            {deleting ? 'Suppression…' : 'Supprimer cette carte'}
          </Text>
        </Pressable>
      </View>

      <Modal visible={qrOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setQrOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: t.borderSoft }}>
            <Pressable onPress={() => setQrOpen(false)}><Text style={{ color: idnTokens.green, fontSize: 14, fontWeight: '500' }}>Fermer</Text></Pressable>
            <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '600', color: t.ink }} numberOfLines={1}>{raw.name}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 26, alignItems: 'center', gap: 18 }}>
            <View style={{ backgroundColor: '#fff', padding: 18, borderRadius: 18, width: 260, height: 260, alignItems: 'center', justifyContent: 'center' }}>
              <QRCode value={qrPayload} size={224} color="#0E110D" backgroundColor="#fff" />
            </View>
            <Text style={{ fontSize: 12, color: t.muted, textAlign: 'center', lineHeight: 18 }}>
              Ce QR contient les informations de la carte, lisibles hors ligne. Il ne prouve aucune vérification par un service.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
