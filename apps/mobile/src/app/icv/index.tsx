import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { IconName } from '@/design/icons';
import { Icon } from '@/design/icons';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, Note, Row, ScreenTitle, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { useActiveCv } from '@/hooks/use-active-cv';
import type { CvThemeId } from '@/data/cv';
import { CvSelector } from '@/components/cv/cv-selector';
import { CvPreview, type PreviewCv } from '@/components/cv/cv-preview';
import { PdfButton, useCvPdf } from '@/components/cv/pdf-button';
import { ScoreRing } from '@/components/cv/score-ring';
import { ThemeChips } from '@/components/cv/theme-picker';
import { CvLoading, plural } from '@/components/cv/cv-ui';

type SectionKey = 'experience' | 'education' | 'skill' | 'info' | 'language' | 'hobby';

const SECTIONS: { key: SectionKey; label: string; icon: IconName }[] = [
  { key: 'info', label: 'Tes informations', icon: 'user' },
  { key: 'experience', label: 'Expériences', icon: 'briefcase' },
  { key: 'education', label: 'Formation', icon: 'cap' },
  { key: 'skill', label: 'Compétences', icon: 'star' },
  { key: 'language', label: 'Langues', icon: 'globe' },
  { key: 'hobby', label: 'Centres d’intérêt', icon: 'heart' },
];

const IMPACT: Record<string, string> = { high: 'Impact élevé', medium: 'Impact moyen', low: 'Impact faible' };

/**
 * Accueil iCV (prototype « icv ») : CV actif, pastilles de thèmes, aperçu,
 * score et rubriques, partage du PDF.
 *
 * Le badge « Diplômes vérifiés via iDocument » du prototype n'est pas affiché :
 * le CV (`cv.profile.get`) ne porte aucun lien vers iDocument ni aucun statut
 * de vérification des diplômes. Il ne doit apparaître que le jour où le
 * backend le fournit.
 */
export default function ICVHome() {
  const t = useIdnTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ cv?: string }>();

  const { cvs, activeCvId, activeCv, setActiveCvId, isLoading } = useActiveCv();
  const fullCv = useQuery(api.cv.profile.get, activeCvId ? { cvId: activeCvId } : 'skip');
  const scoreData = useQuery(api.cv.score.get, activeCvId ? { cvId: activeCvId } : 'skip');
  const pdf = useCvPdf(activeCvId, activeCv?.name);

  // Si ?cv=... en query param, bascule sur ce CV.
  useEffect(() => {
    if (params.cv && cvs?.some((c) => c._id === params.cv)) {
      setActiveCvId(params.cv as Id<'citizenCv'>);
      router.setParams({ cv: undefined });
    }
  }, [params.cv, cvs, setActiveCvId, router]);

  if (isLoading) return <CvLoading title="iCV" onBack={() => router.back()} />;
  if (!cvs || cvs.length === 0) return <EmptyState />;
  if (!activeCvId || !activeCv) return <CvLoading title="iCV" onBack={() => router.back()} />;

  const counts: Record<SectionKey, string> = {
    info: `Complètes à ${contactPercent(fullCv)} %`,
    experience: plural(fullCv?.experiences.length ?? 0, 'expérience', 'expériences', 'Aucune expérience'),
    education: plural(fullCv?.education.length ?? 0, 'formation', 'formations', 'Aucune formation'),
    skill: plural(fullCv?.skills.length ?? 0, 'compétence', 'compétences', 'Aucune compétence'),
    language: plural(fullCv?.languages.length ?? 0, 'langue', 'langues', 'Aucune langue'),
    hobby: plural(fullCv?.hobbies.length ?? 0, 'centre d’intérêt', 'centres d’intérêt', 'Aucun centre d’intérêt'),
  };

  return (
    <Screen
      header={<AppBar title="iCV" onBack={() => router.back()} right={<PdfButton cvId={activeCvId} fileName={activeCv.name} />} />}
      footer={
        <IdnButton t={t} full onPress={pdf.share} loading={pdf.pending === 'share'} leadIcon={<Icon name="share" size={18} color="#fff" />}>
          Partager mon CV
        </IdnButton>
      }
    >
      <CvSelector active={activeCv} onCreate={() => router.push('/icv/create' as never)} />
      {fullCv ? <CivilNameHint cvId={activeCvId} firstName={fullCv.firstName} lastName={fullCv.lastName} /> : null}

      <SectionTitle action="Galerie" onAction={() => router.push(`/icv/themes?cv=${activeCvId}` as never)}>Thème</SectionTitle>
      <ThemeChips cvId={activeCvId} activeTheme={activeCv.activeTheme as CvThemeId} />

      <View style={{ marginTop: 16, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: t.surface2 }}>
        {fullCv ? (
          <CvPreview cv={fullCv as PreviewCv} width={Math.min(width - 64, 360)} />
        ) : (
          <View style={{ height: 320, alignItems: 'center', justifyContent: 'center' }}>
            <IdnLottie name="loader" size={56} loop label="Chargement de l’aperçu" />
          </View>
        )}
      </View>
      <Note center>Le PDF partagé reprend le thème choisi.</Note>

      <SectionTitle>Ton score</SectionTitle>
      <Card>
        <ScoreRing score={scoreData?.score ?? activeCv.completionScore} level={scoreData?.level ?? 'Débutant'} />
        {(scoreData?.suggestions ?? []).map((s) => (
          <Row key={s.id} icon="sparkles" tone="green" title={s.title} sub={IMPACT[s.impact] ?? undefined} />
        ))}
      </Card>
      {scoreData && scoreData.suggestions.length === 0 ? <Note>Aucune suggestion pour l’instant : ton CV est bien rempli.</Note> : null}

      <SectionTitle>Rubriques du CV</SectionTitle>
      <Card>
        {SECTIONS.map((s) => (
          <Row
            key={s.key}
            icon={s.icon}
            title={s.label}
            sub={counts[s.key]}
            chevron
            onPress={() => router.push(`/icv/edit?section=${s.key}&cv=${activeCvId}` as never)}
          />
        ))}
      </Card>

      <SectionTitle>Aller plus loin</SectionTitle>
      <Card>
        <Row icon="sparkles" tone="green" title="Studio et outils IA" sub="Aperçu détaillé, résumé, lettre, score ATS" chevron onPress={() => router.push('/icv/studio' as never)} />
        <Row icon="upload" title="Importer un CV" sub="PDF ou image, 5 Mo maximum" chevron onPress={() => router.push('/icv/import' as never)} />
        <Row icon="folder" title="Mes CV" sub={plural(cvs.length, 'CV', 'CV', 'Aucun CV')} chevron onPress={() => router.push('/icv/list' as never)} />
      </Card>
    </Screen>
  );
}

function contactPercent(cv: { firstName: string; lastName: string; email: string; phone: string } | null | undefined): number {
  if (!cv) return 0;
  const filled = [cv.firstName, cv.lastName, cv.email, cv.phone].filter((s) => s.trim().length > 0).length;
  return Math.round((filled / 4) * 100);
}

function EmptyState() {
  const t = useIdnTheme();
  const router = useRouter();
  return (
    <Screen
      header={<AppBar title="iCV" onBack={() => router.back()} />}
      footer={
        <>
          <IdnButton t={t} full onPress={() => router.push('/icv/create' as never)} leadIcon={<Icon name="plus" size={18} color="#fff" />}>
            Crée ton CV
          </IdnButton>
          <IdnButton t={t} full variant="ghost" onPress={() => router.push('/icv/import' as never)} leadIcon={<Icon name="upload" size={18} color={t.ink} />}>
            Importer un CV existant
          </IdnButton>
        </>
      }
    >
      <View style={{ alignItems: 'center', marginTop: 32 }}>
        <IdnLottie name="icv" size={140} />
        <ScreenTitle
          center
          title="Ton CV professionnel, en quelques minutes"
          lead="12 thèmes, des outils d’IA pour rédiger, un score de compatibilité ATS et l’export en PDF."
        />
      </View>
    </Screen>
  );
}

/**
 * Un CV vierge est pré-rempli par le backend avec le nom du compte Better Auth,
 * qui est l'identifiant @idn.ga (« nadia.ekomie »). On propose en un geste le
 * nom d'état civil du profil, sans rien écrire d'office.
 */
function CivilNameHint({ cvId, firstName, lastName }: { cvId: Id<'citizenCv'>; firstName: string; lastName: string }) {
  const t = useIdnTheme();
  const me = useQuery(api.profile.getCurrentUser);
  const upsert = useMutation(api.cv.profile.upsert);
  const [saving, setSaving] = React.useState(false);
  const pivot = me?.profile?.pivot;
  const handle = me?.email?.split('@')[0] ?? '';
  const looksTechnical = !firstName.trim() || firstName === handle || (!lastName.trim() && firstName.includes('.'));
  if (!pivot || !looksTechnical || (firstName === pivot.firstName && lastName === pivot.lastName)) return null;
  const civil = `${pivot.firstName} ${pivot.lastName}`;
  return (
    <Card padded style={{ marginTop: 12, backgroundColor: t.yellowBadge }}>
      <Row icon="user" tone="yellow" title={`Ton CV affiche « ${[firstName, lastName].filter(Boolean).join(' ') || 'aucun nom'} »`} sub={`Utilise ton nom d’état civil : ${civil}.`} />
      <IdnButton
        t={t}
        variant="secondary"
        full
        loading={saving}
        onPress={async () => {
          setSaving(true);
          try {
            await upsert({ cvId, patch: { firstName: pivot.firstName, lastName: pivot.lastName } });
          } finally {
            setSaving(false);
          }
        }}
      >
        {`Utiliser « ${civil} »`}
      </IdnButton>
    </Card>
  );
}
