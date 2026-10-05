import React from 'react';
import { Text } from '@/design/text';
import { useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, Note, Row } from '@/design/components/list';
import { api } from '@/lib/api';
import { LANGUAGES } from '@/data/languages';

/**
 * L'application n'est traduite qu'en français : aucune autre langue n'est
 * sélectionnable tant que sa traduction n'existe pas (pas de choix sans effet).
 */
const AVAILABLE = 'fr';

export default function SettingsLanguage() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const prefs = useQuery(api.preferences.getMyPreferences, isAuthenticated ? {} : 'skip');

  return (
    <Screen header={<AppBar title="Langue" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        L’application est disponible en français. Les autres langues arrivent progressivement.
      </Text>
      <Card style={{ marginTop: 16 }}>
        {LANGUAGES.map((o) =>
          o.id === AVAILABLE ? (
            <Row
              key={o.id}
              title={o.l}
              sub="Langue officielle"
              right={<Badge tone="green" icon="check">Utilisée</Badge>}
            />
          ) : (
            <Row key={o.id} title={o.l} right={<Badge tone="neutral">Bientôt</Badge>} />
          ),
        )}
      </Card>
      {prefs?.language && prefs.language !== AVAILABLE ? (
        <Note>
          Ton compte indique l’anglais comme langue préférée. L’application reste en français tant que cette traduction n’est pas disponible.
        </Note>
      ) : null}
    </Screen>
  );
}
