import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { Card, Row } from '@/design/components/list';
import { IconButton } from '@/design/components/app-bar';
import { Badge } from '@/design/components/badge';
import { useIdnTheme } from '@/design/theme';
import { Text } from '@/design/text';

interface CvSummary {
  _id: string;
  name: string;
  isDefault: boolean;
}

/**
 * Sélecteur de CV : carte du CV actif (ouvre `/icv/list`, qui sert de
 * sélecteur) et bouton « Créer un CV ».
 */
export function CvSelector({ active, onCreate }: { active: CvSummary | null; onCreate: () => void }) {
  const t = useIdnTheme();
  const router = useRouter();
  if (!active) return null;

  return (
    <Card style={{ marginTop: 16 }}>
      <Row
        icon="fileUser"
        tone="green"
        title={
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: '500', color: t.ink }}>{active.name}</Text>
            {active.isDefault ? <Badge tone="green">Principal</Badge> : null}
          </View>
        }
        sub="Changer de CV"
        accessibilityLabel={`CV actif : ${active.name}${active.isDefault ? ', principal' : ''}. Changer de CV`}
        onPress={() => router.push('/icv/list' as never)}
        right={<IconButton icon="plus" label="Créer un CV" onPress={onCreate} size={36} />}
      />
    </Card>
  );
}
