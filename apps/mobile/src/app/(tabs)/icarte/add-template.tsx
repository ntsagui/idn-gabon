import React from 'react';
import { useRouter } from 'expo-router';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, Row, ScreenTitle } from '@/design/components/list';
import { CARD_TEMPLATES } from '@/data/cards';

const LABELS: Record<string, string> = {
  cni: 'Carte nationale d’identité',
  driving: 'Permis de conduire',
  transport: 'Carte de transport',
  health: 'Carte santé (CNAMGS)',
  bank: 'Carte bancaire',
  business: 'Carte de visite',
};

/** Choix du type de carte à ajouter dans iCarte. */
export default function ICarteAddTemplate() {
  const router = useRouter();
  return (
    <Screen header={<AppBar title="Ajouter une carte" onBack={() => router.back()} />}>
      <ScreenTitle title="Quel type de carte ?" lead="Les informations restent sur ton compte IDN. Tu pourras les modifier à tout moment." />
      <Card style={{ marginTop: 20 }}>
        {CARD_TEMPLATES.map((tp) => (
          <Row key={tp.id} icon={tp.icon} title={LABELS[tp.id] ?? tp.label} chevron onPress={() => router.replace(`/icarte/add?template=${tp.id}` as never)} />
        ))}
        <Row icon="palette" tone="green" title="Carte personnalisée" sub="Fidélité, adhésion, badge…" chevron onPress={() => router.replace('/icarte/custom' as never)} />
      </Card>
    </Screen>
  );
}
