import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, Row } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { FILE_TYPE_LABEL, expiryState, formatTimestamp, plural } from '@/components/documents/doc-format';
import { findDocFolder } from '@/data/documents';
import { api } from '@/lib/api';

/** Contenu d'un dossier iDocument. */
export default function FolderDetail() {
  const t = useIdnTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const folder = findDocFolder(id);
  const items = useQuery(api.idoc.listByFolder, isAuthenticated && folder ? { folderId: folder.id } : 'skip');

  const add = () => router.push(`/idoc/add?folder=${folder?.id ?? 'identity'}` as never);

  return (
    <Screen
      header={<AppBar title={folder?.label ?? 'Dossier'} onBack={() => router.back()} />}
      footer={
        folder ? (
          <IdnButton t={t} full leadIcon={<Icon name="plus" size={18} color="#fff" />} onPress={add}>
            Ajouter un document
          </IdnButton>
        ) : undefined
      }
    >
      {!folder ? (
        <Text style={{ marginTop: 24, fontSize: 14, color: t.muted, textAlign: 'center' }}>Ce dossier n’existe pas.</Text>
      ) : items === undefined ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement du dossier" />
        </View>
      ) : items.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <IdnLottie name="idocument" size={120} />
          <Text accessibilityRole="header" style={{ marginTop: 8, fontSize: 17, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
            Dossier vide
          </Text>
          <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
            {folder.desc}. Ajoute ton premier document à ce dossier.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 16, marginBottom: 12, fontSize: 14, color: t.muted }}>{plural(items.length, 'document', 'documents')}</Text>
          <Card>
            {items.map((d) => {
              const name = d.name || d.originalName || 'Document sans nom';
              const expiry = expiryState(d.expirationDate);
              const sub = [
                FILE_TYPE_LABEL[d.fileType] ?? d.fileType,
                d.side ? (d.side === 'front' ? 'Recto' : 'Verso') : null,
                `ajouté le ${formatTimestamp(d.createdAt)}`,
              ]
                .filter(Boolean)
                .join(' · ');
              return (
                <Row
                  key={d._id}
                  icon={d.fileType === 'image' ? 'camera' : 'doc'}
                  tone="green"
                  title={name}
                  sub={sub}
                  chevron
                  accessibilityLabel={`${name}, ${sub}${expiry === 'expired' ? ', expiré' : expiry === 'soon' ? ', expire bientôt' : ''}`}
                  right={
                    expiry === 'expired' ? (
                      <Badge tone="red">Expiré</Badge>
                    ) : expiry === 'soon' ? (
                      <Badge tone="yellow">Expire bientôt</Badge>
                    ) : undefined
                  }
                  onPress={() => router.push(`/idoc/preview/${d._id}` as never)}
                />
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}
