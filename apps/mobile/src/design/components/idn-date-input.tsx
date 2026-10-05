import React, { useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { idnTokens } from '../tokens';
import type { IdnTheme } from '../tokens';
import { Icon } from '../icons';

type Props = {
  t: IdnTheme;
  label?: string;
  value?: string;
  onChange?: (iso: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dateFromIso(s?: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Défaut raisonnable pour une date de naissance adulte.
  return new Date(1990, 0, 1);
}

function formatDisplay(s?: string): string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return '';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

export function IdnDateInput({
  t,
  label,
  value,
  onChange,
  placeholder = 'JJ/MM/AAAA',
  hint,
  error,
  maximumDate = new Date(),
  minimumDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => dateFromIso(value));
  const insets = useSafeAreaInsets();

  function openPicker() {
    Keyboard.dismiss();
    const current = dateFromIso(value);
    setTempDate(current);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) {
            onChange?.(isoFromDate(selected));
          }
        },
      });
      return;
    }
    setOpen(true);
  }

  function confirm() {
    onChange?.(isoFromDate(tempDate));
    setOpen(false);
  }

  const display = formatDisplay(value);
  const hasValue = display.length > 0;

  return (
    <>
      <View>
        {label ? (
          <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 6 }}>
            {label}
          </Text>
        ) : null}
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? 'Date'} : ${hasValue ? display : 'non renseignée'}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: t.surface,
            borderWidth: 1,
            borderColor: error ? t.redText : t.muted,
            borderRadius: 10,
            paddingHorizontal: 14,
            height: 50,
          }}
        >
          <Icon name="calendar" size={20} color={t.muted} />
          <Text style={{ flex: 1, color: hasValue ? t.ink : t.muted, fontSize: 16 }}>
            {hasValue ? display : placeholder}
          </Text>
        </Pressable>
        {hint || error ? (
          <Text
            style={{
              fontSize: idnTokens.text.footnote,
              color: error ? idnTokens.danger : t.muted,
              marginTop: 8,
              lineHeight: 18,
            }}
          >
            {error || hint}
          </Text>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setOpen(false)} />
        <View
          style={{
            backgroundColor: t.surface,
            paddingBottom: Math.max(insets.bottom, 16),
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: t.borderSoft,
            }}
          >
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={{ fontSize: idnTokens.text.body, color: t.muted }}>Annuler</Text>
            </Pressable>
            <Text style={{ fontSize: idnTokens.text.label, fontWeight: '600', color: t.ink }}>
              {label || 'Sélectionner une date'}
            </Text>
            <Pressable onPress={confirm} hitSlop={10}>
              <Text style={{ fontSize: idnTokens.text.body, color: idnTokens.green, fontWeight: '600' }}>OK</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            locale="fr-FR"
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_, selected) => {
              if (selected) setTempDate(selected);
            }}
            themeVariant={t.dark ? 'dark' : 'light'}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </Modal>
    </>
  );
}
