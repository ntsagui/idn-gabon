import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Accueil', icon: 'home' },
  { id: 'icarte', label: 'iCarte', icon: 'wallet' },
  { id: 'iboite', label: 'iBoîte', icon: 'mailbox' },
  { id: 'profile', label: 'Profil', icon: 'userRound' },
];

/** Barre d'onglets du prototype (`.tabBar`) : 4 onglets, actif en vert 600. */
export function NTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useIdnTheme();
  const insets = useSafeAreaInsets();
  // Dans iCarte et iBoîte, la barre ne s'affiche qu'à la racine de l'onglet :
  // les écrans de détail et de saisie occupent tout l'écran.
  const focused = state.routes[state.index];
  const nested = focused?.state as { index?: number } | undefined;
  if (nested?.index && nested.index > 0) return null;
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6, paddingBottom: Math.max(insets.bottom, 8), borderTopWidth: 1, borderTopColor: t.border, backgroundColor: t.surface }}
    >
      {state.routes.map((route, idx) => {
        const meta = TABS.find((tb) => tb.id === route.name);
        if (!meta) return null;
        const sel = state.index === idx;
        const color = sel ? t.greenText : t.muted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            accessibilityLabel={meta.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) {
                // Un appui sur l'onglet actif ramène à sa racine.
                if (sel) navigation.navigate(route.name, { screen: 'index' } as never);
                else navigation.navigate(route.name);
              }
            }}
            style={{ flex: 1, paddingVertical: 6, alignItems: 'center', gap: 3 }}
          >
            <Icon name={meta.icon} size={22} color={color} />
            <Text style={{ fontSize: 11, fontWeight: sel ? '600' : '500', color }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
