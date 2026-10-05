import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { Text } from '@/design/text';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { useIdnTheme } from '@/design/theme';
import { AppBar, IconButton } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, ErrorNote, Row, SectionTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { LANG_LEVELS, SKILL_LEVELS } from '@/data/cv';
import { CvChips, CvField, CvLoading } from '@/components/cv/cv-ui';

type SectionKind = 'info' | 'experience' | 'education' | 'skill' | 'language' | 'hobby';
const VALID_SECTIONS: SectionKind[] = [
  'info',
  'experience',
  'education',
  'skill',
  'language',
  'hobby',
];

type CvFull = NonNullable<FunctionReturnType<typeof api.cv.profile.get>>;

/**
 * Cadre d'écran fourni par l'éditeur à chaque formulaire : le formulaire
 * garde son état et ses actions, l'éditeur fournit la barre et la liste.
 * C'est une fonction (et non un composant) pour ne pas remonter le
 * formulaire à chaque mise à jour réactive du CV.
 */
type Frame = (children: React.ReactNode, footer: React.ReactNode) => React.ReactElement;

const SAVE_FAILED = 'L’enregistrement a échoué. Réessaie dans un instant.';

export default function ICVEdit() {
  const t = useIdnTheme();
  const params = useLocalSearchParams<{ section?: string; cv?: string; id?: string }>();
  const section = params.section as SectionKind | undefined;
  const cvParam = params.cv as Id<'citizenCv'> | undefined;
  const idParam = params.id ?? null;
  const router = useRouter();

  if (!section || !VALID_SECTIONS.includes(section) || !cvParam) {
    return (
      <Screen
        header={<AppBar title="iCV" onBack={() => router.back()} />}
        footer={<IdnButton t={t} full variant="ghost" onPress={() => router.back()}>Retour</IdnButton>}
      >
        <ErrorNote>Cette rubrique est introuvable. Reviens à ton CV et réessaie.</ErrorNote>
      </Screen>
    );
  }

  return <Editor section={section} cvId={cvParam} entryId={idParam} />;
}

function Editor({
  section,
  cvId,
  entryId,
}: {
  section: SectionKind;
  cvId: Id<'citizenCv'>;
  entryId: string | null;
}) {
  const router = useRouter();
  const cv = useQuery(api.cv.profile.get, { cvId });

  if (cv === undefined) {
    return <CvLoading title="iCV" onBack={() => router.back()} />;
  }
  if (cv === null) {
    return (
      <Screen header={<AppBar title="iCV" onBack={() => router.back()} />}>
        <ErrorNote>Impossible de charger ce CV.</ErrorNote>
      </Screen>
    );
  }

  const isEditing = entryId !== null;
  // Pour les sections multi-entrées sans `?id=` : afficher la liste en haut.
  const showList = !isEditing && section !== 'info' && section !== 'hobby'
    && sectionItems(cv, section).length > 0;
  const title = showList ? listTitleFor(section) : computeTitle(section, isEditing);

  const frame: Frame = (children, footer) => (
    <Screen keyboard header={<AppBar title={title} onBack={() => router.back()} />} footer={footer}>
      {showList ? <SectionList section={section} cv={cv} cvId={cvId} /> : null}
      {showList ? <SectionTitle>{addTitleFor(section)}</SectionTitle> : null}
      {children}
    </Screen>
  );

  if (section === 'info') return <InfoForm cv={cv} onDone={() => router.back()} frame={frame} />;
  if (section === 'experience') {
    return <ExperienceForm cvId={cvId} entry={findEntry(cv.experiences, entryId)} onDone={() => router.back()} frame={frame} />;
  }
  if (section === 'education') {
    return <EducationForm cvId={cvId} entry={findEntry(cv.education, entryId)} onDone={() => router.back()} frame={frame} />;
  }
  if (section === 'skill') {
    return <SkillForm cvId={cvId} entry={findEntry(cv.skills, entryId)} onDone={() => router.back()} frame={frame} />;
  }
  if (section === 'language') {
    return <LanguageForm cvId={cvId} entry={findEntry(cv.languages, entryId)} onDone={() => router.back()} frame={frame} />;
  }
  return <HobbyForm cv={cv} cvId={cvId} onDone={() => router.back()} frame={frame} />;
}

// ─────────────────────────────────────────────────────────────────────────
// Liste des entrées existantes (au-dessus du formulaire d'ajout)
// ─────────────────────────────────────────────────────────────────────────

type SectionEntry = { id: string };

function sectionItems(cv: CvFull, section: SectionKind): SectionEntry[] {
  if (section === 'experience') return cv.experiences;
  if (section === 'education') return cv.education;
  if (section === 'skill') return cv.skills;
  if (section === 'language') return cv.languages;
  return [];
}

function listTitleFor(section: SectionKind): string {
  if (section === 'experience') return 'Tes expériences';
  if (section === 'education') return 'Tes formations';
  if (section === 'skill') return 'Tes compétences';
  if (section === 'language') return 'Tes langues';
  return '';
}

function addTitleFor(section: SectionKind): string {
  if (section === 'experience') return 'Ajouter une expérience';
  if (section === 'education') return 'Ajouter une formation';
  if (section === 'skill') return 'Ajouter une compétence';
  if (section === 'language') return 'Ajouter une langue';
  return '';
}

function SectionList({
  section,
  cv,
  cvId,
}: {
  section: SectionKind;
  cv: CvFull;
  cvId: Id<'citizenCv'>;
}) {
  const router = useRouter();
  const removeExperience = useMutation(api.cv.experiences.remove);
  const removeEducation = useMutation(api.cv.education.remove);
  const removeSkill = useMutation(api.cv.skills.remove);
  const removeLanguage = useMutation(api.cv.languages.remove);

  function confirmDelete(label: string, exec: () => Promise<void>) {
    Alert.alert(`Supprimer ${label} ?`, undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await exec();
          } catch (e) {
            Alert.alert('Suppression impossible', (e as Error).message || SAVE_FAILED);
          }
        },
      },
    ]);
  }

  function rowPress(entryId: string) {
    router.push(`/icv/edit?section=${section}&cv=${cvId}&id=${entryId}` as never);
  }

  return (
    <Card style={{ marginTop: 16 }}>
      {section === 'experience' &&
        cv.experiences.map((e) => (
          <EntryRow
            key={e.id}
            primary={e.title || 'Poste sans intitulé'}
            secondary={[e.company, formatRange(e.startDate, e.endDate, e.current)].filter(Boolean).join(' · ')}
            onPress={() => rowPress(e.id)}
            onDelete={() =>
              confirmDelete('cette expérience', async () => {
                await removeExperience({ cvId, id: e.id });
              })
            }
          />
        ))}
      {section === 'education' &&
        cv.education.map((e) => (
          <EntryRow
            key={e.id}
            primary={e.degree || 'Diplôme sans intitulé'}
            secondary={[e.school, e.year].filter(Boolean).join(' · ')}
            onPress={() => rowPress(e.id)}
            onDelete={() =>
              confirmDelete('cette formation', async () => {
                await removeEducation({ cvId, id: e.id });
              })
            }
          />
        ))}
      {section === 'skill' &&
        cv.skills.map((e) => (
          <EntryRow
            key={e.id}
            primary={e.name}
            secondary={e.level}
            onPress={() => rowPress(e.id)}
            onDelete={() =>
              confirmDelete('cette compétence', async () => {
                await removeSkill({ cvId, id: e.id });
              })
            }
          />
        ))}
      {section === 'language' &&
        cv.languages.map((e) => (
          <EntryRow
            key={e.id}
            primary={e.name}
            secondary={e.level}
            onPress={() => rowPress(e.id)}
            onDelete={() =>
              confirmDelete('cette langue', async () => {
                await removeLanguage({ cvId, id: e.id });
              })
            }
          />
        ))}
    </Card>
  );
}

function EntryRow({
  primary,
  secondary,
  onPress,
  onDelete,
}: {
  primary: string;
  secondary?: string;
  onPress: () => void;
  onDelete: () => void;
}) {
  const t = useIdnTheme();
  return (
    <Row
      title={primary}
      sub={secondary || undefined}
      onPress={onPress}
      accessibilityLabel={`Modifier ${primary}`}
      right={<IconButton icon="trash" label={`Supprimer ${primary}`} onPress={onDelete} plain color={t.redText} />}
    />
  );
}

function formatRange(start: string, end: string | undefined, current: boolean): string {
  if (current) return `${start} → aujourd’hui`;
  if (!end) return start;
  return `${start} → ${end}`;
}

function computeTitle(s: SectionKind, editing: boolean): string {
  if (s === 'info') return 'Tes informations';
  if (s === 'experience') return editing ? 'Modifier l’expérience' : 'Ajouter une expérience';
  if (s === 'education') return editing ? 'Modifier la formation' : 'Ajouter une formation';
  if (s === 'skill') return editing ? 'Modifier la compétence' : 'Ajouter une compétence';
  if (s === 'language') return editing ? 'Modifier la langue' : 'Ajouter une langue';
  return 'Centres d’intérêt';
}

function findEntry<T extends { id: string }>(arr: T[], id: string | null): T | null {
  if (!id) return null;
  return arr.find((e) => e.id === id) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────
// INFO
// ─────────────────────────────────────────────────────────────────────────

function InfoForm({ cv, onDone, frame }: { cv: CvFull; onDone: () => void; frame: Frame }) {
  const upsert = useMutation(api.cv.profile.upsert);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: cv.firstName,
    lastName: cv.lastName,
    email: cv.email,
    phone: cv.phone,
    address: cv.address,
    summary: cv.summary,
    linkedinUrl: cv.linkedinUrl ?? '',
    portfolioUrl: cv.portfolioUrl ?? '',
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await upsert({
        cvId: cv._id,
        patch: {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          address: form.address,
          summary: form.summary,
          linkedinUrl: form.linkedinUrl || undefined,
          portfolioUrl: form.portfolioUrl || undefined,
        },
      });
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return frame(
    <>
      <CvField label="Prénom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} autoCapitalize="words" />
      <CvField label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} autoCapitalize="words" />
      <CvField label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} keyboardType="email-address" autoCapitalize="none" />
      <CvField label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" />
      <CvField label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      <CvField
        label="Résumé professionnel"
        hint="Entre 50 et 300 caractères pour un score optimal."
        value={form.summary}
        onChange={(v) => setForm({ ...form, summary: v })}
        multiline
      />
      <CvField label="LinkedIn (adresse du profil)" value={form.linkedinUrl} onChange={(v) => setForm({ ...form, linkedinUrl: v })} keyboardType="url" autoCapitalize="none" />
      <CvField label="Portfolio (adresse du site)" value={form.portfolioUrl} onChange={(v) => setForm({ ...form, portfolioUrl: v })} keyboardType="url" autoCapitalize="none" />
    </>,
    <SaveBar onSave={save} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EXPERIENCE
// ─────────────────────────────────────────────────────────────────────────

function ExperienceForm({
  cvId,
  entry,
  onDone,
  frame,
}: {
  cvId: Id<'citizenCv'>;
  entry: CvFull['experiences'][number] | null;
  onDone: () => void;
  frame: Frame;
}) {
  const t = useIdnTheme();
  const add = useMutation(api.cv.experiences.add);
  const update = useMutation(api.cv.experiences.update);
  const remove = useMutation(api.cv.experiences.remove);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: entry?.title ?? '',
    company: entry?.company ?? '',
    startDate: entry?.startDate ?? '',
    endDate: entry?.endDate ?? '',
    current: entry?.current ?? false,
    description: entry?.description ?? '',
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const data = {
        title: form.title,
        company: form.company,
        startDate: form.startDate,
        endDate: form.current ? undefined : form.endDate || undefined,
        current: form.current,
        description: form.description,
      };
      if (entry) {
        await update({ cvId, id: entry.id, patch: data });
      } else {
        await add({ cvId, data });
      }
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert(
      'Supprimer cette expérience ?',
      undefined,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await remove({ cvId, id: entry.id });
              onDone();
            } catch (e) {
              Alert.alert('Suppression impossible', (e as Error).message || SAVE_FAILED);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  return frame(
    <>
      <CvField label="Intitulé du poste" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Par exemple : Chef de projet numérique" />
      <CvField label="Entreprise ou organisme" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <CvField label="Début" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} placeholder="01/2022" keyboardType="numbers-and-punctuation" />
        </View>
        <View style={{ flex: 1 }}>
          <CvField label="Fin" value={form.current ? '' : form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} placeholder={form.current ? 'En cours' : '06/2024'} editable={!form.current} keyboardType="numbers-and-punctuation" />
        </View>
      </View>
      <Card style={{ marginTop: 16 }}>
        <Row
          title="J’occupe ce poste actuellement"
          right={
            <Switch
              value={form.current}
              onValueChange={(v) => setForm({ ...form, current: v })}
              trackColor={{ true: t.green, false: t.border }}
              accessibilityLabel="J’occupe ce poste actuellement"
            />
          }
        />
      </Card>
      <CvField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline minHeight={120} hint="Tes missions et tes résultats, en quelques lignes." />
    </>,
    <SaveBar onSave={save} onDelete={entry ? handleDelete : undefined} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// EDUCATION
// ─────────────────────────────────────────────────────────────────────────

function EducationForm({
  cvId,
  entry,
  onDone,
  frame,
}: {
  cvId: Id<'citizenCv'>;
  entry: CvFull['education'][number] | null;
  onDone: () => void;
  frame: Frame;
}) {
  const add = useMutation(api.cv.education.add);
  const update = useMutation(api.cv.education.update);
  const remove = useMutation(api.cv.education.remove);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    degree: entry?.degree ?? '',
    school: entry?.school ?? '',
    year: entry?.year ?? '',
    description: entry?.description ?? '',
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const data = {
        degree: form.degree,
        school: form.school,
        year: form.year,
        description: form.description || undefined,
      };
      if (entry) await update({ cvId, id: entry.id, patch: data });
      else await add({ cvId, data });
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert('Supprimer cette formation ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await remove({ cvId, id: entry.id });
          onDone();
        },
      },
    ]);
  }

  return frame(
    <>
      <CvField label="Diplôme" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="Par exemple : Master en droit des affaires" />
      <CvField label="Établissement" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
      <CvField label="Année d’obtention" value={form.year} onChange={(v) => setForm({ ...form, year: v })} placeholder="2024" keyboardType="number-pad" />
      <CvField label="Description (facultatif)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
    </>,
    <SaveBar onSave={save} onDelete={entry ? handleDelete : undefined} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SKILL
// ─────────────────────────────────────────────────────────────────────────

function SkillForm({
  cvId,
  entry,
  onDone,
  frame,
}: {
  cvId: Id<'citizenCv'>;
  entry: CvFull['skills'][number] | null;
  onDone: () => void;
  frame: Frame;
}) {
  const add = useMutation(api.cv.skills.add);
  const update = useMutation(api.cv.skills.update);
  const remove = useMutation(api.cv.skills.remove);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; level: (typeof SKILL_LEVELS)[number] }>({
    name: entry?.name ?? '',
    level: entry?.level ?? 'Intermédiaire',
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      if (entry) await update({ cvId, id: entry.id, patch: form });
      else await add({ cvId, data: form });
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert('Supprimer cette compétence ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await remove({ cvId, id: entry.id });
          onDone();
        },
      },
    ]);
  }

  return frame(
    <>
      <CvField label="Compétence" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Par exemple : Gestion de projet" />
      <LevelPicker
        label="Niveau"
        value={form.level}
        options={[...SKILL_LEVELS]}
        onChange={(v) => setForm({ ...form, level: v as (typeof SKILL_LEVELS)[number] })}
      />
    </>,
    <SaveBar onSave={save} onDelete={entry ? handleDelete : undefined} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// LANGUAGE
// ─────────────────────────────────────────────────────────────────────────

function LanguageForm({
  cvId,
  entry,
  onDone,
  frame,
}: {
  cvId: Id<'citizenCv'>;
  entry: CvFull['languages'][number] | null;
  onDone: () => void;
  frame: Frame;
}) {
  const add = useMutation(api.cv.languages.add);
  const update = useMutation(api.cv.languages.update);
  const remove = useMutation(api.cv.languages.remove);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ name: string; level: (typeof LANG_LEVELS)[number] }>({
    name: entry?.name ?? '',
    level: entry?.level ?? 'B2',
  });

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      if (entry) await update({ cvId, id: entry.id, patch: form });
      else await add({ cvId, data: form });
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (!entry) return;
    Alert.alert('Supprimer cette langue ?', undefined, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await remove({ cvId, id: entry.id });
          onDone();
        },
      },
    ]);
  }

  return frame(
    <>
      <CvField label="Langue" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Par exemple : Anglais" />
      <LevelPicker
        label="Niveau"
        hint="Cadre européen : de A1 (débutant) à C2 (maîtrise)."
        value={form.level}
        options={[...LANG_LEVELS]}
        onChange={(v) => setForm({ ...form, level: v as (typeof LANG_LEVELS)[number] })}
      />
    </>,
    <SaveBar onSave={save} onDelete={entry ? handleDelete : undefined} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// HOBBIES — édités en bloc (un par ligne)
// ─────────────────────────────────────────────────────────────────────────

function HobbyForm({
  cv,
  cvId,
  onDone,
  frame,
}: {
  cv: CvFull;
  cvId: Id<'citizenCv'>;
  onDone: () => void;
  frame: Frame;
}) {
  const upsert = useMutation(api.cv.profile.upsert);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(cv.hobbies.join('\n'));

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const hobbies = value
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      await upsert({ cvId, patch: { hobbies } });
      onDone();
    } catch (e) {
      Alert.alert('Enregistrement impossible', (e as Error).message || SAVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  return frame(
    <CvField
      label="Tes centres d’intérêt"
      hint="Un par ligne (par exemple : photographie, course à pied, échecs)."
      value={value}
      onChange={setValue}
      multiline
      minHeight={140}
      placeholder={'Photographie\nCourse à pied\nÉchecs'}
    />,
    <SaveBar onSave={save} busy={busy} />,
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────

function LevelPicker({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const t = useIdnTheme();
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink, marginBottom: 8 }}>{label}</Text>
      <CvChips wrap label={label} items={options.map((o) => ({ id: o, label: o }))} value={value} onChange={onChange} />
      {hint ? <Text style={{ fontSize: 13, color: t.muted, marginTop: 8, lineHeight: 18 }}>{hint}</Text> : null}
    </View>
  );
}

/** Pied d'écran : enregistrer (et supprimer en modification). Annuler = retour. */
function SaveBar({
  onSave,
  onDelete,
  busy,
}: {
  onSave: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const t = useIdnTheme();
  return (
    <>
      <IdnButton t={t} full onPress={onSave} loading={busy}>
        Enregistrer
      </IdnButton>
      {onDelete ? (
        <IdnButton t={t} full variant="dangerGhost" onPress={onDelete} disabled={busy}>
          Supprimer
        </IdnButton>
      ) : null}
    </>
  );
}
