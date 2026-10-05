import React, { useEffect, useState } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { Text } from '@/design/text';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { api } from '@/lib/api';
import type { Id } from '@repo/backend/convex/_generated/dataModel';
import { Icon } from '@/design/icons';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Overline } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { ICV_THEMES, THEME_CATEGORIES, type CvThemeId } from '@/data/cv';
import { CvPreview, type PreviewCv } from '@/components/cv/cv-preview';
import { categoryLabel, themeDesc, themeLabel } from '@/components/cv/theme-picker';

export default function ICVThemes() {
  const params = useLocalSearchParams<{ cv?: string }>();
  const cvId = params.cv as Id<'citizenCv'> | undefined;
  const t = useIdnTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cv = useQuery(api.cv.profile.get, cvId ? { cvId } : 'skip');
  const setTheme = useMutation(api.cv.profile.setTheme);
  const [selected, setSelected] = useState<CvThemeId | null>(null);
  const [busy, setBusy] = useState(false);
  // Deux vignettes par ligne : marges d'écran 20 + 20, écart 10, padding 8 + 8.
  const thumb = Math.floor((width - 40 - 10) / 2) - 18;

  useEffect(() => {
    if (cv?.activeTheme) setSelected(cv.activeTheme as CvThemeId);
  }, [cv?.activeTheme]);

  async function apply() {
    if (!cvId || !selected || busy) return;
    if (selected === cv?.activeTheme) {
      router.back();
      return;
    }
    setBusy(true);
    try {
      await setTheme({ cvId, theme: selected });
      router.back();
    } catch (e) {
      Alert.alert('Thème non appliqué', (e as Error).message || 'Réessaie dans un instant.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      sheet
      header={<AppBar title="Galerie des thèmes" onBack={() => router.back()} backIcon="close" />}
      footer={
        <IdnButton t={t} full onPress={apply} loading={busy} disabled={!selected}>
          {selected ? `Appliquer le thème ${themeLabel(selected)}` : 'Choisis un thème'}
        </IdnButton>
      }
    >
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>12 mises en page, réparties en 3 familles. Le PDF reprend le thème choisi.</Text>
      {THEME_CATEGORIES.map((cat) => (
        <View key={cat} style={{ marginTop: 20 }}>
          <Overline style={{ marginBottom: 10 }}>{categoryLabel(cat)}</Overline>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ICV_THEMES.filter((th) => th.category === cat).map((th) => {
              const sel = th.id === selected;
              return (
                <Pressable
                  key={th.id}
                  onPress={() => setSelected(th.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`Thème ${themeLabel(th.id)}, ${themeDesc(th.id)}`}
                  style={{
                    width: thumb + 18,
                    padding: 8,
                    borderRadius: 14,
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? t.green : t.border,
                    backgroundColor: sel ? t.greenBadge : t.surface,
                  }}
                >
                  {cv ? (
                    <CvPreview cv={cv as PreviewCv} themeId={th.id} width={thumb - (sel ? 2 : 0)} />
                  ) : (
                    <View style={{ width: thumb, aspectRatio: 0.71, borderRadius: 6, backgroundColor: t.surface2 }} />
                  )}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 9999, backgroundColor: th.color }} />
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: sel ? t.greenText : t.ink }}>{themeLabel(th.id)}</Text>
                    {sel ? <Icon name="check" size={16} color={t.greenText} /> : null}
                  </View>
                  <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }} numberOfLines={1}>{themeDesc(th.id)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}
