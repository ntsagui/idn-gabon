import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Text } from '@/design/text';
import { useMutation } from 'convex/react';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { ICV_THEMES, THEME_CATEGORIES, type CvThemeId } from '@/data/cv';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { Card, SectionTitle } from '@/design/components/list';
import { CvChips } from '@/components/cv/cv-ui';

/**
 * Libellés français des 12 thèmes. `@/data/cv` garde des noms anglais
 * (« Modern », « Bold »…) partagés avec le web : on les traduit ici, pour
 * l'affichage seulement (l'identifiant envoyé au backend ne change pas).
 */
const THEME_FR: Record<CvThemeId, { label: string; desc: string }> = {
  modern: { label: 'Moderne', desc: 'Net et contemporain' },
  classic: { label: 'Classique', desc: 'Intemporel' },
  minimalist: { label: 'Minimal', desc: 'Épuré et sobre' },
  professional: { label: 'Professionnel', desc: 'Formel et sérieux' },
  creative: { label: 'Créatif', desc: 'Artistique' },
  startup: { label: 'Start-up', desc: 'Tech et dynamique' },
  bold: { label: 'Audacieux', desc: 'Contrasté et affirmé' },
  tech: { label: 'Tech', desc: 'Informatique et numérique' },
  academic: { label: 'Universitaire', desc: 'Recherche et enseignement' },
  executive: { label: 'Direction', desc: 'Postes de direction' },
  elegant: { label: 'Élégant', desc: 'Raffiné' },
  compact: { label: 'Compact', desc: 'Dense et efficace' },
};

const CATEGORY_FR: Record<string, string> = {
  'Classique & Pro': 'Classiques et professionnels',
  'Créatif & Moderne': 'Créatifs et modernes',
  Spécialisé: 'Spécialisés',
};

export function themeLabel(id: string | undefined | null): string {
  return THEME_FR[(id ?? 'modern') as CvThemeId]?.label ?? THEME_FR.modern.label;
}

export function themeDesc(id: CvThemeId): string {
  return THEME_FR[id].desc;
}

export function categoryLabel(cat: string): string {
  return CATEGORY_FR[cat] ?? cat;
}

/** Applique un thème au CV (`cv.profile.setTheme`). */
function useSetCvTheme(cvId: Id<'citizenCv'>, activeTheme: CvThemeId) {
  const setTheme = useMutation(api.cv.profile.setTheme);
  const [pending, setPending] = useState<CvThemeId | null>(null);
  async function pick(id: CvThemeId) {
    if (pending || id === activeTheme) return;
    setPending(id);
    try {
      await setTheme({ cvId, theme: id });
    } catch (e) {
      Alert.alert('Thème non appliqué', (e as Error).message || 'Réessaie dans un instant.');
    } finally {
      setPending(null);
    }
  }
  return { pending, pick };
}

/** Pastilles de thèmes (prototype iCV), défilement horizontal. */
export function ThemeChips({ cvId, activeTheme }: { cvId: Id<'citizenCv'>; activeTheme: CvThemeId }) {
  const { pending, pick } = useSetCvTheme(cvId, activeTheme);
  return (
    <CvChips
      label="Thème du CV"
      items={ICV_THEMES.map((th) => ({ id: th.id, label: themeLabel(th.id), color: th.color }))}
      value={pending ?? activeTheme}
      onChange={pick}
      disabled={pending !== null}
    />
  );
}

/** Liste complète des thèmes, par catégorie (Studio). */
export function ThemePicker({
  cvId,
  activeTheme,
  onOpenGallery,
}: {
  cvId: Id<'citizenCv'>;
  activeTheme: CvThemeId;
  onOpenGallery?: () => void;
}) {
  const t = useIdnTheme();
  const { pending, pick } = useSetCvTheme(cvId, activeTheme);

  return (
    <View>
      <SectionTitle action={onOpenGallery ? 'Galerie' : undefined} onAction={onOpenGallery}>
        Thème
      </SectionTitle>
      {THEME_CATEGORIES.map((cat) => (
        <View key={cat} style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: t.mono, fontSize: 11, fontWeight: '500', letterSpacing: 1.3, textTransform: 'uppercase', color: t.muted, marginBottom: 8 }}>
            {categoryLabel(cat)}
          </Text>
          <Card>
            {ICV_THEMES.filter((th) => th.category === cat).map((th) => {
              const sel = th.id === activeTheme;
              return (
                <Pressable
                  key={th.id}
                  onPress={() => pick(th.id)}
                  disabled={pending !== null}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sel, busy: pending === th.id }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10, opacity: pending && pending !== th.id ? 0.5 : pressed ? 0.6 : 1 })}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 9999, backgroundColor: th.color }} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: sel ? '600' : '500', color: t.ink }}>{themeLabel(th.id)}</Text>
                    <Text style={{ fontSize: 13, color: t.muted }} numberOfLines={1}>{themeDesc(th.id)}</Text>
                  </View>
                  {sel ? <Icon name="check" size={18} color={t.greenText} /> : null}
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}
    </View>
  );
}
