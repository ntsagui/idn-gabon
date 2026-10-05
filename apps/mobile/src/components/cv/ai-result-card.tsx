import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery } from 'convex/react';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { SKILL_LEVELS } from '@/data/cv';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Badge } from '@/design/components/badge';
import { IconButton } from '@/design/components/app-bar';
import { Card, ErrorNote } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { IdnLottie } from '@/design/components/lottie';

type Feature = 'improve_summary' | 'suggest_skills' | 'generate_letter';

const TITLES: Record<Feature, string> = {
  improve_summary: 'Résumé proposé',
  suggest_skills: 'Compétences suggérées',
  generate_letter: 'Lettre de motivation',
};

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useIdnTheme();
  return (
    <Card padded style={{ marginTop: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Badge tone="green" icon="sparkles">Suggestion de l’IA</Badge>
          <Text accessibilityRole="header" style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{title}</Text>
        </View>
        <IconButton icon="close" label="Fermer la suggestion" onPress={onClose} size={36} />
      </View>
      <View style={{ marginTop: 12 }}>{children}</View>
    </Card>
  );
}

/**
 * Résultat d'un outil IA : lit le dernier job (`cv.ai.getLastResult`) de la
 * fonctionnalité et propose l'action adaptée (remplacer le résumé, ajouter
 * une compétence, copier la lettre).
 */
export function AiResultCard({
  cvId,
  feature,
  currentSummary,
  onClose,
}: {
  cvId: Id<'citizenCv'>;
  feature: Feature;
  currentSummary?: string;
  onClose: () => void;
}) {
  const t = useIdnTheme();
  const job = useQuery(api.cv.ai.getLastResult, { cvId, feature });
  const upsert = useMutation(api.cv.profile.upsert);
  const addSkill = useMutation(api.cv.skills.add);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<string[]>([]);

  // Exécution asynchrone (pool IA) : état « en cours » tant que le job tourne.
  if (job && (job.status === 'queued' || job.status === 'running')) {
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IdnLottie name="loader" size={40} loop />
          <Text style={{ flex: 1, fontSize: 14, color: t.muted }}>Rédaction en cours…</Text>
        </View>
      </Shell>
    );
  }

  if (job && job.status === 'failed') {
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        <ErrorNote>{job.errorMessage || 'L’outil IA a échoué. Réessaie dans un instant.'}</ErrorNote>
      </Shell>
    );
  }

  if (!job || job.status !== 'completed' || !job.result) return null;

  // ── improve_summary
  if (feature === 'improve_summary') {
    const rewritten = (job.result.rewrittenSummary as string | undefined) ?? '';
    const accept = async () => {
      if (busy) return;
      setBusy(true);
      try {
        await upsert({ cvId, patch: { summary: rewritten } });
        onClose();
      } catch (e) {
        Alert.alert('Enregistrement impossible', (e as Error).message || 'Réessaie dans un instant.');
      } finally {
        setBusy(false);
      }
    };
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        {currentSummary ? (
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: t.surface2, marginBottom: 10 }}>
            <Text style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: t.muted }}>Actuel</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: t.ink2, marginTop: 4 }}>{currentSummary}</Text>
          </View>
        ) : null}
        <Text style={{ fontSize: 14, lineHeight: 21, color: t.ink }}>{rewritten}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <IdnButton t={t} size="sm" onPress={accept} loading={busy}>Remplacer mon résumé</IdnButton>
          <IdnButton t={t} size="sm" variant="ghost" onPress={onClose} disabled={busy}>Ignorer</IdnButton>
        </View>
      </Shell>
    );
  }

  // ── suggest_skills
  if (feature === 'suggest_skills') {
    const suggestions =
      (job.result.suggestions as { name: string; level: (typeof SKILL_LEVELS)[number]; rationale: string }[] | undefined) ?? [];
    const add = async (name: string, level: (typeof SKILL_LEVELS)[number]) => {
      if (busy) return;
      setBusy(true);
      try {
        await addSkill({ cvId, data: { name, level } });
        setAdded((a) => [...a, name]);
      } catch (e) {
        Alert.alert('Ajout impossible', (e as Error).message || 'Réessaie dans un instant.');
      } finally {
        setBusy(false);
      }
    };
    return (
      <Shell title={TITLES[feature]} onClose={onClose}>
        {suggestions.length === 0 ? (
          <Text style={{ fontSize: 14, color: t.muted }}>Aucune suggestion : ton CV couvre déjà les compétences principales.</Text>
        ) : (
          <View style={{ gap: 12 }}>
            {suggestions.map((s, i) => {
              const done = added.includes(s.name);
              return (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: i > 0 ? 12 : 0, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: t.border }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>{s.name}</Text>
                      <Badge tone="neutral">{s.level}</Badge>
                    </View>
                    <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted }}>{s.rationale}</Text>
                  </View>
                  {done ? (
                    <Badge tone="green" icon="check">Ajoutée</Badge>
                  ) : (
                    <IdnButton t={t} size="sm" variant="secondary" onPress={() => add(s.name, s.level)} disabled={busy} accessibilityLabel={`Ajouter ${s.name}`}>
                      Ajouter
                    </IdnButton>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </Shell>
    );
  }

  // ── generate_letter
  const letter = (job.result.letter as string | undefined) ?? '';
  const copy = async () => {
    await Clipboard.setStringAsync(letter);
    Alert.alert('Lettre copiée', 'Tu peux la coller dans ton e-mail ou ton traitement de texte.');
  };
  return (
    <Shell title={TITLES[feature]} onClose={onClose}>
      <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
        <Text style={{ fontSize: 14, lineHeight: 21, color: t.ink }}>{letter}</Text>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <IdnButton t={t} size="sm" variant="secondary" onPress={copy}>Copier la lettre</IdnButton>
      </View>
    </Shell>
  );
}
