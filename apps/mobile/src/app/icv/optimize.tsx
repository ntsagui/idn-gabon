import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { Text } from '@/design/text';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { ErrorNote } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { CvField } from '@/components/cv/cv-ui';

export default function ICVOptimize() {
  const params = useLocalSearchParams<{ cv?: string }>();
  const cvId = params.cv as Id<'citizenCv'> | undefined;
  const t = useIdnTheme();
  const router = useRouter();
  const optimizeForJob = useAction(api.cv.ai.optimizeForJob);
  const [offer, setOffer] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeJobId, setActiveJobId] = useState<Id<'citizenCvAiJob'> | null>(null);

  // `optimizeForJob` délègue l'exécution au pool IA et ne renvoie plus le
  // `derivedCvId` en synchrone : on suit le job via la query réactive et on
  // navigue une fois le CV dérivé créé.
  const job = useQuery(api.cv.ai.getLastResult, activeJobId && cvId ? { cvId, feature: 'optimize_job' } : 'skip');

  useEffect(() => {
    if (!activeJobId || !job || job._id !== activeJobId) return;
    if (job.status === 'completed' && job.derivedCvId) {
      setActiveJobId(null);
      setBusy(false);
      Alert.alert('CV optimisé créé', 'Ton nouveau CV adapté à l’offre est prêt.');
      router.dismissAll();
      router.push(`/icv?cv=${job.derivedCvId}` as never);
    } else if (job.status === 'failed') {
      setActiveJobId(null);
      setBusy(false);
      Alert.alert('Optimisation impossible', job.errorMessage ?? 'L’outil IA a échoué. Réessaie dans un instant.');
    }
  }, [activeJobId, job, router]);

  async function submit() {
    if (!cvId || busy) return;
    const trimmed = offer.trim();
    if (trimmed.length < 30) {
      Alert.alert('Offre trop courte', 'Colle au moins 30 caractères du texte de l’offre.');
      return;
    }
    setBusy(true);
    try {
      const { jobId } = await optimizeForJob({ cvId, jobOfferText: trimmed, newCvName: name.trim() || undefined });
      // On reste en `busy` jusqu'à la complétion, gérée par l'effet ci-dessus.
      setActiveJobId(jobId);
    } catch (e) {
      setBusy(false);
      const msg = (e as Error).message ?? '';
      Alert.alert(
        'Optimisation impossible',
        msg.includes('cvAi') || msg.includes('RATE_LIMIT') ? 'Tu as atteint ton quota quotidien d’outils IA (10 par jour). Réessaie demain.' : msg,
      );
    }
  }

  const header = <AppBar title="Optimiser pour une offre" onBack={() => router.back()} backIcon="close" />;

  if (!cvId) {
    return (
      <Screen sheet header={header}>
        <ErrorNote>Aucun CV sélectionné. Ferme cette fenêtre et relance l’outil depuis le Studio.</ErrorNote>
      </Screen>
    );
  }

  return (
    <Screen
      sheet
      keyboard
      header={header}
      footer={
        <IdnButton t={t} full onPress={submit} loading={busy}>
          {busy ? 'Optimisation en cours…' : 'Créer le CV optimisé'}
        </IdnButton>
      }
    >
      {busy ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <IdnLottie name="loader" size={80} loop label="Optimisation en cours" />
          <Text style={{ marginTop: 12, fontSize: 14, color: t.muted, textAlign: 'center' }}>
            L’IA adapte ton CV à l’offre. Tu peux patienter ici, le nouveau CV s’ouvrira tout seul.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
            L’IA crée un nouveau CV adapté à l’offre. Ton CV actuel n’est pas modifié.
          </Text>
          <CvField
            label="Texte de l’offre"
            value={offer}
            onChange={setOffer}
            placeholder="Colle ici la description du poste visé…"
            multiline
            minHeight={180}
            maxLength={8000}
            hint={`${offer.length} / 8 000 caractères`}
          />
          <CvField label="Nom du nouveau CV (facultatif)" value={name} onChange={setName} placeholder="Par exemple : CV Chef de projet" maxLength={80} />
        </>
      )}
    </Screen>
  );
}
