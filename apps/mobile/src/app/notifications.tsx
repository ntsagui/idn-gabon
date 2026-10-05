import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Card, Overline, Row, type RowTone } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import type { IconName } from '@/design/icons';
import { api } from '@/lib/api';
import { notificationRoute } from '@/lib/notification-route';

type Filter = 'all' | 'unread' | 'security' | 'documents';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'unread', label: 'Non lues' },
  { id: 'security', label: 'Sécurité' },
  { id: 'documents', label: 'Documents' },
];

const VISUAL: Record<string, { icon: IconName; tone: RowTone; label: string }> = {
  security: { icon: 'alert', tone: 'yellow', label: 'Sécurité' },
  kyc: { icon: 'shield', tone: 'blue', label: 'Vérification' },
  consent: { icon: 'keyRound', tone: 'green', label: 'Accès' },
  comms: { icon: 'mail', tone: 'blue', label: 'iBoîte' },
  documents: { icon: 'file', tone: 'neutral', label: 'iDocument' },
  cv: { icon: 'fileUser', tone: 'neutral', label: 'iCV' },
  ai: { icon: 'sparkles', tone: 'neutral', label: 'iCV' },
  system: { icon: 'bell', tone: 'neutral', label: 'IDN' },
};

function relative(ts: number, now: number): string {
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return 'À l’instant';
  if (min < 60) return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Il y a ${h} h`;
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(ts);
}

function bucket(ts: number, now: number): 'today' | 'week' | 'older' {
  const d = new Date(now);
  const startToday = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (ts >= startToday) return 'today';
  if (ts >= startToday - 6 * 86_400_000) return 'week';
  return 'older';
}

const BUCKETS = [
  { id: 'today', label: 'Aujourd’hui' },
  { id: 'week', label: 'Cette semaine' },
  { id: 'older', label: 'Plus ancien' },
] as const;

/** Notifications (prototype « notifs »). */
export default function Notifications() {
  const t = useIdnTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const { isAuthenticated } = useConvexAuth();
  const rows = useQuery(api.notifications.listMine, isAuthenticated ? { limit: 100, filter } : 'skip');
  const unread = useQuery(api.notifications.unreadCount, isAuthenticated ? {} : 'skip');
  const markAllRead = useMutation(api.notifications.markAllRead);
  const markRead = useMutation(api.notifications.markRead);
  const clearAll = useMutation(api.notifications.clearAll);
  const now = Date.now();

  function confirmClear() {
    Alert.alert('Effacer les notifications ?', 'Elles disparaissent de cet écran. Tes courriers et documents ne sont pas touchés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: () => void clearAll({}).catch(() => Alert.alert('Effacement impossible', 'Réessaie.')) },
    ]);
  }

  async function open(n: NonNullable<typeof rows>[number]) {
    if (!n.readAt) await markRead({ notificationId: n._id }).catch(() => undefined);
    const route = notificationRoute(n);
    if (route) router.push(route as never);
  }

  return (
    <Screen
      header={
        <AppBar
          title="Notifications"
          onBack={() => router.back()}
          right={
            unread ? (
              <Pressable onPress={() => void markAllRead({})} accessibilityRole="button" hitSlop={8}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: t.greenText }}>Tout lire</Text>
              </Pressable>
            ) : null
          }
        />
      }
    >
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
        {FILTERS.map((f) => {
          const sel = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: sel }}
              style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
            >
              <Text style={{ fontSize: 13, fontWeight: sel ? '600' : '500', color: sel ? t.greenText : t.ink2 }}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {rows === undefined ? (
        <Text style={{ marginTop: 24, color: t.muted }}>Chargement…</Text>
      ) : rows.length === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 48 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Aucune notification</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: t.muted, textAlign: 'center' }}>
            {filter === 'unread' ? 'Tout est lu.' : 'Tes alertes de sécurité, courriers et démarches apparaîtront ici.'}
          </Text>
        </View>
      ) : (
        BUCKETS.map((b) => {
          const items = rows.filter((n) => bucket(n.createdAt, now) === b.id);
          if (!items.length) return null;
          return (
            <View key={b.id}>
              <Overline style={{ marginTop: 22, marginBottom: 8 }}>{b.label}</Overline>
              <Card>
                {items.map((n) => {
                  const route = notificationRoute(n);
                  // Un message ou un courrier iBoîte peut être classé « documents » côté serveur.
                  const v = route?.startsWith('/iboite') ? VISUAL.comms! : VISUAL[n.category] ?? VISUAL.system!;
                  return (
                    <Row
                      key={n._id}
                      icon={v.icon}
                      tone={v.tone}
                      unread={!n.readAt}
                      title={n.title}
                      sub={
                        <View style={{ gap: 2 }}>
                          {n.body ? <Text numberOfLines={2} style={{ fontSize: 13, lineHeight: 18, color: t.ink2 }}>{n.body}</Text> : null}
                          <Text style={{ fontSize: 12, color: t.muted }}>{`${relative(n.createdAt, now)} · ${v.label}`}</Text>
                        </View>
                      }
                      chevron={!!route}
                      onPress={() => void open(n)}
                      accessibilityLabel={`${n.readAt ? '' : 'Non lue, '}${n.title}`}
                    />
                  );
                })}
              </Card>
            </View>
          );
        })
      )}
      {rows && rows.length > 0 ? (
        <IdnButton t={t} variant="ghost" full onPress={confirmClear} style={{ marginTop: 24 }}>Effacer les notifications</IdnButton>
      ) : null}
    </Screen>
  );
}
