import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { ChoiceRow } from '@/components/cv/cv-ui';

export default function ICVCreate() {
  const t = useIdnTheme();
  const router = useRouter();
  const cvs = useQuery(api.cv.cvs.listMine);
  const create = useMutation(api.cv.cvs.create);
  const [name, setName] = useState('');
  const [copyFrom, setCopyFrom] = useState<Id<'citizenCv'> | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const trimmed = name.trim();
    if (trimmed.length < 1) {
      Alert.alert('Nom manquant', 'Donne un nom à ton CV.');
      return;
    }
    setBusy(true);
    try {
      const id = await create({ name: trimmed, copyFromCvId: copyFrom ?? undefined });
      router.dismissAll();
      router.push(`/icv?cv=${id}` as never);
    } catch (e) {
      const msg = (e as Error).message ?? '';
      Alert.alert('Création impossible', msg.includes('CV_LIMIT_REACHED') ? 'Tu as atteint la limite de 10 CV.' : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      sheet
      keyboard
      header={<AppBar title="Crée ton CV" onBack={() => router.back()} backIcon="close" />}
      footer={
        <IdnButton t={t} full onPress={submit} loading={busy} disabled={name.trim().length < 1}>
          Créer le CV
        </IdnButton>
      }
    >
      <SectionTitle style={{ marginTop: 16 }}>Nom du CV</SectionTitle>
      <IdnInput t={t} value={name} onChangeText={setName} placeholder="Par exemple : CV Tech, CV Direction…" autoFocus maxLength={80} />

      {cvs && cvs.length > 0 ? (
        <>
          <SectionTitle>Point de départ</SectionTitle>
          <Card>
            <ChoiceRow label="CV vierge" selected={copyFrom === null} onPress={() => setCopyFrom(null)} />
            {cvs.map((cv) => (
              <ChoiceRow key={cv._id} label={cv.name} sub="Copie de ce CV" selected={copyFrom === cv._id} onPress={() => setCopyFrom(cv._id)} />
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
