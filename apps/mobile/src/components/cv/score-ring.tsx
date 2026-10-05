import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';
import Svg, { Circle } from 'react-native-svg';

import { useIdnTheme } from '@/design/theme';
import { Badge } from '@/design/components/badge';

const LEVELS = {
  Expert: { label: 'Niveau expert', desc: 'Ton profil est attractif pour les recruteurs.', tone: 'green' },
  Bon: { label: 'Bon niveau', desc: 'Bon profil : quelques améliorations sont possibles.', tone: 'blue' },
  Débutant: { label: 'À compléter', desc: 'Complète ton CV pour gagner en visibilité.', tone: 'yellow' },
} as const;

/** Anneau de complétude du CV (`cv.score.get`, 0 à 100). */
export function ScoreRing({ score, level }: { score: number; level: 'Débutant' | 'Bon' | 'Expert' }) {
  const t = useIdnTheme();
  const size = 76;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const meta = LEVELS[level];

  return (
    <View
      accessible
      accessibilityLabel={`Score du CV : ${clamped} sur 100, ${meta.label}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 14 }}
    >
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.surface2} strokeWidth={stroke} />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={t.green}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c}`}
            strokeDashoffset={c * (1 - clamped / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <Text style={{ fontSize: 22, fontWeight: '600', color: t.ink }}>{clamped}</Text>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <Text style={{ fontSize: 13, lineHeight: 18, color: t.muted }}>{meta.desc}</Text>
      </View>
    </View>
  );
}
