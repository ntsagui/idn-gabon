import React, { useState } from 'react';
import { Pressable, View, type KeyboardTypeOptions } from 'react-native';
import { TextInput, Text } from '@/design/text';
import type { IdnTheme } from '../tokens';

type Props = {
  label?: string;
  value?: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  t: IdnTheme;
  hint?: string;
  error?: string;
  leadIcon?: React.ReactNode;
  suffix?: React.ReactNode;
  autoFocus?: boolean;
  editable?: boolean;
  onPress?: () => void;
  rightAction?: { label: string; onPress: () => void };
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  mono?: boolean;
};

// Champ du prototype (`.field` / `.input`) : 50 px, bordure au contraste ≥ 3:1
// (RGAA 3.3), 2 px rouge en erreur, libellé 14/600 relié au champ.
export function IdnInput({ label, value, onChangeText, placeholder, type = 'text', t, hint, error, leadIcon, suffix, autoFocus, editable = true, onPress, rightAction, autoCapitalize, maxLength, mono }: Props) {
  const [focused, setFocused] = useState(false);
  const keyboardType: KeyboardTypeOptions =
    type === 'email' ? 'email-address'
    : type === 'number' ? 'numeric'
    : type === 'tel' ? 'phone-pad'
    : 'default';

  const containerStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    backgroundColor: t.surface,
    borderWidth: error || focused ? 2 : 1,
    borderColor: error ? t.redText : focused ? t.green : t.muted,
    borderRadius: 10,
    paddingHorizontal: error || focused ? 13 : 14,
    height: 50,
  };

  const inputContent = (
    <>
      {leadIcon ? <View style={{ opacity: 0.7 }}>{leadIcon}</View> : null}
      {onPress ? (
        <Text style={{ flex: 1, color: value ? t.ink : t.muted, fontSize: 16 }}>
          {value || placeholder}
        </Text>
      ) : (
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={t.muted}
          autoFocus={autoFocus}
          editable={editable}
          secureTextEntry={type === 'password'}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (type === 'email' ? 'none' : 'sentences')}
          maxLength={maxLength}
          accessibilityLabel={label}
          accessibilityHint={error || hint}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ flex: 1, color: t.ink, fontSize: 16, paddingVertical: 0, height: '100%', fontFamily: mono ? t.mono : undefined }}
        />
      )}
      {rightAction ? (
        <Pressable onPress={rightAction.onPress} hitSlop={8}>
          <Text style={{ color: t.greenText, fontSize: 13, fontWeight: '600' }}>{rightAction.label}</Text>
        </Pressable>
      ) : null}
      {suffix}
    </>
  );

  return (
    <View>
      {label ? (
        <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
          {label}
        </Text>
      ) : null}
      {onPress ? (
        <Pressable onPress={onPress} style={containerStyle}>{inputContent}</Pressable>
      ) : (
        <View style={containerStyle}>{inputContent}</View>
      )}
      {(hint || error) ? (
        <Text accessibilityLiveRegion={error ? 'polite' : 'none'} style={{ fontSize: 13, color: error ? t.redText : t.muted, marginTop: 6, lineHeight: 18 }}>
          {error || hint}
        </Text>
      ) : null}
    </View>
  );
}
