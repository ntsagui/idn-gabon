import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { LevelBadge } from '@/design/components/badge';
import { Card, IconTile, Overline } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { LEVEL3_UNLOCKS } from './intro';

/** Résultat de l'entretien (prototype « l3-result »). */
export function Level3Result({ approved, controllerName, reason }: { approved: boolean; controllerName?: string; reason?: string }) {
  const t = useIdnTheme();
  if (!approved) {
    return (
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: t.redBadge, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={32} color={t.redText} strokeWidth={2.5} />
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 22, fontWeight: '600', color: t.ink }}>Niveau 3 non accordé</Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
          {reason ?? 'Le contrôleur n’a pas pu confirmer ton identité lors de l’entretien.'} Tu peux refaire une demande.
        </Text>
      </View>
    );
  }
  return (
    <>
      <View style={{ alignItems: 'center', marginTop: 16 }}>
        <IdnLottie name="shield" size={128} label="Niveau 3 atteint" />
        <Text accessibilityRole="header" style={{ marginTop: 8, fontSize: 22, fontWeight: '600', color: t.ink }}>Niveau 3 atteint</Text>
        <LevelBadge level={3} style={{ marginTop: 8, alignSelf: 'center' }} />
        <Text style={{ marginTop: 10, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
          {controllerName ? `${controllerName} a confirmé ton identité.` : 'Un contrôleur a confirmé ton identité.'} Ta carte et ton profil sont à jour.
        </Text>
      </View>
      <Overline style={{ marginTop: 24, marginBottom: 10 }}>Désormais disponible</Overline>
      <Card>
        {LEVEL3_UNLOCKS.map((u) => (
          <View key={u.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }}>
            <IconTile icon={u.icon} tone="green" />
            <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: t.ink }}>{u.title}</Text>
            <Icon name="check" size={18} color={t.greenText} />
          </View>
        ))}
      </Card>
    </>
  );
}
