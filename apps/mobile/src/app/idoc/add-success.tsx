import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Screen } from '@/design/components/screen';
import { Card, Row } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { plural } from '@/components/documents/doc-format';
import { findDocFolder } from '@/data/documents';
import { api } from '@/lib/api';

/** Confirmation après l'ajout d'un document. */
export default function DocAddSuccess() {
  const t = useIdnTheme();
  const router = useRouter();
  const { folder: folderParam } = useLocalSearchParams<{ folder?: string }>();
  const { isAuthenticated } = useConvexAuth();
  const summary = useQuery(api.idoc.summary, isAuthenticated ? {} : 'skip');
  const folder = findDocFolder(folderParam);
  const count = summary?.find((s) => s.folderId === folder?.id)?.count;

  return (
    <Screen
      footer={
        <>
          <IdnButton t={t} full onPress={() => router.replace('/idoc' as never)}>
            Retour à mes documents
          </IdnButton>
          <IdnButton t={t} variant="ghost" full onPress={() => router.replace(`/idoc/add${folder ? `?folder=${folder.id}` : ''}` as never)}>
            Ajouter un autre document
          </IdnButton>
        </>
      }
    >
      <View style={{ alignItems: 'center', marginTop: 48 }}>
        <IdnLottie name="success" size={128} label="Document ajouté" />
        <Text accessibilityRole="header" style={{ marginTop: 12, fontSize: 22, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
          Document ajouté
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
          {folder ? `Il est rangé dans le dossier « ${folder.label} ».` : 'Il est rangé dans ton iDocument.'} Tu peux le retrouver à tout moment depuis l’accueil.
        </Text>
      </View>
      {folder ? (
        <Card style={{ marginTop: 24 }}>
          <Row
            icon={folder.icon}
            tone="green"
            title={folder.label}
            sub={count === undefined ? '…' : plural(count, 'document', 'documents')}
            chevron
            onPress={() => router.replace(`/idoc/folder/${folder.id}` as never)}
          />
        </Card>
      ) : null}
    </Screen>
  );
}
