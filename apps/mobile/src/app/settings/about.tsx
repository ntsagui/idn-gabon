import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, Row, SectionTitle } from '@/design/components/list';
import { IdnMark, IdnFlagBars } from '@/design/mark';

const SITE = 'https://identite.ga';
const openLegal = (slug: string) => WebBrowser.openBrowserAsync(`${SITE}/legal/${slug}`);

export default function SettingsAbout() {
  const t = useIdnTheme();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? 'inconnue';
  return (
    <Screen header={<AppBar title="À propos" onBack={() => router.back()} />}>
      <Card padded style={{ marginTop: 16, alignItems: 'center', paddingVertical: 22 }}>
        <IdnMark size={56} />
        <Text style={{ fontSize: 18, fontWeight: '600', color: t.ink, marginTop: 12 }}>Identité Numérique</Text>
        <Text style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>Ntsagui digital</Text>
        <Text style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, marginTop: 12 }}>Version {version}</Text>
      </Card>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 21, color: t.ink2 }}>
        IDN est l’infrastructure de confiance qui relie chaque citoyen, résident et visiteur aux services administratifs en ligne. Opérée par Ntsagui digital.
      </Text>

      <SectionTitle>Informations légales</SectionTitle>
      <Card>
        <Row icon="doc" title="Conditions d’utilisation" chevron onPress={() => void openLegal('terms')} />
        <Row icon="shieldPlain" title="Politique de confidentialité" chevron onPress={() => void openLegal('privacy')} />
        <Row icon="scale" title="Mentions légales" chevron onPress={() => void openLegal('mentions')} />
        <Row icon="eye" title="Accessibilité (RGAA)" chevron onPress={() => void openLegal('accessibilite')} />
        <Row icon="file" title="Licences open source" chevron onPress={() => void openLegal('licenses')} />
      </Card>

      <SectionTitle>Service</SectionTitle>
      <Card>
        <Row icon="activity" title="État de la plateforme" sub="Composants du service et transparence" chevron onPress={() => void WebBrowser.openBrowserAsync(`${SITE}/status`)} />
        <Row icon="chat" title="Aide et contact" chevron onPress={() => router.push('/settings/support' as never)} />
      </Card>

      <View style={{ alignItems: 'center', paddingTop: 24 }}>
        <IdnFlagBars width={42} height={3} />
      </View>
    </Screen>
  );
}
