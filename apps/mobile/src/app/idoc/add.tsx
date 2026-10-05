import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/design/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IconTile, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnInput } from '@/design/components/idn-input';
import { formatBytes } from '@/components/documents/doc-format';
import { DOC_FOLDERS, findDocFolder, type DocFolderId } from '@/data/documents';
import { api } from '@/lib/api';
import { uploadToStorage } from '@/lib/storage-upload';

/** « 12/04/2031 » → « 2031-04-12 », ou null si la date n'existe pas. */
function frDateToIso(input: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

type PickedFile = {
  name: string;
  mime: string;
  size: number;
  fileType: 'image' | 'pdf' | 'other';
  /** Natif : fichier local envoyé tel quel. */
  uri?: string;
  /** Web : octets lus par le navigateur. */
  bytes?: Uint8Array;
};

function inferFileType(mime: string): 'image' | 'pdf' | 'other' {
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'other';
}

async function pickFile(): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) {
          resolve(null);
          return;
        }
        const buf = new Uint8Array(await f.arrayBuffer());
        const mime = f.type || 'application/octet-stream';
        resolve({ name: f.name, mime, bytes: buf, size: buf.length, fileType: inferFileType(mime) });
      };
      input.click();
    });
  }
  // Natif : DocumentPicker supporte images + PDF + autres documents.
  const res = await DocumentPicker.getDocumentAsync({
    type: ['image/*', 'application/pdf'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  const mime = asset.mimeType ?? 'application/octet-stream';
  // Envoi direct depuis l'URI : React Native ne sait pas construire un Blob
  // à partir d'octets (`new Blob([Uint8Array])`), mais sait lire un fichier local.
  return { name: asset.name, mime, uri: asset.uri, size: asset.size ?? 0, fileType: inferFileType(mime) };
}

// Fallback caméra (sur natif uniquement) — permet de prendre une photo.
async function captureWithCamera(): Promise<PickedFile | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
  });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  return { name: asset.fileName ?? 'photo.jpg', mime: asset.mimeType ?? 'image/jpeg', uri: asset.uri, size: asset.fileSize ?? 0, fileType: 'image' };
}

export default function DocAddSelect() {
  const t = useIdnTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ folder?: string }>();
  const generateUrl = useMutation(api.idoc.generateUploadUrl);
  const createItem = useMutation(api.idoc.create);

  const [selected, setSelected] = useState<DocFolderId>(findDocFolder(params.folder)?.id ?? 'identity');
  const [name, setName] = useState('');
  const [expiration, setExpiration] = useState('');
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onPick() {
    try {
      const f = await pickFile();
      if (!f) return;
      setPicked(f);
      if (!name) setName(f.name);
    } catch (err) {
      Alert.alert('Sélection impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
    }
  }

  async function onCapture() {
    if (Platform.OS === 'web') {
      void onPick();
      return;
    }
    try {
      const f = await captureWithCamera();
      if (!f) return;
      setPicked(f);
      if (!name) setName(f.name);
    } catch (err) {
      Alert.alert('Photo impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
    }
  }

  async function submit() {
    if (submitting) return;
    if (!picked) {
      Alert.alert('Aucun fichier', 'Choisis un fichier ou prends une photo.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Donne un nom à ce document.');
      return;
    }
    const expirationIso = expiration.trim() ? frDateToIso(expiration) : undefined;
    if (expirationIso === null) {
      Alert.alert('Date invalide', 'Saisis la date d’expiration au format JJ/MM/AAAA.');
      return;
    }
    setSubmitting(true);
    try {
      const uploadUrl = await generateUrl({});
      let storageId: string;
      if (picked.uri) {
        storageId = await uploadToStorage(uploadUrl, picked.uri, picked.mime);
      } else {
        const uploadRes = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': picked.mime }, body: new Blob([(picked.bytes ?? new Uint8Array()) as unknown as BlobPart], { type: picked.mime }) });
        if (!uploadRes.ok) throw new Error(`L’envoi du fichier a échoué (code ${uploadRes.status}).`);
        storageId = ((await uploadRes.json()) as { storageId: string }).storageId;
      }

      await createItem({
        folderId: selected,
        contentRef: storageId as never,
        name: name.trim(),
        originalName: picked.name,
        mimeType: picked.mime,
        fileType: picked.fileType,
        fileSize: picked.size,
        expirationDate: expirationIso,
      });

      router.replace({ pathname: '/idoc/add-success', params: { folder: selected } } as never);
    } catch (err) {
      Alert.alert('Ajout impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
      setSubmitting(false);
    }
  }

  return (
    <Screen
      keyboard
      header={<AppBar title="Ajouter un document" onBack={() => router.back()} />}
      footer={
        <IdnButton t={t} full onPress={submit} disabled={!picked} loading={submitting}>
          {submitting ? 'Envoi en cours…' : 'Ajouter le document'}
        </IdnButton>
      }
    >
      <SectionTitle>Dossier</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
        {DOC_FOLDERS.map((f) => {
          const sel = f.id === selected;
          return (
            <Pressable
              key={f.id}
              onPress={() => setSelected(f.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sel }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
            >
              <Icon name={f.icon} size={16} color={sel ? t.greenText : t.ink2} />
              <Text style={{ fontSize: 14, fontWeight: sel ? '600' : '500', color: sel ? t.greenText : t.ink }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle>Fichier</SectionTitle>
      <Pressable
        onPress={onPick}
        accessibilityRole="button"
        accessibilityLabel={picked ? `Fichier choisi : ${picked.name}. Appuie pour en choisir un autre` : 'Choisir un fichier'}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: picked ? t.green : t.border, backgroundColor: pressed ? t.surface2 : t.surface })}
      >
        <IconTile icon={picked ? 'checkCir' : 'upload'} tone={picked ? 'green' : 'neutral'} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>{picked ? picked.name : 'Choisir un fichier'}</Text>
          <Text style={{ marginTop: 2, fontSize: 13, color: t.muted }}>
            {picked ? `${formatBytes(picked.size)} · appuie pour changer` : 'PDF ou image (JPG, PNG)'}
          </Text>
        </View>
      </Pressable>
      {Platform.OS !== 'web' ? (
        <IdnButton t={t} variant="ghost" full style={{ marginTop: 10 }} leadIcon={<Icon name="camera" size={18} color={t.ink} />} onPress={onCapture}>
          Prendre une photo
        </IdnButton>
      ) : null}

      <SectionTitle>Informations</SectionTitle>
      <View style={{ gap: 14 }}>
        <IdnInput t={t} label="Nom du document" value={name} onChangeText={setName} />
        <IdnInput
          t={t}
          label="Date d’expiration (facultatif)"
          placeholder="JJ/MM/AAAA"
          hint="Tu verras ce document signalé quand l’échéance approche."
          value={expiration}
          onChangeText={setExpiration}
          maxLength={10}
        />
      </View>
    </Screen>
  );
}
