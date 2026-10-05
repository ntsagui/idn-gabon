import React from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '@/design/text';
import { useIdnTheme } from '@/design/theme';

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  error?: boolean;
  label?: string;
};

/**
 * Code à 6 chiffres en cases (prototype « signup-otp »). Un seul champ
 * natif invisible porte la saisie : le clavier numérique, le collage et le
 * remplissage automatique du code SMS (iOS `oneTimeCode`) fonctionnent.
 */
export function OtpInput({ value, onChange, length = 6, autoFocus, error, label = 'Code à 6 chiffres' }: Props) {
  const t = useIdnTheme();
  const ref = React.useRef<React.ElementRef<typeof TextInput>>(null);
  const [focused, setFocused] = React.useState(false);
  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 6 }}>{label}</Text>
      <Pressable onPress={() => ref.current?.focus()} accessible={false} style={{ flexDirection: 'row', gap: 8 }}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface,
                borderWidth: active || error ? 2 : 1,
                borderColor: error ? t.redText : active ? t.green : ch ? t.green : t.muted,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: '600', color: t.ink }}>{ch ?? ''}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
      />
      <Text accessibilityLiveRegion="polite" style={{ marginTop: 8, fontSize: 13, color: t.muted, textAlign: 'center' }}>
        {value.length} chiffre{value.length > 1 ? 's' : ''} sur {length}
      </Text>
    </View>
  );
}
