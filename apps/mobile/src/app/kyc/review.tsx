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
import { Badge, LevelBadge } from '@/design/components/badge';
import { Card, Note } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { api } from '@/lib/api';
import { kycTimeline, type TimelineState } from '@/lib/kyc-timeline';

const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

function Dot({ state }: { state: TimelineState }) {
  const t = useIdnTheme();
  if (state === 'done') {
    return (
      <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={14} color="#fff" strokeWidth={2.5} />
      </View>
    );
  }
  if (state === 'current') return <View style={{ width: 24, height: 24, borderRadius: 9999, borderWidth: 2, borderColor: t.blue, backgroundColor: t.blueBadge }} />;
  if (state === 'failed') {
    return (
      <View style={{ width: 24, height: 24, borderRadius: 9999, backgroundColor: '#B3261E', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="close" size={14} color="#fff" strokeWidth={2.5} />
      </View>
    );
  }
  return <View style={{ width: 24, height: 24, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface }} />;
}

/** Statut de la vérification d'identité (prototype « kyc », écran de résultat). */
export default function KycReview() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const active = useQuery(api.kyc.getActiveRequest, isAuthenticated ? {} : 'skip');
  const latest = useQuery(api.kyc.getMyLatest, isAuthenticated ? {} : 'skip');
  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : 'skip');
  const status = active?.status ?? latest?.status;
  const loading = active === undefined || latest === undefined;
  const steps = kycTimeline(status, (active?.timeline ?? []).map((e) => e.action));
  const loa = (me?.profile?.loa ?? 1) as 1 | 2 | 3;

  const head =
    status === 'approved'
      ? { lottie: 'shield' as const, title: 'Identité vérifiée', badge: <LevelBadge level={loa} /> }
      : status === 'rejected'
        ? { lottie: null, title: 'Vérification refusée', badge: <Badge tone="red" icon="close">Refusée</Badge> }
        : status === 'expired'
          ? { lottie: null, title: 'Dossier expiré', badge: <Badge tone="neutral" icon="clock">Expiré</Badge> }
          : status === 'complement_required'
            ? { lottie: null, title: 'Complément demandé', badge: <Badge tone="yellow" icon="alert">Action requise</Badge> }
            : status === 'pending'
              ? { lottie: null, title: 'Dossier à compléter', badge: <Badge tone="neutral">Non envoyé</Badge> }
              : status
                ? { lottie: 'success' as const, title: 'Dossier envoyé', badge: <Badge tone="blue" icon="clock">En revue</Badge> }
                : { lottie: null, title: 'Aucune vérification en cours', badge: null };

  const footer =
    status === 'complement_required' || status === 'pending' ? (
      <IdnButton t={t} full onPress={() => router.push('/kyc/doc' as never)}>
        {status === 'pending' ? 'Continuer ma vérification' : 'Répondre au complément'}
      </IdnButton>
    ) : status === 'rejected' || status === 'expired' || !status ? (
      <IdnButton t={t} full onPress={() => router.replace('/kyc/intro')}>{status ? 'Recommencer la vérification' : 'Vérifier mon identité'}</IdnButton>
    ) : status === 'approved' && loa === 2 ? (
      <>
        <IdnButton t={t} full onPress={() => router.replace('/kyc/level3' as never)}>Passer au Niveau 3</IdnButton>
        <IdnButton t={t} variant="ghost" full onPress={() => router.replace('/(tabs)/home')}>Retour à l’accueil</IdnButton>
      </>
    ) : (
      <IdnButton t={t} variant={status === 'approved' ? 'primary' : 'ghost'} full onPress={() => router.replace('/(tabs)/home')}>Retour à l’accueil</IdnButton>
    );

  return (
    <Screen header={<AppBar title="Vérification d’identité" onBack={() => router.navigate('/(tabs)/home')} />} footer={loading ? undefined : footer}>
      {loading ? null : (
        <>
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            {head.lottie ? <IdnLottie name={head.lottie} size={128} label={head.title} /> : null}
            <Text accessibilityRole="header" style={{ marginTop: 12, fontSize: 22, fontWeight: '600', color: t.ink, textAlign: 'center' }}>{head.title}</Text>
            {head.badge ? <View style={{ marginTop: 8 }}>{head.badge}</View> : null}
          </View>

          {status === 'complement_required' && active?.complementRequest ? (
            <Card padded style={{ marginTop: 20, backgroundColor: t.yellowBadge }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>Message du contrôleur</Text>
              <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.ink2 }}>{active.complementRequest.message}</Text>
            </Card>
          ) : null}
          {status === 'rejected' && (active?.rejectionReason ?? latest?.rejectionReason) ? (
            <Card padded style={{ marginTop: 20, backgroundColor: t.redBadge }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>Motif</Text>
              <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.ink2 }}>{active?.rejectionReason ?? latest?.rejectionReason}</Text>
            </Card>
          ) : null}

          {status ? (
            <Card style={{ marginTop: 20 }}>
              {steps.map((s) => (
                <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 }}>
                  <Dot state={s.state} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: s.state === 'current' ? '600' : '500', color: s.state === 'upcoming' ? t.muted : t.ink }}>{s.label}</Text>
                    {s.state === 'current' ? <Text style={{ fontSize: 13, color: t.muted }}>{s.hint}</Text> : null}
                  </View>
                </View>
              ))}
            </Card>
          ) : (
            <Note center>Fais vérifier ta pièce d’identité et ton visage pour passer au Niveau 2.</Note>
          )}

          {latest?.submittedAt && status !== 'pending' ? (
            <Note center>Envoyé le {DAY.format(latest.submittedAt)}. Tu recevras une notification à chaque étape.</Note>
          ) : null}
        </>
      )}
    </Screen>
  );
}
