import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { FolderCard } from '@/components/documents/folder-card';
import { plural } from '@/components/documents/doc-format';
import { DOC_FOLDERS } from '@/data/documents';
import { api } from '@/lib/api';

/** iDocument (prototype « idocument ») : compteur et grille des dossiers. */
export default function IDocHome() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const summary = useQuery(api.idoc.summary, isAuthenticated ? {} : 'skip');

  const countsById = new Map(summary?.map((s) => [s.folderId as string, s]) ?? []);
  const folders = DOC_FOLDERS.map((f) => ({
    folder: f,
    count: countsById.get(f.id)?.count ?? 0,
    hasExpiring: countsById.get(f.id)?.hasExpiring ?? false,
  }));
  const totalItems = folders.reduce((sum, f) => sum + f.count, 0);
  const filledFolders = folders.filter((f) => f.count > 0).length;
  const rows = [0, 2, 4, 6].map((i) => folders.slice(i, i + 2));

  return (
    <Screen
      header={<AppBar title="iDocument" onBack={() => router.back()} />}
      footer={
        <IdnButton t={t} full leadIcon={<Icon name="plus" size={18} color="#fff" />} onPress={() => router.push('/idoc/add' as never)}>
          Ajouter un document
        </IdnButton>
      }
    >
      {summary === undefined ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement de tes documents" />
        </View>
      ) : (
        <>
          {totalItems === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 16 }}>
              <IdnLottie name="idocument" size={120} />
              <Text accessibilityRole="header" style={{ marginTop: 8, fontSize: 17, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
                Aucun document pour l’instant
              </Text>
              <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
                Range ici tes pièces importantes, classées par dossier, pour les retrouver à tout moment.
              </Text>
            </View>
          ) : (
            <Text style={{ marginTop: 16, fontSize: 14, color: t.muted }}>
              {plural(totalItems, 'document', 'documents')} · {plural(filledFolders, 'dossier utilisé', 'dossiers utilisés')}
            </Text>
          )}
          <View accessibilityLabel="Dossiers" style={{ marginTop: 16, gap: 10 }}>
            {rows.map((pair) => (
              <View key={pair[0].folder.id} style={{ flexDirection: 'row', gap: 10 }}>
                {pair.map((f) => (
                  <FolderCard
                    key={f.folder.id}
                    f={f.folder}
                    count={f.count}
                    hasExpiring={f.hasExpiring}
                    onPress={() => router.push(`/idoc/folder/${f.folder.id}` as never)}
                  />
                ))}
              </View>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
