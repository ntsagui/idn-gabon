import React from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';

/** Points de saisie du PIN (`.pinDots`) : 14 px, remplis en vert. */
export function PinDots({ filled, length = 6, error }: { filled: number; length?: number; error?: boolean }) {
  const t = useIdnTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${filled} chiffre${filled > 1 ? 's' : ''} saisi${filled > 1 ? 's' : ''} sur ${length}`}
      style={{ flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 28 }}
    >
      {Array.from({ length }, (_, i) => {
        const on = i < filled;
        const color = error ? t.redText : on ? t.green : t.muted;
        return <View key={i} style={{ width: 14, height: 14, borderRadius: 9999, borderWidth: 1.5, borderColor: color, backgroundColor: on ? color : 'transparent' }} />;
      })}
    </View>
  );
}

type KeypadProps = {
  onDigit: (d: string) => void;
  onDelete: () => void;
  /** Action facultative en bas à gauche (Face ID dans l'écran de connexion). */
  leftAction?: { icon: IconName; label: string; onPress: () => void };
  disabled?: boolean;
  tone?: 'default' | 'onGreen';
};

/** Clavier numérique (`.keypad`) : 3 colonnes, touches pilule 64 px. */
export function Keypad({ onDigit, onDelete, leftAction, disabled, tone = 'default' }: KeypadProps) {
  const t = useIdnTheme();
  const onGreen = tone === 'onGreen';
  const keyStyle = (pressed: boolean) => ({
    height: 64, borderRadius: 9999, borderWidth: 1,
    borderColor: onGreen ? 'rgba(255,255,255,0.24)' : t.border,
    backgroundColor: pressed ? (onGreen ? 'rgba(255,255,255,0.22)' : t.surface2) : onGreen ? 'rgba(255,255,255,0.10)' : t.surface,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  });
  const cells: (string | 'left' | 'del')[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'left', '0', 'del'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 28, rowGap: 12, opacity: disabled ? 0.6 : 1 }}>
      {cells.map((c) => (
        <View key={c} style={{ width: '33.333%', paddingHorizontal: 12 }}>
          {c === 'left' ? (
            leftAction ? (
              <Pressable onPress={leftAction.onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={leftAction.label} style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={leftAction.icon} size={26} color={onGreen ? '#fff' : t.greenText} />
              </Pressable>
            ) : <View style={{ height: 64 }} />
          ) : c === 'del' ? (
            <Pressable onPress={onDelete} disabled={disabled} accessibilityRole="button" accessibilityLabel="Effacer le dernier chiffre" style={{ height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="delete" size={24} color={onGreen ? '#fff' : t.muted} />
            </Pressable>
          ) : (
            <Pressable onPress={() => onDigit(c)} disabled={disabled} accessibilityRole="button" accessibilityLabel={c} style={({ pressed }) => keyStyle(pressed)}>
              <Text style={{ fontSize: 26, fontWeight: '500', color: onGreen ? '#fff' : t.ink }}>{c}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
