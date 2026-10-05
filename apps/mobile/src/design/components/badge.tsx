import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';

export type BadgeTone = 'green' | 'blue' | 'yellow' | 'red' | 'neutral' | 'onGreen';

/** Pastille de statut (`.badge`) : 12/600, 3×10, rayon pilule, icône 13 px facultative. */
export function Badge({ tone = 'neutral', icon, children, style }: { tone?: BadgeTone; icon?: IconName; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useIdnTheme();
  const c = {
    green: { bg: t.greenBadge, fg: t.greenText },
    blue: { bg: t.blueBadge, fg: t.blueText },
    yellow: { bg: t.yellowBadge, fg: t.dark ? '#F2C811' : '#6B5600' },
    red: { bg: t.redBadge, fg: t.redText },
    neutral: { bg: t.neutralBadge, fg: t.ink2 },
    onGreen: { bg: '#FFFFFF', fg: '#0E7C3A' },
  }[tone];
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 3, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: c.bg, alignSelf: 'flex-start' }, style]}>
      {icon ? <Icon name={icon} size={13} color={c.fg} strokeWidth={2} /> : null}
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.fg }}>{children}</Text>
    </View>
  );
}

const LEVELS = {
  1: { label: 'Niveau 1 · Faible', tone: 'neutral' },
  2: { label: 'Niveau 2 · Substantiel', tone: 'blue' },
  3: { label: 'Niveau 3 · Élevé', tone: 'green' },
} as const;

/** Niveau de garantie (LoA) tel que présenté partout dans le prototype. */
export function LevelBadge({ level, onGreen, short, style }: { level: 1 | 2 | 3; onGreen?: boolean; short?: boolean; style?: StyleProp<ViewStyle> }) {
  const meta = LEVELS[level];
  return (
    <Badge tone={onGreen ? 'onGreen' : meta.tone} icon="shield" style={style}>
      {short ? `Niveau ${level}` : meta.label}
    </Badge>
  );
}
