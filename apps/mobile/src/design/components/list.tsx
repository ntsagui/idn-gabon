import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';

export type RowTone = 'green' | 'blue' | 'yellow' | 'red' | 'neutral';

/** Carte bordée (`.card`) : rayon 14, padding horizontal 14, séparateurs entre lignes. */
export function Card({ children, style, padded }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useIdnTheme();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ borderWidth: 1, borderColor: t.border, borderRadius: 14, backgroundColor: t.surface, paddingHorizontal: 14, paddingVertical: padded ? 14 : 0 }, style]}>
      {padded
        ? children
        : items.map((child, i) => (
            <View key={i} style={i > 0 ? { borderTopWidth: 1, borderTopColor: t.border } : undefined}>
              {child}
            </View>
          ))}
    </View>
  );
}

export function useToneColors(tone: RowTone) {
  const t = useIdnTheme();
  return {
    green: { bg: t.greenBadge, fg: t.greenText },
    blue: { bg: t.blueBadge, fg: t.blueText },
    yellow: { bg: t.yellowBadge, fg: t.dark ? '#F2C811' : '#8A6D00' },
    red: { bg: t.redBadge, fg: t.redText },
    neutral: { bg: t.surface2, fg: t.ink2 },
  }[tone];
}

/** Tuile d'icône 36 px (`.rowIcon`). */
export function IconTile({ icon, tone = 'neutral', size = 36 }: { icon: IconName; tone?: RowTone; size?: number }) {
  const c = useToneColors(tone);
  return (
    <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size >= 40 ? 22 : 18} color={c.fg} />
    </View>
  );
}

type RowProps = {
  icon?: IconName;
  tone?: RowTone;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  unread?: boolean;
  mono?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** Ligne de liste (`.row`) : icône 36, titre 14/500, sous-titre 13 muted, chevron. */
export function Row({ icon, tone = 'neutral', title, sub, right, onPress, chevron, unread, mono, accessibilityLabel, disabled }: RowProps) {
  const t = useIdnTheme();
  const main = (
    <>
      {icon ? <IconTile icon={icon} tone={tone} /> : null}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {unread ? <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: t.blue }} accessibilityLabel="Non lu" /> : null}
          {typeof title === 'string' ? (
            <Text style={{ flex: 1, fontSize: 14, fontWeight: unread ? '600' : '500', color: t.ink, lineHeight: 19 }}>{title}</Text>
          ) : (
            title
          )}
        </View>
        {sub ? (
          typeof sub === 'string' ? (
            <Text style={{ fontSize: 13, color: t.muted, lineHeight: 18, fontFamily: mono ? t.mono : undefined }}>{sub}</Text>
          ) : (
            sub
          )
        ) : null}
      </View>
    </>
  );
  if (!onPress) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 }}>
        {main}
        {right}
        {chevron ? <Icon name="arrow" size={18} color={t.muted} /> : null}
      </View>
    );
  }
  // L'élément de droite reste hors de la zone cliquable : une action secondaire
  // (favori, bouton) doit rester atteignable seule (RGAA 7.1, pas d'actions imbriquées).
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10, opacity: pressed ? 0.6 : disabled ? 0.5 : 1 })}
      >
        {main}
        {chevron && !right ? <Icon name="arrow" size={18} color={t.muted} /> : null}
      </Pressable>
      {right}
      {chevron && right ? <Icon name="arrow" size={18} color={t.muted} /> : null}
    </View>
  );
}

/** Titre de section (`.sectionTitle`) avec action facultative à droite. */
export function SectionTitle({ children, action, onAction, style }: { children: React.ReactNode; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const t = useIdnTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 10 }, style]}>
      <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{children}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.greenText }}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Sur-titre mono capitales (`.overline` / `.eyebrow`). */
export function Overline({ children, style, color }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; color?: string }) {
  const t = useIdnTheme();
  return (
    <View style={style}>
      <Text style={{ fontFamily: t.mono, fontSize: 11, fontWeight: '500', letterSpacing: 1.3, textTransform: 'uppercase', color: color ?? t.muted }}>{children}</Text>
    </View>
  );
}

/** Titre d'écran (`.title`, 22/600) et texte d'accompagnement (`.lead`). */
export function ScreenTitle({ title, lead, center }: { title: React.ReactNode; lead?: React.ReactNode; center?: boolean }) {
  const t = useIdnTheme();
  return (
    <View style={{ marginTop: 16, alignItems: center ? 'center' : 'flex-start' }}>
      <Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '600', lineHeight: 28, letterSpacing: -0.22, color: t.ink, textAlign: center ? 'center' : 'left' }}>{title}</Text>
      {lead ? <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: center ? 'center' : 'left' }}>{lead}</Text> : null}
    </View>
  );
}

/** Note de bas de section (`.note`, 13 muted). */
export function Note({ children, center, style }: { children: React.ReactNode; center?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useIdnTheme();
  return (
    <View style={[{ marginTop: 16 }, style]}>
      <Text style={{ fontSize: 13, lineHeight: 19, color: t.muted, textAlign: center ? 'center' : 'left' }}>{children}</Text>
    </View>
  );
}

/** Message d'erreur annoncé aux lecteurs d'écran. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  const t = useIdnTheme();
  if (!children) return null;
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={{ marginTop: 14, flexDirection: 'row', gap: 8, padding: 12, borderRadius: 10, backgroundColor: t.redBadge }}>
      <Icon name="alert" size={18} color={t.redText} />
      <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: t.redText }}>{children}</Text>
    </View>
  );
}

/** Ligne libellé / valeur d'une fiche de détail (rendez-vous, carte, acte). */
export function DetailRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  const t = useIdnTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, paddingVertical: 10 }}>
      <Text style={{ fontSize: 13, color: t.muted }}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={{ flexShrink: 1, textAlign: 'right', fontSize: 14, fontWeight: mono ? '500' : '600', color: t.ink, fontFamily: mono ? t.mono : undefined }}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}
