import React from 'react';
import { View } from 'react-native';
import type { IdnTheme } from '@/design/tokens';
import { AppBar } from '@/design/components/app-bar';

/** En-tête des feuilles et écrans de saisie : même barre que le reste de l'app. */
export function NSheetHeader({ t, title, onBack, right }: { t: IdnTheme; title: string; onBack?: () => void; right?: React.ReactNode }) {
  // En `formSheet`, le parent peut compresser ses enfants : la barre ne rétrécit jamais.
  return (
    <View style={{ flexShrink: 0, backgroundColor: t.bg }}>
      <AppBar title={title} onBack={onBack} right={right} />
    </View>
  );
}
