import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';

type Props = {
  title?: string;
  onBack?: () => void;
  /** Icône du bouton de gauche : retour (défaut) ou fermeture d'une modale. */
  backIcon?: 'arrowL' | 'close';
  right?: React.ReactNode;
  border?: boolean;
  tone?: 'default' | 'dark';
};

/** Barre d'application du prototype (`.appBar`) : 52 px, titre centré 17/600, bordure basse. */
export function AppBar({ title, onBack, backIcon = 'arrowL', right, border = true, tone = 'default' }: Props) {
  const t = useIdnTheme();
  const ink = tone === 'dark' ? '#F2F0E8' : t.ink;
  return (
    <View
      style={{
        minHeight: 52, paddingVertical: 4, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
        borderBottomWidth: border ? 1 : 0, borderBottomColor: tone === 'dark' ? 'rgba(255,255,255,0.08)' : t.border,
      }}
    >
      <View style={{ width: 40 }}>
        {onBack ? (
          <IconButton icon={backIcon} onPress={onBack} label={backIcon === 'close' ? 'Fermer' : 'Retour'} plain color={ink} />
        ) : null}
      </View>
      <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: ink, letterSpacing: -0.17 }}>
        {title}
      </Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

type IconButtonProps = {
  icon: IconName;
  onPress?: () => void;
  label: string;
  /** Sans bordure ni fond (bouton retour). */
  plain?: boolean;
  color?: string;
  badge?: boolean;
  size?: number;
};

/** Bouton icône rond 40 px (`.iconButton`), bordé sauf en mode `plain`. */
export function IconButton({ icon, onPress, label, plain, color, badge, size = 40 }: IconButtonProps) {
  const t = useIdnTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: 9999, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: plain ? 'transparent' : t.border,
        backgroundColor: pressed ? t.surface2 : plain ? 'transparent' : t.surface,
      })}
    >
      <Icon name={icon} size={20} color={color ?? t.ink} />
      {badge ? (
        <View style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 9999, backgroundColor: '#B3261E', borderWidth: 1.5, borderColor: t.surface }} />
      ) : null}
    </Pressable>
  );
}
