import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useAction } from 'convex/react';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import type { IconName } from '@/design/icons';
import type { AiToolId } from '@/data/cv';
import { Card, Row, SectionTitle, type RowTone } from '@/design/components/list';

/**
 * Section « Outils IA » — 5 outils, chacun branché sur l'action Convex
 * correspondante (`cv.ai.*`). « Optimiser pour une offre » ouvre sa feuille.
 * Libellés locaux : ceux de `@/data/cv` sont au vouvoiement.
 */
const TOOLS: { id: AiToolId; label: string; desc: string; icon: IconName; tone: RowTone }[] = [
  { id: 'improve_summary', label: 'Améliorer ton résumé', desc: 'Reformulation de ton profil professionnel', icon: 'sparkles', tone: 'green' },
  { id: 'suggest_skills', label: 'Suggérer des compétences', desc: 'À partir de tes expériences', icon: 'star', tone: 'blue' },
  { id: 'optimize_job', label: 'Optimiser pour une offre', desc: 'Un nouveau CV adapté au poste visé', icon: 'briefcase', tone: 'yellow' },
  { id: 'generate_letter', label: 'Lettre de motivation', desc: 'Rédigée à partir de ton CV', icon: 'file', tone: 'neutral' },
  { id: 'ats_check', label: 'Score ATS', desc: 'Compatibilité avec les logiciels de recrutement', icon: 'activity', tone: 'neutral' },
];

export function AiTools({ cvId, onResult }: { cvId: Id<'citizenCv'>; onResult: (feature: AiToolId) => void }) {
  const router = useRouter();
  const improveSummary = useAction(api.cv.ai.improveSummary);
  const suggestSkills = useAction(api.cv.ai.suggestSkills);
  const atsCheck = useAction(api.cv.ai.atsCheck);
  const generateLetter = useAction(api.cv.ai.generateLetter);
  const [pending, setPending] = useState<AiToolId | null>(null);

  async function run(tool: AiToolId) {
    if (pending) return;
    if (tool === 'optimize_job') {
      router.push(`/icv/optimize?cv=${cvId}` as never);
      return;
    }
    setPending(tool);
    try {
      if (tool === 'improve_summary') await improveSummary({ cvId });
      else if (tool === 'suggest_skills') await suggestSkills({ cvId });
      else if (tool === 'ats_check') await atsCheck({ cvId });
      else if (tool === 'generate_letter') await generateLetter({ cvId, tone: 'formal' });
      onResult(tool);
    } catch (e) {
      const msg = (e as Error).message ?? '';
      Alert.alert(
        'Outil IA indisponible',
        msg.includes('cvAi') || msg.includes('RATE_LIMIT')
          ? 'Tu as atteint ton quota quotidien d’outils IA (10 par jour). Réessaie demain.'
          : 'L’outil IA a échoué. Réessaie dans un instant.',
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <SectionTitle>Outils IA</SectionTitle>
      <Card>
        {TOOLS.map((tool) => (
          <Row
            key={tool.id}
            icon={tool.icon}
            tone={tool.tone}
            title={tool.label}
            sub={pending === tool.id ? 'Envoi en cours…' : tool.desc}
            onPress={() => run(tool.id)}
            disabled={pending !== null}
            chevron
          />
        ))}
      </Card>
    </>
  );
}
