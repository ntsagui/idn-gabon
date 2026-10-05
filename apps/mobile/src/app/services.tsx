import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { Text, TextInput } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon, type IconName } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, Note, Row, SectionTitle } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { api } from '@/lib/api';

type CategoryId =
  | 'administrative' | 'civilStatus' | 'fiscal' | 'education'
  | 'health' | 'transport' | 'social' | 'other';

const CATEGORY_ICON: Record<CategoryId, IconName> = {
  administrative: 'building',
  civilStatus: 'baby',
  fiscal: 'doc',
  education: 'cap',
  health: 'heart',
  transport: 'car',
  social: 'users',
  other: 'folder',
};

/** Catalogue des services publiés par les applications que tu as autorisées. */
export default function Services() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const services = useQuery(api.services.listForCurrentUser, isAuthenticated ? {} : 'skip');
  const categories = useQuery(api.services.listCategories, {});
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryId | null>(null);

  const counts = useMemo(() => {
    const m = new Map<CategoryId, number>();
    for (const s of services ?? []) m.set(s.category as CategoryId, (m.get(s.category as CategoryId) ?? 0) + 1);
    return m;
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    const q = search.trim().toLocaleLowerCase('fr');
    return services.filter((s) => {
      if (selectedCat && s.category !== selectedCat) return false;
      if (!q) return true;
      return (
        s.label.toLocaleLowerCase('fr').includes(q) ||
        s.description.toLocaleLowerCase('fr').includes(q) ||
        s.appName.toLocaleLowerCase('fr').includes(q)
      );
    });
  }, [services, search, selectedCat]);

  // Seules les catégories qui contiennent au moins un service sont proposées en filtre.
  const chips = [
    { id: null, label: 'Tout', n: services?.length ?? 0 },
    ...(categories ?? [])
      .map((c) => ({ id: c.id as CategoryId, label: c.label, n: counts.get(c.id as CategoryId) ?? 0 }))
      .filter((c) => c.n > 0),
  ];

  return (
    <Screen header={<AppBar title="Services publics" onBack={() => router.back()} />}>
      {services === undefined ? (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <IdnLottie name="loader" size={72} loop label="Chargement des services" />
        </View>
      ) : services.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <IdnLottie name="partage" size={120} />
          <Text accessibilityRole="header" style={{ marginTop: 8, fontSize: 17, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
            Aucun service pour l’instant
          </Text>
          <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
            Quand tu te connectes à une application avec ton compte IDN, les démarches qu’elle propose apparaissent ici.
          </Text>
        </View>
      ) : (
        <>
          <Text style={{ marginTop: 16, fontSize: 14, color: t.muted }}>
            {services.length} service{services.length > 1 ? 's' : ''} accessible{services.length > 1 ? 's' : ''} avec ton compte IDN
          </Text>
          <View style={{ marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
            <Icon name="search" size={16} color={t.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un service"
              placeholderTextColor={t.muted}
              returnKeyType="search"
              accessibilityLabel="Rechercher un service"
              style={{ flex: 1, fontSize: 15, color: t.ink, paddingVertical: 0 }}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
            {chips.map((c) => {
              const sel = c.id === selectedCat;
              return (
                <Pressable
                  key={c.id ?? 'all'}
                  onPress={() => setSelectedCat(c.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sel }}
                  style={{ flexDirection: 'row', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
                >
                  <Text style={{ fontSize: 13, fontWeight: sel ? '600' : '500', color: sel ? t.greenText : t.ink2 }}>{c.label}</Text>
                  <Text style={{ fontSize: 13, fontFamily: t.mono, color: sel ? t.greenText : t.muted }}>{c.n}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {filtered.length === 0 ? (
            <Note center>Aucun service ne correspond. Essaie un autre mot-clé ou une autre catégorie.</Note>
          ) : (
            <>
              <SectionTitle style={{ marginTop: 12 }}>
                {selectedCat ? categories?.find((c) => c.id === selectedCat)?.label : 'Disponibles pour toi'}
              </SectionTitle>
              <Card>
                {filtered.map((s) => (
                  <Row
                    key={s.id}
                    icon={CATEGORY_ICON[s.category as CategoryId] ?? 'folder'}
                    tone="green"
                    title={s.label}
                    sub={s.appName}
                    chevron
                    onPress={() => router.push(`/service/${encodeURIComponent(s.id)}` as never)}
                  />
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
