import React, { useState } from 'react';
import { Pressable, ScrollView, View, type KeyboardTypeOptions } from 'react-native';
import { Text, TextInput } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnLottie } from '@/design/components/lottie';

/**
 * Briques locales au module iCV, composées à partir du design system
 * (qui n'a ni champ multiligne, ni choix radio, ni pastilles de filtre).
 */

/** Écran d'attente : barre d'application + animation `loader`. */
export function CvLoading({ title, onBack, sheet }: { title: string; onBack?: () => void; sheet?: boolean }) {
  return (
    <Screen sheet={sheet} scroll={false} header={<AppBar title={title} onBack={onBack} backIcon={sheet ? 'close' : 'arrowL'} />}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <IdnLottie name="loader" size={72} loop label="Chargement" />
      </View>
    </Screen>
  );
}

/** Champ de saisie de la charte (`.field`), en une ou plusieurs lignes. */
export function CvField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
  minHeight = 112,
  keyboardType,
  autoCapitalize,
  editable = true,
  maxLength,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  minHeight?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  const t = useIdnTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 6 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        multiline={multiline}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize}
        editable={editable}
        maxLength={maxLength}
        autoFocus={autoFocus}
        accessibilityLabel={label}
        accessibilityHint={hint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          backgroundColor: t.surface,
          borderWidth: focused ? 2 : 1,
          borderColor: focused ? t.green : t.muted,
          borderRadius: 10,
          paddingHorizontal: focused ? 13 : 14,
          paddingTop: multiline ? 12 : 0,
          paddingBottom: multiline ? 12 : 0,
          height: multiline ? undefined : 50,
          minHeight: multiline ? minHeight : 50,
          textAlignVertical: multiline ? 'top' : 'center',
          color: t.ink,
          fontSize: 16,
          opacity: editable ? 1 : 0.5,
        }}
      />
      {hint ? <Text style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 18 }}>{hint}</Text> : null}
    </View>
  );
}

/** Ligne de choix exclusif (bouton radio) à placer dans une `Card`. */
export function ChoiceRow({ label, sub, selected, onPress, disabled }: { label: string; sub?: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  const t = useIdnTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !!disabled }}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10, opacity: disabled ? 0.45 : pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 22, height: 22, borderRadius: 9999, borderWidth: 2, borderColor: selected ? t.green : t.muted, alignItems: 'center', justifyContent: 'center' }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: t.green }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 14, fontWeight: selected ? '600' : '500', color: t.ink }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 13, color: t.muted }}>{sub}</Text> : null}
      </View>
      {selected ? <Icon name="check" size={18} color={t.greenText} /> : null}
    </Pressable>
  );
}

/** Pastilles de sélection (`.accountPill`), défilement horizontal facultatif. */
export function CvChips<T extends string>({
  items,
  value,
  onChange,
  label,
  wrap,
  disabled,
}: {
  items: { id: T; label: string; color?: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  wrap?: boolean;
  disabled?: boolean;
}) {
  const t = useIdnTheme();
  const chips = items.map((it) => {
    const sel = it.id === value;
    return (
      <Pressable
        key={it.id}
        onPress={() => onChange(it.id)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: sel, disabled: !!disabled }}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1,
          borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface, opacity: disabled && !sel ? 0.5 : 1,
        }}
      >
        {it.color ? <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: it.color }} /> : null}
        <Text style={{ fontSize: 14, fontWeight: sel ? '600' : '500', color: sel ? t.greenText : t.ink }}>{it.label}</Text>
      </Pressable>
    );
  });
  if (wrap) {
    return <View accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chips}</View>;
  }
  return (
    <ScrollView horizontal accessibilityLabel={label} showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
      {chips}
    </ScrollView>
  );
}

/** « 1 expérience », « 3 expériences », « aucune expérience ». */
export function plural(n: number, one: string, many: string, none: string): string {
  if (n === 0) return none;
  return `${n} ${n > 1 ? many : one}`;
}
