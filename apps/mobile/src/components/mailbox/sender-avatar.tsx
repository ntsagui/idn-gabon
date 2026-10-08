import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { Icon, type IconName } from '@/design/icons';
import { useToneColors, type RowTone } from '@/design/components/list';

// Teintes des avatars à initiale : couleurs de la charte, contraste suffisant avec le blanc.
const AVATAR_COLORS = [idnTokens.blue, idnTokens.greenDk, idnTokens.l.ink2, idnTokens.l.muted, idnTokens.green];

/** Couleur stable dérivée du nom : un même expéditeur garde toujours la même pastille. */
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/**
 * Avatar rond d'un expéditeur (liste et lecture iBoîte). Avec `icon`, pastille
 * douce teintée (administration, courrier) ; sinon initiale sur couleur stable.
 */
export function SenderAvatar({ name, icon, tone = 'green', size = 40 }: { name: string; icon?: IconName; tone?: RowTone; size?: number }) {
  const c = useToneColors(tone);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: icon ? c.bg : avatarColor(name) }}
    >
      {icon ? (
        <Icon name={icon} size={Math.round(size * 0.5)} color={c.fg} />
      ) : (
        <Text style={{ color: '#fff', fontSize: Math.round(size * 0.45), fontWeight: '500' }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
      )}
    </View>
  );
}

/** Badge « administration vérifiée » accolé au nom de l'expéditeur. */
export function VerifiedBadge({ size = 15 }: { size?: number }) {
  const t = useIdnTheme();
  return (
    <View accessibilityLabel="Administration vérifiée" accessibilityRole="image">
      <Icon name="badgeCheck" size={size} color={t.greenText} strokeWidth={2.2} />
    </View>
  );
}
