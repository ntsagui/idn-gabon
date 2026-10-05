import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';

/** Progression d'un parcours (`.stepper`) : barres de 4 px, étape courante en gras. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  const t = useIdnTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Étape ${current + 1} sur ${steps.length} : ${steps[current]}`}
      style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 12 }}
    >
      {steps.map((label, i) => {
        const on = i <= current;
        return (
          <View key={label} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 4, borderRadius: 9999, backgroundColor: on ? t.green : t.border }} />
            <Text numberOfLines={1} style={{ fontSize: 11, color: i === current ? t.ink : t.muted, fontWeight: i === current ? '600' : '400' }}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
