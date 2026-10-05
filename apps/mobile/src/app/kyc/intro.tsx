import React from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnButton } from '@/design/components/idn-button';
import { Card, IconTile, Row, ScreenTitle, SectionTitle } from '@/design/components/list';
import { api } from '@/lib/api';
import { kycEntryRoute } from '@/lib/kyc-flow';

function Fact({ value, label }: { value: string; label: string }) {
  const t = useIdnTheme();
  return (
    <View style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: t.ink }}>{value}</Text>
      <Text style={{ marginTop: 2, fontSize: 12, color: t.muted }}>{label}</Text>
    </View>
  );
}

/** Présentation de la vérification d'identité (Niveau 2, ou première étape du Niveau 3). */
export default function KycIntro() {
  const t = useIdnTheme();
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const { isAuthenticated } = useConvexAuth();
  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : 'skip');
  const active = useQuery(api.kyc.getActiveRequest, isAuthenticated ? {} : 'skip');
  const currentLoa = me?.profile?.loa ?? 1;
  const targetLoa = target === '3' || (target === undefined && currentLoa === 2) ? 3 : 2;

  function continueFlow() {
    const destination = kycEntryRoute({ targetLoa, currentLoa, activeStatus: active?.status });
    if (destination === 'review') router.replace('/kyc/review');
    else if (destination === 'level3') router.replace('/kyc/level3' as never);
    else router.push(`/kyc/doc?target=${targetLoa}` as never);
  }

  const label = active?.status === 'complement_required'
    ? 'Répondre au complément'
    : active?.status === 'submitted' || active?.status === 'under_review'
      ? 'Voir l’avancement'
      : active?.status === 'pending'
        ? 'Reprendre ma vérification'
        : 'Commencer';

  return (
    <Screen
      header={<AppBar title="Vérification d’identité" onBack={() => router.back()} />}
      footer={<IdnButton t={t} full onPress={continueFlow} disabled={me === undefined || active === undefined}>{label}</IdnButton>}
    >
      <View style={{ marginTop: 16 }}>
        <IconTile icon="idCard" tone="blue" />
      </View>
      <ScreenTitle
        title="Passe au Niveau 2"
        lead={targetLoa === 3
          ? 'Avant l’entretien du Niveau 3, fais vérifier ta pièce d’identité et ton visage.'
          : 'Ta pièce d’identité et un selfie suffisent. Un contrôleur confirme ensuite ton dossier.'}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Fact value="5 min" label="Durée" />
        <Fact value="CNI" label="Recto, verso" />
        <Fact value="Gratuit" label="Service public" />
      </View>
      <SectionTitle>Les étapes</SectionTitle>
      <Card>
        <Row icon="idCard" tone="blue" title="Photo de ta CNI" sub="Recto puis verso, sans reflet" />
        <Row icon="scanFace" tone="blue" title="Selfie" sub="Comparé à la photo de ta pièce" />
        <Row icon="shield" tone="blue" title="Revue du dossier" sub="Délai moyen : 24 h, tu es notifié à chaque étape" />
      </Card>
      <SectionTitle>Ce que ça débloque</SectionTitle>
      <Card>
        <Row icon="landmark" tone="green" title="Démarches administratives en ligne" sub="Services publics qui exigent une identité vérifiée" />
        <Row icon="keyRound" tone="green" title="Connexion vérifiée chez les partenaires" sub="« Se connecter avec IDN » au Niveau 2" />
      </Card>
    </Screen>
  );
}
