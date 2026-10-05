import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View, type ViewStyle, type StyleProp } from 'react-native';
import { Text } from '@/design/text';
import type { IdnTheme } from '../tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  t: IdnTheme;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
  leadIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

// Boutons de la charte (`.button` du prototype) : 50 px de haut, rayon 14,
// libellé 15/600. Cibles tactiles ≥ 44 pt (RGAA 13.x / Apple HIG).
const sizes = {
  sm: { h: 40, px: 14, fs: 14, r: 10 },
  md: { h: 50, px: 20, fs: 15, r: 14 },
  lg: { h: 52, px: 20, fs: 16, r: 14 },
} as const;

export function IdnButton({
  children, variant = 'primary', size = 'md', t, onPress, disabled, loading, full, leadIcon, style, accessibilityLabel,
}: Props) {
  const [pressed, setPressed] = useState(false);
  const sz = variant === 'secondary' && size === 'md' ? { ...sizes.md, h: 44, fs: 14 } : sizes[size];
  const v = {
    primary: { bg: t.green, fg: '#fff', bd: t.green, press: t.greenDk },
    secondary: { bg: t.surface, fg: t.ink, bd: t.border, press: t.surface2 },
    ghost: { bg: 'transparent', fg: t.ink, bd: t.border, press: t.surface2 },
    quiet: { bg: 'transparent', fg: t.ink2, bd: 'transparent', press: t.surface2 },
    danger: { bg: '#B3261E', fg: '#fff', bd: '#B3261E', press: '#8F1E18' },
    dangerGhost: { bg: 'transparent', fg: t.redText, bd: t.border, press: t.redBadge },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      // TalkBack n'agrège pas toujours le texte enfant : on le fournit explicitement.
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        {
          minHeight: sz.h,
          paddingHorizontal: sz.px,
          backgroundColor: pressed && !inactive ? v.press : v.bg,
          borderColor: v.bd,
          borderWidth: 1,
          borderRadius: sz.r,
          opacity: disabled ? 0.45 : 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          alignSelf: full ? 'stretch' : 'flex-start',
          width: full ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : leadIcon ? <View>{leadIcon}</View> : null}
      <Text style={{ color: v.fg, fontSize: sz.fs, fontWeight: '600', textAlign: 'center' }}>{children}</Text>
    </Pressable>
  );
}
