import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar, IconButton } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, DetailRow, Row, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { CARD_GRADIENTS, CARD_TEMPLATES } from '@/data/cards';
import { api } from '@/lib/api';
import { walletCardToUi } from '@/lib/wallet-adapter';
import { cardNumberLabel, cardValidity } from '@/lib/wallet-display';
import { moveItem } from '@/lib/wallet-order';

const PEEK = 64;
const CARD_H = 200;

type WalletItem = ReturnType<typeof walletCardToUi> & { data: Record<string, string> };

/** Face d'une carte dans la pile (aplat de couleur, icône, nom, numéro). */
function CardFace({ card, selected }: { card: WalletItem; selected: boolean }) {
  const t = useIdnTheme();
  const official = card.grad === 'white';
  const bg = card.grad === 'white' ? t.surface : CARD_GRADIENTS[card.grad][0];
  const fg = official ? t.greenText : '#fff';
  const number = cardNumberLabel(card.data);
  return (
    <View
      style={{
        height: CARD_H, borderRadius: 20, padding: 18, backgroundColor: bg, justifyContent: 'space-between',
        borderWidth: selected ? 2 : official ? 1 : 0, borderColor: selected ? t.ink : t.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name={card.icon} size={20} color={fg} />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: '600', color: fg }}>{card.name}</Text>
      </View>
      <View>
        {card.sub ? <Text numberOfLines={1} style={{ fontSize: 13, color: official ? t.ink2 : 'rgba(255,255,255,0.85)' }}>{card.sub}</Text> : null}
        {number ? <Text style={{ marginTop: 4, fontFamily: t.mono, fontSize: 16, letterSpacing: 1.5, color: fg }}>{number}</Text> : null}
      </View>
    </View>
  );
}

/** iCarte (prototype « icarte ») : pile de cartes, détail de la carte touchée. */
export default function ICarteHome() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const wallet = useQuery(api.wallet.listMine, isAuthenticated ? {} : 'skip');
  const setFeatured = useMutation(api.wallet.setFeatured);
  const reorderFeatured = useMutation(api.wallet.reorderFeatured);
  const removeCard = useMutation(api.wallet.remove);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [organize, setOrganize] = React.useState(false);

  const cards: WalletItem[] = (wallet?.cards ?? []).map((c) => ({ ...walletCardToUi(c), data: c.data }));
  // Les cartes du profil d'abord (dans leur ordre), puis les autres.
  const ordered = [...cards.filter((c) => c.featured), ...cards.filter((c) => !c.featured)];
  const featured = ordered.filter((c) => c.featured);
  const selected = ordered.find((c) => c.id === selectedId) ?? ordered[ordered.length - 1];
  const limit = wallet?.featuredLimit ?? 6;

  async function run(fn: () => Promise<unknown>, title: string) {
    try {
      await fn();
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data;
      Alert.alert(title, data?.message ?? (err instanceof Error ? err.message : 'Réessaie.'));
    }
  }

  function confirmDelete(card: WalletItem) {
    Alert.alert('Supprimer la carte ?', `« ${card.name} » sera retirée de ton iCarte.`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => void run(() => removeCard({ cardId: card.id as never }), 'Suppression impossible') },
    ]);
  }

  return (
    <Screen
      inTabs
      header={<AppBar title="iCarte" right={<IconButton icon="plus" label="Ajouter une carte" onPress={() => router.push('/icarte/add-template' as never)} />} />}
    >
      {wallet === undefined ? (
        <Text style={{ marginTop: 24, color: t.muted }}>Chargement…</Text>
      ) : ordered.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <IdnLottie name="icarte" size={140} />
          <Text style={{ marginTop: 8, fontSize: 18, fontWeight: '600', color: t.ink }}>Ton portefeuille est vide</Text>
          <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
            Ajoute ta CNI, ton permis, ta carte CNAMGS ou une carte de fidélité pour les présenter depuis ton téléphone.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 12, fontSize: 13, color: t.muted }}>
            {ordered.length} carte{ordered.length > 1 ? 's' : ''} · touche une carte pour l’afficher
          </Text>
          <View style={{ marginTop: 12 }}>
            {ordered.map((card, i) => {
              const isSel = card.id === selected?.id;
              const collapsed = !isSel && i !== ordered.length - 1;
              // Carte repliée : seule sa bande visible (PEEK) est touchable,
              // la face entière déborde sous la carte suivante.
              return (
                <Pressable
                  key={card.id}
                  onPress={() => (isSel ? router.push(`/icarte/${card.id}` as never) : setSelectedId(card.id))}
                  accessibilityRole="button"
                  accessibilityLabel={isSel ? `${card.name}, ouvrir la carte` : `Afficher ${card.name}`}
                  style={{ height: collapsed ? PEEK : CARD_H, marginBottom: collapsed ? 0 : 12, zIndex: i }}
                >
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <CardFace card={card} selected={isSel} />
                  </View>
                </Pressable>
              );
            })}
          </View>
          {selected ? (
            <Card>
              <DetailRow label="Carte" value={selected.name} />
              {selected.sub ? <DetailRow label="Mention" value={selected.sub} /> : null}
              {cardNumberLabel(selected.data) ? <DetailRow label="Numéro" value={cardNumberLabel(selected.data)!} mono /> : null}
              {cardValidity(selected.data) ? <DetailRow label="Validité" value={cardValidity(selected.data)!} /> : null}
              <DetailRow label="Profil public" value={selected.featured ? 'Affichée' : 'Masquée'} />
            </Card>
          ) : null}
          {selected ? (
            <IdnButton t={t} variant="secondary" full onPress={() => router.push(`/icarte/${selected.id}` as never)} leadIcon={<Icon name="qr" size={16} color={t.ink} />} style={{ marginTop: 12 }}>
              Présenter cette carte
            </IdnButton>
          ) : null}

          <SectionTitle action={organize ? 'Terminé' : 'Organiser'} onAction={() => setOrganize((v) => !v)}>Mes cartes</SectionTitle>
          {organize ? (
            <>
              <Text style={{ fontSize: 13, color: t.muted, marginBottom: 8 }}>
                {`${featured.length}/${limit} cartes affichées sur ton profil public. Les flèches règlent leur ordre.`}
              </Text>
              <Card>
                {ordered.map((card) => {
                  const fi = featured.findIndex((f) => f.id === card.id);
                  return (
                    <View key={card.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56 }}>
                      <View style={{ width: 40, height: 26, borderRadius: 6, backgroundColor: card.grad === 'white' ? t.surface : CARD_GRADIENTS[card.grad][0], borderWidth: card.grad === 'white' ? 1 : 0, borderColor: t.border }} />
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: t.ink }}>{card.name}</Text>
                      {card.featured ? (
                        <>
                          <IconButton icon="chevDn" label={`Descendre ${card.name}`} size={36} plain onPress={() => fi < featured.length - 1 && void run(() => reorderFeatured({ orderedIds: moveItem(featured.map((f) => f.id), fi, 1) as never }), 'Ordre non enregistré')} />
                          <IconButton icon="eye" label={`Masquer ${card.name} du profil`} size={36} plain color={t.greenText} onPress={() => void run(() => setFeatured({ cardId: card.id as never, featured: false }), 'Action impossible')} />
                        </>
                      ) : (
                        <IconButton icon="eyeOff" label={`Afficher ${card.name} sur le profil`} size={36} plain color={t.muted} onPress={() => void run(() => setFeatured({ cardId: card.id as never, featured: true }), 'Action impossible')} />
                      )}
                      <IconButton icon="edit" label={`Modifier ${card.name}`} size={36} plain onPress={() => router.push(`/icarte/edit/${card.id}` as never)} />
                      <IconButton icon="trash" label={`Supprimer ${card.name}`} size={36} plain color={t.redText} onPress={() => confirmDelete(card)} />
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </>
      )}

      <SectionTitle>Ajouter une carte</SectionTitle>
      <Card>
        {CARD_TEMPLATES.map((tp) => (
          <Row key={tp.id} icon={tp.icon} tone="neutral" title={tp.label === 'Visite' ? 'Carte de visite' : tp.label} chevron onPress={() => router.push(`/icarte/add?template=${tp.id}` as never)} />
        ))}
        <Row icon="palette" tone="green" title="Carte personnalisée" sub="Fidélité, adhésion, badge…" chevron onPress={() => router.push('/icarte/custom' as never)} />
      </Card>
    </Screen>
  );
}
