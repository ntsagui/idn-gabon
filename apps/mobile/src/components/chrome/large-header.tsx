import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import type { IdnTheme } from '@/design/tokens';
import { AppBar } from '@/design/components/app-bar';

type Props = {
  t: IdnTheme;
  title: string;
  sub?: string;
  right?: React.ReactNode;
  scrolled?: boolean;
  onBack?: () => void;
};

/** En-tête d'écran : barre d'application du prototype, sous-titre facultatif en dessous. */
export function NLargeHeader({ t, title, sub, right, onBack }: Props) {
  return (
    <View style={{ backgroundColor: t.bg }}>
      <AppBar title={title} onBack={onBack} right={right} />
      {sub ? <Text style={{ fontSize: 13, color: t.muted, lineHeight: 19, paddingHorizontal: 20, paddingTop: 10 }}>{sub}</Text> : null}
    </View>
  );
}
