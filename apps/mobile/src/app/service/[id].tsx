import React from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, Note, Row, ScreenTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { api } from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  administrative: 'Administratif',
  civilStatus: 'État civil',
  fiscal: 'Fiscalité',
  education: 'Éducation',
  health: 'Santé',
  transport: 'Transport',
  social: 'Social',
  other: 'Autre',
};

async function openLink(url: string) {
  try {
    if (Platform.OS === 'web') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const ok = await Linking.canOpenURL(url);
    if (!ok) throw new Error('unsupported');
    await Linking.openURL(url);
  } catch {
    Alert.alert('Lien impossible à ouvrir', 'Ce service n’a pas pu être ouvert depuis ton téléphone. Réessaie plus tard.');
  }
}

/** Fiche d'un service publié par une application autorisée. */
export default function ServiceDetail() {
  const t = useIdnTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAuthenticated } = useConvexAuth();
  const decodedId = decodeURIComponent(id ?? '');
  const service = useQuery(api.services.get, isAuthenticated && decodedId ? { id: decodedId } : 'skip');
  const header = <AppBar title="Service" onBack={() => router.back()} />;

  if (service === undefined) {
    return (
      <Screen header={header}>
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement du service" />
        </View>
      </Screen>
    );
  }
  if (!service) {
    return (
      <Screen header={header}>
        <Note center style={{ marginTop: 32 }}>Ce service n’est plus disponible, ou tu n’y as plus accès.</Note>
      </Screen>
    );
  }

  return (
    <Screen
      header={header}
      footer={
        <IdnButton t={t} full leadIcon={<Icon name="link" size={18} color="#fff" />} onPress={() => openLink(service.link)}>
          Accéder au service
        </IdnButton>
      }
    >
      <View style={{ marginTop: 20 }}>
        <Badge tone="green">{CATEGORY_LABEL[service.category] ?? service.category}</Badge>
      </View>
      <ScreenTitle title={service.label} lead={service.description} />

      <Card style={{ marginTop: 20 }}>
        <Row icon="building" tone="blue" title={service.appName} sub="Application qui propose ce service" />
      </Card>

      <Card padded style={{ marginTop: 16, backgroundColor: t.blueBadge, borderColor: t.blueBadge }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="shield" size={18} color={t.blueText} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 19, color: t.ink2 }}>
            Tu vas ouvrir le site de {service.appName}. Tu as déjà autorisé cette application : elle accède aux seules informations que tu as acceptées. Tu peux lui retirer cet accès à tout moment dans « Applications autorisées ».
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
