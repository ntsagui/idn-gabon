import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';

export default function ICVRename() {
  const params = useLocalSearchParams<{ cv?: string; name?: string }>();
  const cvId = params.cv as Id<'citizenCv'> | undefined;
  const t = useIdnTheme();
  const router = useRouter();
  const rename = useMutation(api.cv.cvs.rename);
  const [name, setName] = useState(params.name ?? '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !cvId) return;
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      Alert.alert('Nom manquant', 'Le nom ne peut pas être vide.');
      return;
    }
    setBusy(true);
    try {
      await rename({ cvId, name: trimmed });
      router.back();
    } catch (e) {
      Alert.alert('Renommage impossible', (e as Error).message || 'Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      sheet
      keyboard
      header={<AppBar title="Renommer le CV" onBack={() => router.back()} backIcon="close" />}
      footer={
        <IdnButton t={t} full onPress={submit} loading={busy} disabled={!cvId || name.trim().length < 1}>
          Enregistrer
        </IdnButton>
      }
    >
      <SectionTitle style={{ marginTop: 16 }}>Nouveau nom</SectionTitle>
      <IdnInput t={t} value={name} onChangeText={setName} autoFocus maxLength={80} />
    </Screen>
  );
}
