import React from 'react';
import { Alert, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, DetailRow, IconTile } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { FILE_TYPE_LABEL, expiryState, formatBytes, formatIsoDate, formatTimestamp } from '@/components/documents/doc-format';
import { findDocFolder } from '@/data/documents';
import { api } from '@/lib/api';

/** Fiche d'un document iDocument : détails, ouverture du fichier, suppression. */
export default function DocPreview() {
  const t = useIdnTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const item = useQuery(api.idoc.get, isAuthenticated && id ? { itemId: id as never } : 'skip');
  const downloadUrl = useQuery(
    api.idoc.getDownloadUrl,
    isAuthenticated && id ? { itemId: id as never } : 'skip',
  );
  const removeItem = useMutation(api.idoc.remove);
  const [deleting, setDeleting] = React.useState(false);

  const name = item?.name || item?.originalName || 'Document sans nom';

  function onDelete() {
    Alert.alert('Supprimer ce document ?', `« ${name} » sera retiré de ton iDocument.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await removeItem({ itemId: id as never });
            router.back();
          } catch (err) {
            setDeleting(false);
            Alert.alert('Suppression impossible', err instanceof Error ? err.message : 'Réessaie dans un instant.');
          }
        },
      },
    ]);
  }

  async function onOpen() {
    if (!downloadUrl) return;
    try {
      // Lecteur intégré : le citoyen reste dans l'app (l'URL signée expire vite).
      await WebBrowser.openBrowserAsync(downloadUrl);
    } catch {
      Alert.alert('Ouverture impossible', 'Aucune application de ton téléphone ne peut ouvrir ce fichier.');
    }
  }

  const header = <AppBar title="Document" onBack={() => router.back()} />;

  if (item === undefined) {
    return (
      <Screen header={header}>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement du document" />
        </View>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen header={header}>
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <IdnLottie name="idocument" size={120} />
          <Text style={{ marginTop: 8, fontSize: 14, color: t.muted, textAlign: 'center' }}>Ce document est introuvable ou a été supprimé.</Text>
        </View>
      </Screen>
    );
  }

  const folder = findDocFolder(item.folderId);
  const expiry = expiryState(item.expirationDate);

  return (
    <Screen
      header={header}
      footer={
        <>
          <IdnButton t={t} full disabled={!downloadUrl} leadIcon={<Icon name="download" size={18} color="#fff" />} onPress={onOpen}>
            Ouvrir le fichier
          </IdnButton>
          <IdnButton t={t} variant="dangerGhost" full loading={deleting} leadIcon={<Icon name="trash" size={18} color={t.redText} />} onPress={onDelete}>
            Supprimer
          </IdnButton>
        </>
      }
    >
      <View style={{ marginTop: 20, alignItems: 'center', gap: 10 }}>
        <IconTile icon={item.fileType === 'image' ? 'camera' : 'doc'} tone="green" size={56} />
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>{name}</Text>
        {expiry === 'expired' ? <Badge tone="red" icon="alert">Expiré</Badge> : expiry === 'soon' ? <Badge tone="yellow" icon="clock">Expire bientôt</Badge> : null}
      </View>

      <Card style={{ marginTop: 20 }}>
        <DetailRow label="Dossier" value={folder?.label ?? item.folderId} />
        <DetailRow label="Type" value={FILE_TYPE_LABEL[item.fileType] ?? item.fileType} />
        {item.side ? <DetailRow label="Face" value={item.side === 'front' ? 'Recto' : 'Verso'} /> : null}
        <DetailRow label="Ajouté le" value={formatTimestamp(item.createdAt)} />
        <DetailRow label="Taille" value={formatBytes(item.fileSize)} />
        {item.expirationDate ? <DetailRow label="Expire le" value={formatIsoDate(item.expirationDate)} /> : null}
        {item.originalName && item.originalName !== item.name ? <DetailRow label="Fichier d’origine" value={item.originalName} mono /> : null}
      </Card>
    </Screen>
  );
}
