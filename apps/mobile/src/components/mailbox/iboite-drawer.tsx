import React from 'react';
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { useReduceMotion } from '@/design/motion';
import { Icon, type IconName } from '@/design/icons';

const WIDTH = 300;

export type DrawerFolder = { id: string; label: string; icon: IconName; count?: number };
export type DrawerAccount = { id: string; label: string; icon: IconName; unread: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  emailAlias: string;
  folders: DrawerFolder[];
  folder: string;
  onFolder: (id: string) => void;
  accounts: DrawerAccount[];
  accountId: string;
  onAccount: (id: string) => void;
  onSettings: () => void;
};

/** Tiroir latéral de l'iBoîte (dossiers, boîtes, adresse), façon Gmail. */
export function IBoiteDrawer({ visible, onClose, emailAlias, folders, folder, onFolder, accounts, accountId, onAccount, onSettings }: Props) {
  const t = useIdnTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const progress = React.useRef(new Animated.Value(0)).current;
  // La modale reste montée le temps de l'animation de fermeture.
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: reduceMotion ? 0 : visible ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, reduceMotion, progress]);

  const choose = (fn: () => void) => () => {
    fn();
    onClose();
  };

  const item = (key: string, label: string, icon: React.ReactNode, selected: boolean, onPress: () => void, count?: number, a11y?: string, pill = true) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y ?? (count ? `${label}, ${count} non lus` : label)}
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        minHeight: 48, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16,
        backgroundColor: selected && pill ? t.greenBadge : pressed ? t.surface2 : 'transparent',
      })}
    >
      {icon}
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 15, fontWeight: selected ? '700' : '500', color: selected && pill ? (t.dark ? t.greenText : t.greenDk) : selected ? t.ink : t.ink2 }}>{label}</Text>
      {count ? <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? t.greenText : t.ink2 }}>{count}</Text> : null}
    </Pressable>
  );

  const fg = (selected: boolean) => (selected ? (t.dark ? t.greenText : t.greenDk) : t.ink2);

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(22,23,15,0.42)', opacity: progress }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer le menu" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: 'absolute', top: 0, bottom: 0, left: 0, width: WIDTH, backgroundColor: t.surface,
          borderTopRightRadius: 18, borderBottomRightRadius: 18,
          transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, 0] }) }],
        }}
      >
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16, paddingHorizontal: 10, gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '700', color: t.ink, paddingHorizontal: 14, paddingBottom: 12 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: t.greenText }}>i</Text>Boîte
          </Text>
          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(emailAlias);
              Alert.alert('Adresse copiée', emailAlias);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Ton adresse ${emailAlias}, appuie pour la copier`}
            style={{ marginHorizontal: 6, marginBottom: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: t.surface2 }}
          >
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: t.mono, fontSize: 13, color: t.ink }}>{emailAlias}</Text>
            <Icon name="copy" size={17} color={t.muted} />
          </Pressable>

          {folders.map((f) => item(f.id, f.label, <Icon name={f.icon} size={20} color={fg(f.id === folder)} />, f.id === folder, choose(() => onFolder(f.id)), f.count))}

          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 8, marginHorizontal: 12 }} />
          <Text style={{ fontSize: 12, fontWeight: '500', color: t.muted, letterSpacing: 0.5, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6 }}>Mes boîtes</Text>
          {accounts.map((a) => {
            const sel = a.id === accountId;
            return item(
              a.id,
              a.label,
              <View style={{ width: 26, height: 26, marginHorizontal: -3, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? t.green : t.surface2 }}>
                <Icon name={a.icon} size={14} color={sel ? '#fff' : t.ink2} />
              </View>,
              sel,
              choose(() => onAccount(a.id)),
              a.unread,
              `Boîte ${a.label}${a.unread ? `, ${a.unread} non lus` : ''}`,
              false,
            );
          })}

          <View style={{ height: 1, backgroundColor: t.border, marginVertical: 8, marginHorizontal: 12 }} />
          {item('settings', 'Adresse postale et réglages', <Icon name="settings" size={20} color={t.ink2} />, false, choose(onSettings))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
