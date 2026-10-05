import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useAction, useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, IconTile, Note, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { useActiveCv } from '@/hooks/use-active-cv';
import { ChoiceRow } from '@/components/cv/cv-ui';

const MAX_SIZE = 5 * 1024 * 1024;

export default function ICVImport() {
  const t = useIdnTheme();
  const router = useRouter();
  const { activeCvId } = useActiveCv();
  const generateUploadUrl = useMutation(api.cv.importInternal.generateUploadUrl);
  const parseAndApply = useAction(api.cv.import.parseAndApply);
  const [file, setFile] = useState<{ uri: string; name: string; size: number; mime: string } | null>(null);
  const [mode, setMode] = useState<'new' | 'merge'>('new');
  const [busy, setBusy] = useState(false);

  async function pick() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    if ((a.size ?? 0) > MAX_SIZE) {
      Alert.alert('Fichier trop lourd', 'Le fichier dépasse 5 Mo.');
      return;
    }
    setFile({ uri: a.uri, name: a.name, size: a.size ?? 0, mime: a.mimeType ?? 'application/pdf' });
  }

  async function submit() {
    if (!file || busy) return;
    if (mode === 'merge' && !activeCvId) {
      Alert.alert('Aucun CV actif', 'Choisis « Créer un nouveau CV ».');
      return;
    }
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const blob = await readFileAsBlob(file.uri, file.mime);
      const upload = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': file.mime }, body: blob });
      if (!upload.ok) throw new Error(`Envoi du fichier échoué (${upload.status}).`);
      const json = (await upload.json()) as { storageId: string };

      const result = await parseAndApply({
        storageRef: json.storageId as Id<'_storage'>,
        mode,
        targetCvId: mode === 'merge' ? activeCvId! : undefined,
        newCvName: mode === 'new' ? `CV importé — ${file.name.replace(/\.[^.]+$/, '')}` : undefined,
      });

      Alert.alert('Import réussi', 'Les informations de ton CV ont été importées. Relis-les avant de le partager.');
      router.dismissAll();
      router.push(`/icv?cv=${result.cvId}` as never);
    } catch (e) {
      Alert.alert('Import impossible', `L’import a échoué.\n${(e as Error).message ?? ''}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      sheet
      header={<AppBar title="Importer un CV" onBack={() => router.back()} backIcon="close" />}
      footer={
        <IdnButton t={t} full onPress={submit} loading={busy} disabled={!file}>
          {busy ? 'Import en cours…' : 'Lancer l’import'}
        </IdnButton>
      }
    >
      {busy ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <IdnLottie name="loader" size={80} loop label="Import en cours" />
          <Text style={{ marginTop: 12, fontSize: 14, color: t.muted, textAlign: 'center' }}>
            Lecture de ton CV par l’IA. Cela peut prendre une minute.
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel={file ? `Fichier choisi : ${file.name}. Changer de fichier` : 'Choisir un fichier'}
            style={({ pressed }) => ({
              marginTop: 16, alignItems: 'center', gap: 8, padding: 24, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed',
              borderColor: t.muted, backgroundColor: pressed ? t.surface2 : t.surface,
            })}
          >
            <IconTile icon={file ? 'file' : 'upload'} tone="green" size={44} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.ink, textAlign: 'center' }}>{file ? file.name : 'Choisir un fichier'}</Text>
            <Text style={{ fontSize: 13, color: t.muted }}>
              {file ? `${(file.size / 1024 / 1024).toFixed(2).replace('.', ',')} Mo · appuie pour changer` : 'PDF ou image, 5 Mo maximum'}
            </Text>
          </Pressable>

          <SectionTitle>Que faire du contenu ?</SectionTitle>
          <Card>
            <ChoiceRow label="Créer un nouveau CV" selected={mode === 'new'} onPress={() => setMode('new')} />
            <ChoiceRow
              label="Fusionner avec le CV actif"
              sub={!activeCvId ? 'Aucun CV actif' : 'Complète ton CV actuel'}
              selected={mode === 'merge'}
              onPress={() => setMode('merge')}
              disabled={!activeCvId}
            />
          </Card>
          <Note>L’IA extrait ton parcours du document. Vérifie toujours le résultat.</Note>
        </>
      )}
    </Screen>
  );
}

async function readFileAsBlob(uri: string, mime: string): Promise<Blob> {
  // Nouvelle API expo-file-system v55 : `File` est un wrapper de Blob.
  // On lit le binaire directement, sans round-trip base64.
  const file = new File(uri);
  const arrayBuffer = await file.arrayBuffer();
  return new Blob([arrayBuffer], { type: mime });
}
