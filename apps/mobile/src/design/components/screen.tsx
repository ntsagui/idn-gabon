import React from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';

type Props = {
  /** Barre du haut (AppBar, en-tête d'accueil…), rendue sous la zone sûre. */
  header?: React.ReactNode;
  /** Bandeau sous la barre (Stepper). */
  subHeader?: React.ReactNode;
  children: React.ReactNode;
  /** Pied fixe (`.footer`) : boutons d'action, bordure haute. */
  footer?: React.ReactNode;
  scroll?: boolean;
  /** Formulaire : le contenu remonte au-dessus du clavier. */
  keyboard?: boolean;
  /** Écran avec barre d'onglets : pas de marge de zone sûre en bas. */
  inTabs?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  bg?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Modale présentée en feuille iOS : pas de marge haute de zone sûre. */
  sheet?: boolean;
};

/** Squelette d'écran du prototype (`.screen` + `.screenBody` + `.footer`). */
export function Screen({ header, subHeader, children, footer, scroll = true, keyboard, inTabs, contentStyle, bg, refreshing, onRefresh, sheet }: Props) {
  const t = useIdnTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = footer || inTabs ? 24 : Math.max(insets.bottom, 16) + 16;
  const body = [{ paddingHorizontal: 20, paddingBottom: bottomPad }, contentStyle];
  const footerBottom = inTabs ? 12 : Math.max(insets.bottom, 12) + 8;
  const footerView = footer ? (
    <View style={{ gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: footerBottom, borderTopWidth: 1, borderTopColor: t.border, backgroundColor: bg ?? t.bg }}>
      {footer}
    </View>
  ) : null;
  const refresh = onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.green} /> : undefined;
  return (
    <View style={{ flex: 1, backgroundColor: bg ?? t.bg, paddingTop: sheet ? 0 : insets.top }}>
      {header}
      {subHeader}
      {!scroll ? (
        <View style={[{ flex: 1 }, body]}>{children}</View>
      ) : keyboard ? (
        <KeyboardAwareScrollView bottomOffset={footer ? 96 : 24} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={body} refreshControl={refresh}>
          {children}
        </KeyboardAwareScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={body} refreshControl={refresh}>
          {children}
        </ScrollView>
      )}
      {footer ? (
        keyboard ? (
          // Le pied remonte avec le clavier : le bouton d'action reste atteignable.
          <KeyboardStickyView offset={{ opened: footerBottom - 8 }}>{footerView}</KeyboardStickyView>
        ) : (
          footerView
        )
      ) : null}
    </View>
  );
}
