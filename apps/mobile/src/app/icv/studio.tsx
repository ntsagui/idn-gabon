import React, { useEffect, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from 'convex/react';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, DetailRow, SectionTitle } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { useActiveCv } from '@/hooks/use-active-cv';
import type { AiToolId, CvThemeId } from '@/data/cv';
import { AiResultCard } from '@/components/cv/ai-result-card';
import { AiTools } from '@/components/cv/ai-tools';
import { CvPreview, type PreviewCv } from '@/components/cv/cv-preview';
import { CvSelector } from '@/components/cv/cv-selector';
import { PdfButton } from '@/components/cv/pdf-button';
import { ThemePicker } from '@/components/cv/theme-picker';
import { CvLoading } from '@/components/cv/cv-ui';

/**
 * Studio iCV — aperçu en grand, choix du thème, outils IA.
 * Accessible depuis l'accueil iCV (`/icv`). Sans CV → redirige sur /icv.
 */
export default function ICVStudio() {
  const t = useIdnTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ cv?: string }>();

  const { cvs, activeCvId, activeCv, setActiveCvId, isLoading } = useActiveCv();
  const fullCv = useQuery(api.cv.profile.get, activeCvId ? { cvId: activeCvId } : 'skip');

  // Si ?cv=... en query param, bascule
  useEffect(() => {
    if (params.cv && cvs?.some((c) => c._id === params.cv)) {
      setActiveCvId(params.cv as Id<'citizenCv'>);
      router.setParams({ cv: undefined });
    }
  }, [params.cv, cvs, setActiveCvId, router]);

  // Sans CV → on renvoie sur l'état vide de /icv.
  useEffect(() => {
    if (!isLoading && cvs && cvs.length === 0) {
      router.replace('/icv' as never);
    }
  }, [isLoading, cvs, router]);

  const [openResult, setOpenResult] = useState<AiToolId | null>(null);

  if (isLoading || !cvs || !activeCv || !activeCvId) {
    return <CvLoading title="Studio" onBack={() => router.back()} />;
  }

  return (
    <Screen header={<AppBar title="Studio" onBack={() => router.back()} right={<PdfButton cvId={activeCvId} fileName={activeCv.name} />} />}>
      <CvSelector active={activeCv} onCreate={() => router.push('/icv/create' as never)} />

      <SectionTitle>Aperçu</SectionTitle>
      <View style={{ alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: t.surface2 }}>
        {fullCv ? (
          <CvPreview cv={fullCv as PreviewCv} width={Math.min(width - 64, 400)} />
        ) : (
          <View style={{ height: 420, alignItems: 'center', justifyContent: 'center' }}>
            <IdnLottie name="loader" size={56} loop label="Chargement de l’aperçu" />
          </View>
        )}
      </View>

      <AiTools
        cvId={activeCvId}
        onResult={(tool) => {
          if (tool === 'ats_check') {
            router.push(`/icv/ats?cv=${activeCvId}` as never);
          } else {
            setOpenResult(tool);
          }
        }}
      />

      {/* Résultats IA */}
      {openResult === 'improve_summary' && fullCv ? (
        <AiResultCard cvId={activeCvId} feature="improve_summary" currentSummary={fullCv.summary} onClose={() => setOpenResult(null)} />
      ) : null}
      {openResult === 'suggest_skills' ? (
        <AiResultCard cvId={activeCvId} feature="suggest_skills" onClose={() => setOpenResult(null)} />
      ) : null}
      {openResult === 'generate_letter' ? (
        <AiResultCard cvId={activeCvId} feature="generate_letter" onClose={() => setOpenResult(null)} />
      ) : null}

      <ThemePicker
        cvId={activeCvId}
        activeTheme={activeCv.activeTheme as CvThemeId}
        onOpenGallery={() => router.push(`/icv/themes?cv=${activeCvId}` as never)}
      />

      {fullCv ? (
        <>
          <SectionTitle>Ton profil</SectionTitle>
          <Card>
            <DetailRow label="Nom" value={`${fullCv.firstName} ${fullCv.lastName}`.trim() || 'Non renseigné'} />
            <DetailRow label="E-mail" value={fullCv.email || 'Non renseigné'} />
            <DetailRow label="Expériences" value={String(fullCv.experiences.length)} />
            <DetailRow label="Compétences" value={String(fullCv.skills.length)} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
