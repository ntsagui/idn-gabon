import React, { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';
import { Text, TextInput } from '@/design/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIdnTheme } from '@/design/theme';
import { idnTokens } from '@/design/tokens';
import { NSheetHeader } from '@/components/chrome/sheet-header';
import RichLetterEditor from '@/components/rich-letter-editor';
import { IdnButton } from '@/design/components/idn-button';
import { Icon } from '@/design/icons';
import { api } from '@/lib/api';
import { uploadAttachment, type PickedAttachment } from '@/lib/attachment-upload';
import { resolveActiveAccountId, useIBoiteActiveAccount } from '@/lib/iboite-active-account';
import { hasLetterContent } from '@/lib/letter-content';

/** Composition d'un courrier physique iBoîte, avec éditeur riche et pièces jointes. */

// Limite alignée sur le web (`letter-compose-modal`). Le backend n'impose
// pas de plafond côté `generateUploadUrl` ; on garde donc la même garde
// côté client.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENT_LABEL = '10 Mo';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function pickAttachment(): Promise<PickedAttachment | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async () => {
        const f = input.files?.[0];
        if (!f) {
          resolve(null);
          return;
        }
        const buf = new Uint8Array(await f.arrayBuffer());
        resolve({
          name: f.name,
          size: f.size,
          mime: f.type || 'application/octet-stream',
          bytes: buf,
        });
      };
      input.click();
    });
  }
  const res = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets[0]) return null;
  const asset = res.assets[0];
  return { name: asset.name, size: asset.size ?? 0, mime: asset.mimeType ?? 'application/octet-stream', uri: asset.uri };
}

export default function IBoiteCourrierCompose() {
  const t = useIdnTheme();
  const router = useRouter();
  const convex = useConvex();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ to?: string; subject?: string; body?: string }>();
  const { isAuthenticated } = useConvexAuth();
  const accounts = useQuery(api.iboite.accounts.listMine, isAuthenticated ? {} : 'skip');
  const send = useMutation(api.iboite.letters.send);
  const generateUploadUrl = useMutation(api.iboite.letters.generateUploadUrl);
  const { activeAccountId } = useIBoiteActiveAccount();
  const accountId = resolveActiveAccountId(accounts, activeAccountId);
  const [toEmail, setToEmail] = useState((params.to as string | undefined) ?? '');
  const [subject, setSubject] = useState((params.subject as string | undefined) ?? '');
  const [initialBody] = useState((params.body as string | undefined) ?? '');
  const bodyRef = React.useRef(initialBody);
  const [attachments, setAttachments] = useState<PickedAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const senderEmail = accounts?.find((a) => a._id === accountId)?.emailAlias ?? '—';

  const onBodyChange = React.useCallback(async (html: string) => {
    bodyRef.current = html;
  }, []);

  const onPickInlineImage = React.useCallback(async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (result.canceled || !result.assets[0]) return null;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > MAX_ATTACHMENT_BYTES) throw new Error(`Chaque image est limitée à ${MAX_ATTACHMENT_LABEL}.`);
      const mime = asset.mimeType ?? 'image/jpeg';
      const uploadUrl = await generateUploadUrl({});
      const upload = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mime }, body: await (await fetch(asset.uri)).blob() });
      if (!upload.ok) throw new Error(`Upload échoué (${upload.status})`);
      const { storageId } = (await upload.json()) as { storageId: string };
      const url = await convex.query(api.iboite.letters.getStorageUrl, { storageRef: storageId as never });
      if (!url) throw new Error('Impossible de résoudre l’image envoyée.');
      return url;
    } catch (err) {
      Alert.alert('Image non ajoutée', err instanceof Error ? err.message : 'Réessaie.');
      return null;
    }
  }, [convex, generateUploadUrl]);

  async function onAttach() {
    try {
      const f = await pickAttachment();
      if (!f) return;
      if (f.size > MAX_ATTACHMENT_BYTES) {
        Alert.alert('Fichier trop volumineux', `Chaque pièce jointe est limitée à ${MAX_ATTACHMENT_LABEL}.`);
        return;
      }
      setAttachments((prev) => [...prev, f]);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Sélection impossible.');
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    if (submitting) return;
    if (!accountId) {
      Alert.alert('Aucun compte', 'Aucun compte iBoîte actif.');
      return;
    }
    if (!toEmail.trim()) {
      Alert.alert('Destinataire requis', 'Saisis une adresse iBoîte (login ou alias @idn.ga).');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Objet requis', 'Donne un objet à ton courrier.');
      return;
    }
    const body = bodyRef.current.trim();
    if (!hasLetterContent(body)) {
      Alert.alert('Courrier vide', 'Écris le contenu de ton courrier.');
      return;
    }
    setSubmitting(true);
    try {
      // Upload des pièces jointes vers `_storage`, puis collecte des
      // références à passer à `send`.
      const uploaded: { name: string; size: number; storageRef: string; mimeType: string }[] = [];
      for (const att of attachments) {
        const uploadUrl = await generateUploadUrl({});
        const storageId = await uploadAttachment(uploadUrl, att);
        uploaded.push({
          name: att.name,
          size: att.size,
          storageRef: storageId,
          mimeType: att.mime,
        });
      }

      await send({
        accountId: accountId as never,
        recipientEmail: toEmail.trim().toLowerCase(),
        subject: subject.trim(),
        body,
        attachments: uploaded.length > 0 ? (uploaded as never) : undefined,
      });
      router.back();
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Envoi impossible.');
      setSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader
        t={t}
        title="Nouveau courrier"
        onBack={() => router.back()}
        right={
          <Pressable onPress={submit} disabled={submitting} style={{ padding: 4 }}>
            <Icon name="send" size={18} color={submitting ? t.muted : idnTokens.green} />
          </Pressable>
        }
      />
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: t.borderSoft, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: t.muted, width: 36, fontWeight: '500' }}>De</Text>
          <Text style={{ fontSize: 13, color: t.ink }}>{senderEmail}</Text>
        </View>
        <View style={{ borderBottomWidth: 1, borderBottomColor: t.borderSoft, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 12, color: t.muted, width: 36, fontWeight: '500' }}>À</Text>
          <TextInput
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="login ou destinataire@idn.ga"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ flex: 1, fontSize: 13, color: t.ink }}
          />
        </View>
        <View style={{ borderBottomWidth: 1, borderBottomColor: t.borderSoft, paddingVertical: 12 }}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Objet"
            placeholderTextColor={t.muted}
            style={{ fontSize: 14, color: t.ink, fontWeight: '600' }}
          />
        </View>
        <View style={{ flex: 1, paddingVertical: 10 }}>
          <RichLetterEditor initialHtml={initialBody} onChange={onBodyChange} onPickImage={onPickInlineImage} dom={{ style: { flex: 1 } }} />
        </View>
      </View>
      {attachments.length > 0 ? (
        <View style={{ borderTopWidth: 1, borderTopColor: t.borderSoft, paddingHorizontal: 22, paddingVertical: 8, gap: 6 }}>
          {attachments.map((a, i) => (
            <View
              key={`${a.name}-${i}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 }}
            >
              <Icon name="paper" size={14} color={t.ink2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: 12, color: t.ink, fontWeight: '500' }}>{a.name}</Text>
                <Text style={{ fontSize: 10, color: t.muted }}>{formatBytes(a.size)}</Text>
              </View>
              <Pressable
                onPress={() => removeAttachment(i)}
                disabled={submitting}
                accessibilityLabel={`Retirer ${a.name}`}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <Icon name="close" size={16} color={t.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ borderTopWidth: 1, borderTopColor: t.borderSoft, backgroundColor: t.surface, paddingHorizontal: 14, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 10), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Pressable
          onPress={onAttach}
          disabled={submitting}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8 }}
        >
          <Icon name="paper" size={14} color={t.ink2} />
          <Text style={{ color: t.ink2, fontSize: 12, fontWeight: '500' }}>Joindre</Text>
          <Text style={{ color: t.muted, fontSize: 11 }}>Max {MAX_ATTACHMENT_LABEL}</Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <IdnButton t={t} variant="primary" size="sm" leadIcon={<Icon name="send" size={14} color="#fff" />} onPress={submit} disabled={submitting}>
          {submitting ? '…' : 'Envoyer'}
        </IdnButton>
      </View>
    </View>
  );
}
