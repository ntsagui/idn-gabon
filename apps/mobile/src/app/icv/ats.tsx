import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/design/text';
import Svg, { Circle } from 'react-native-svg';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { Icon } from '@/design/icons';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, DetailRow, ErrorNote, ScreenTitle, SectionTitle, useToneColors } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';

interface AtsResult {
  score?: number;
  breakdown?: Record<string, number>;
  recommendations?: string[];
}

/** Dimensions renvoyées par `cv.ai` (chacune notée sur 25). */
const DIMENSIONS: Record<string, string> = {
  keywords: 'Mots-clés',
  structure: 'Structure',
  length: 'Longueur',
  readability: 'Lisibilité',
};

export default function ICVAts() {
  const params = useLocalSearchParams<{ cv?: string }>();
  const cvId = params.cv as Id<'citizenCv'> | undefined;
  const t = useIdnTheme();
  const router = useRouter();
  const job = useQuery(api.cv.ai.getLastResult, cvId ? { cvId, feature: 'ats_check' } : 'skip');
  const atsCheck = useAction(api.cv.ai.atsCheck);
  const [starting, setStarting] = useState(false);

  const isLoading = cvId !== undefined && job === undefined;
  const isPending = job?.status === 'queued' || job?.status === 'running';
  const hasResult = job?.status === 'completed' && !!job.result;

  // Lance (ou relance) l'analyse : le résultat arrive par la query réactive.
  async function start() {
    if (!cvId || starting) return;
    setStarting(true);
    try {
      await atsCheck({ cvId });
    } catch (e) {
      const msg = (e as Error).message ?? '';
      Alert.alert(
        'Analyse impossible',
        msg.includes('cvAi') || msg.includes('RATE_LIMIT') ? 'Tu as atteint ton quota quotidien d’outils IA (10 par jour). Réessaie demain.' : 'L’outil IA a échoué. Réessaie dans un instant.',
      );
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen
      sheet
      header={<AppBar title="Score ATS" onBack={() => router.back()} backIcon="close" />}
      footer={
        cvId && !isLoading && !isPending ? (
          <IdnButton t={t} full variant={hasResult ? 'ghost' : 'primary'} onPress={start} loading={starting}>
            {hasResult ? 'Relancer l’analyse' : 'Lancer l’analyse'}
          </IdnButton>
        ) : undefined
      }
    >
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        Compatibilité de ton CV avec les logiciels de tri des candidatures (ATS) utilisés par les recruteurs.
      </Text>

      {!cvId ? (
        <ErrorNote>Aucun CV sélectionné. Ferme cette fenêtre et relance l’outil depuis le Studio.</ErrorNote>
      ) : isLoading || isPending ? (
        <View style={{ alignItems: 'center', paddingVertical: 40 }}>
          <IdnLottie name="loader" size={80} loop label="Analyse en cours" />
          <Text style={{ marginTop: 8, fontSize: 14, color: t.muted }}>{isPending ? 'Analyse en cours…' : 'Chargement…'}</Text>
        </View>
      ) : hasResult ? (
        <AtsResultBody result={job.result as AtsResult} />
      ) : (
        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
          {job?.status === 'failed' ? <ErrorNote>{job.errorMessage || 'La dernière analyse a échoué.'}</ErrorNote> : null}
          <ScreenTitle center title="Aucune analyse pour ce CV" lead="Lance l’analyse : le résultat s’affichera ici dans quelques secondes." />
        </View>
      )}
    </Screen>
  );
}

function AtsResultBody({ result }: { result: AtsResult }) {
  const t = useIdnTheme();
  const yellow = useToneColors('yellow').fg;
  const score = clampScore(result.score);
  const tone = score >= 80 ? { label: 'Bien optimisé', badge: 'green' as const, color: t.green } : score >= 50 ? { label: 'À améliorer', badge: 'yellow' as const, color: yellow } : { label: 'Peu optimisé', badge: 'red' as const, color: t.redText };
  const size = 140;
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <>
      <Card padded style={{ marginTop: 16, alignItems: 'center' }}>
        <View
          accessible
          accessibilityLabel={`Score ATS : ${score} sur 100, ${tone.label}`}
          style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.surface2} strokeWidth={stroke} />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={tone.color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${c}`}
              strokeDashoffset={c * (1 - score / 100)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          <Text style={{ fontSize: 34, fontWeight: '600', color: t.ink }}>{score}</Text>
          <Text style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.3, color: t.muted }}>SUR 100</Text>
        </View>
        <Badge tone={tone.badge} style={{ marginTop: 12, alignSelf: 'center' }}>{tone.label}</Badge>
      </Card>

      {result.breakdown ? (
        <>
          <SectionTitle>Détail</SectionTitle>
          <Card>
            {Object.entries(result.breakdown).map(([k, v]) => (
              <DetailRow key={k} label={DIMENSIONS[k] ?? k} value={`${v} / 25`} />
            ))}
          </Card>
        </>
      ) : null}

      {result.recommendations && result.recommendations.length > 0 ? (
        <>
          <SectionTitle>Recommandations</SectionTitle>
          <Card padded>
            <View style={{ gap: 10 }}>
              {result.recommendations.map((rec, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                  <Icon name="checkCir" size={18} color={t.greenText} />
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: t.ink }}>{rec}</Text>
                </View>
              ))}
            </View>
          </Card>
        </>
      ) : null}
    </>
  );
}

function clampScore(s: unknown): number {
  if (typeof s === 'number' && Number.isFinite(s)) {
    return Math.max(0, Math.min(100, Math.round(s)));
  }
  return 0;
}
