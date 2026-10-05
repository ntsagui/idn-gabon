import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { Icon, type IconName } from '@/design/icons';
import { useIdnTheme } from '@/design/theme';
import { AppBar, IconButton } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, Note, Row, ScreenTitle } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';
import { useCvPdf } from '@/components/cv/pdf-button';

const MAX_CVS = 10;

const SOURCE_LABEL: Record<string, string> = {
  onboarding: 'CV initial',
  manual: 'Créé à la main',
  ai_optimize: 'Variante IA',
  import: 'Importé',
};

export default function ICVList() {
  const t = useIdnTheme();
  const router = useRouter();
  const cvs = useQuery(api.cv.cvs.listMine);
  const full = !!cvs && cvs.length >= MAX_CVS;

  return (
    <Screen
      header={
        <AppBar
          title="Mes CV"
          onBack={() => router.back()}
          right={cvs && !full ? <IconButton icon="plus" label="Créer un CV" onPress={() => router.push('/icv/create' as never)} /> : null}
        />
      }
    >
      {cvs === undefined ? (
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          <IdnLottie name="loader" size={64} loop label="Chargement" />
        </View>
      ) : cvs.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <IdnLottie name="icv" size={120} />
          <ScreenTitle center title="Tu n’as pas encore de CV" lead="Crée ton premier CV pour le personnaliser et le partager." />
          <IdnButton t={t} onPress={() => router.push('/icv/create' as never)} style={{ marginTop: 20, alignSelf: 'center' }}>
            Crée ton premier CV
          </IdnButton>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 16, fontSize: 14, color: t.muted }}>
            {cvs.length} CV sur {MAX_CVS} possibles.
          </Text>
          {cvs.map((cv) => (
            <CvCard key={cv._id} cv={cv} canSafelyDelete={cvs.length > 1} />
          ))}
          {full ? <Note>Tu as atteint la limite de {MAX_CVS} CV. Supprime un CV pour en créer un nouveau.</Note> : null}
        </>
      )}
    </Screen>
  );
}

interface CvSummary {
  _id: Id<'citizenCv'>;
  name: string;
  isDefault: boolean;
  source: 'onboarding' | 'manual' | 'ai_optimize' | 'import';
  completionScore: number;
  updatedAt: number;
}

function CvCard({ cv, canSafelyDelete }: { cv: CvSummary; canSafelyDelete: boolean }) {
  const t = useIdnTheme();
  const router = useRouter();
  const create = useMutation(api.cv.cvs.create);
  const setDefault = useMutation(api.cv.cvs.setDefault);
  const remove = useMutation(api.cv.cvs.remove);
  const pdf = useCvPdf(cv._id, cv.name);
  const [mutating, setMutating] = useState(false);
  const busy = mutating || pdf.pending !== null;

  async function handleDuplicate() {
    if (busy) return;
    setMutating(true);
    try {
      const id = await create({ name: `${cv.name} (copie)`, copyFromCvId: cv._id });
      router.push(`/icv?cv=${id}` as never);
    } catch (e) {
      const msg = (e as Error).message;
      Alert.alert('Duplication impossible', msg.includes('CV_LIMIT_REACHED') ? `Tu as atteint la limite de ${MAX_CVS} CV.` : msg);
    } finally {
      setMutating(false);
    }
  }

  async function handleSetDefault() {
    if (busy || cv.isDefault) return;
    setMutating(true);
    try {
      await setDefault({ cvId: cv._id });
    } catch (e) {
      Alert.alert('Action impossible', (e as Error).message || 'Réessaie dans un instant.');
    } finally {
      setMutating(false);
    }
  }

  function handleDelete() {
    if (busy || cv.isDefault) {
      Alert.alert('CV principal', 'Tu ne peux pas supprimer ton CV principal. Désigne d’abord un autre CV comme principal.');
      return;
    }
    Alert.alert('Supprimer ce CV ?', `« ${cv.name} » sera supprimé de ta liste.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setMutating(true);
          try {
            await remove({ cvId: cv._id });
          } catch (e) {
            Alert.alert('Suppression impossible', (e as Error).message || 'Réessaie dans un instant.');
          } finally {
            setMutating(false);
          }
        },
      },
    ]);
  }

  return (
    <Card style={{ marginTop: 12 }}>
      <Row
        icon="fileUser"
        tone={cv.isDefault ? 'green' : 'neutral'}
        title={
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 14, fontWeight: '500', color: t.ink }}>{cv.name}</Text>
            {cv.isDefault ? <Badge tone="green">Principal</Badge> : null}
          </View>
        }
        sub={`${SOURCE_LABEL[cv.source] ?? cv.source} · score ${cv.completionScore}/100`}
        accessibilityLabel={`Ouvrir ${cv.name}`}
        onPress={() => router.push(`/icv?cv=${cv._id}` as never)}
        disabled={busy}
        chevron
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 }}>
        <Action icon="edit" label="Renommer" disabled={busy} onPress={() => router.push(`/icv/rename?cv=${cv._id}&name=${encodeURIComponent(cv.name)}` as never)} />
        <Action icon="copy" label="Dupliquer" disabled={busy} onPress={handleDuplicate} />
        {!cv.isDefault ? <Action icon="check" label="Définir comme principal" disabled={busy} onPress={handleSetDefault} /> : null}
        <Action icon="download" label={pdf.pending ? 'Préparation…' : 'PDF'} disabled={busy} onPress={pdf.open} />
        {canSafelyDelete && !cv.isDefault ? <Action icon="trash" label="Supprimer" disabled={busy} onPress={handleDelete} danger /> : null}
      </View>
    </Card>
  );
}

function Action({ icon, label, onPress, disabled, danger }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const t = useIdnTheme();
  const fg = danger ? t.redText : t.ink2;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1,
        borderColor: t.border, backgroundColor: pressed ? (danger ? t.redBadge : t.surface2) : t.surface, opacity: disabled ? 0.45 : 1,
      })}
    >
      <Icon name={icon} size={15} color={fg} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: fg }}>{label}</Text>
    </Pressable>
  );
}
