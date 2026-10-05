import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { useUpdates } from 'expo-updates';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnFlagBars } from '@/design/mark';
import { Icon, type IconName } from '@/design/icons';
import { Screen } from '@/design/components/screen';
import { IconButton } from '@/design/components/app-bar';
import { LevelBadge } from '@/design/components/badge';
import { Card, IconTile, Row, SectionTitle, type RowTone } from '@/design/components/list';
import { api } from '@/lib/api';
import { AUDIT_ACTION_LABELS, formatRelativeDate } from '@/lib/activity-format';
import { homeTasks } from '@/lib/home-tasks';
import { initialsOf, setLastAccount } from '@/lib/last-account';

function profileLabel(type: string | undefined, gender: string | undefined): string {
  const f = gender === 'F';
  if (type === 'citizen') return f ? 'Citoyenne gabonaise' : 'Citoyen gabonais';
  if (type === 'resident') return f ? 'Résidente' : 'Résident';
  if (type === 'visitor') return f ? 'Visiteuse' : 'Visiteur';
  if (type === 'developer') return 'Développeur';
  return '';
}

function frDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function activityVisual(action: string): { icon: IconName; tone: RowTone } {
  if (action.startsWith('login') || action === 'partner_token_exchanged') return { icon: 'logOut', tone: 'green' };
  if (action.startsWith('consent')) return { icon: 'keyRound', tone: 'green' };
  if (action.startsWith('kyc') || action.startsWith('level3') || action === 'identity_check_performed') return { icon: 'shield', tone: 'blue' };
  if (action.startsWith('session')) return { icon: 'smartphone', tone: 'yellow' };
  if (action.includes('pin') || action.includes('password')) return { icon: 'lock', tone: 'neutral' };
  if (action === 'presentation_minted') return { icon: 'qr', tone: 'green' };
  return { icon: 'activity', tone: 'neutral' };
}

/** Accueil (prototype « home »). */
export default function Home() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const q = isAuthenticated ? {} : 'skip';
  const user = useQuery(api.profile.getCurrentUser, q);
  const unread = useQuery(api.notifications.unreadCount, q);
  const activity = useQuery(api.activity.listMine, isAuthenticated ? { limit: 3 } : 'skip');
  const wallet = useQuery(api.wallet.listMine, q);
  const accounts = useQuery(api.iboite.accounts.listMine, q);
  const docs = useQuery(api.idoc.summary, q);
  const cvs = useQuery(api.cv.cvs.listMine, q);
  const kyc = useQuery(api.kyc.getMyLatest, q);
  const level3 = useQuery(api.level3.getMine, q);
  const deletion = useQuery(api.privacy.getDeletionStatus, q);

  const pivot = user?.profile?.pivot;
  const { isUpdatePending } = useUpdates();
  React.useEffect(() => {
    if (user?.email) void setLastAccount({ email: user.email, firstName: pivot?.firstName, lastName: pivot?.lastName });
  }, [user?.email, pivot?.firstName, pivot?.lastName]);

  const fullName = pivot ? `${pivot.firstName} ${pivot.lastName}` : '';
  const loa = (user?.profile?.loa ?? 1) as 1 | 2 | 3;
  const unreadLetters = accounts?.reduce((n, a) => n + a.counters.unreadLetters, 0) ?? 0;
  const unreadMail = accounts?.reduce((n, a) => n + a.counters.unreadLetters + a.counters.unreadMessages, 0);
  const docCount = docs?.reduce((n, f) => n + f.count, 0);
  const defaultCv = cvs?.find((c) => c.isDefault) ?? cvs?.[0];
  const tasks = homeTasks({
    now: Date.now(),
    kycStatus: kyc?.status,
    level3: level3 ?? null,
    unreadLetters,
    deletionScheduledAt: deletion?.deletionScheduledAt ?? null,
    updateReady: isUpdatePending,
  });

  const plural = (n: number | undefined, one: string, many: string) => (n === undefined ? '…' : `${n} ${n > 1 ? many : one}`);
  const shortcuts: { label: string; sub: string; icon: IconName; tone: RowTone; route: string }[] = [
    { label: 'iCarte', sub: plural(wallet?.cards.length, 'carte', 'cartes'), icon: 'wallet', tone: 'green', route: '/icarte' },
    { label: 'iBoîte', sub: unreadMail === undefined ? '…' : unreadMail ? `${unreadMail} non lu${unreadMail > 1 ? 's' : ''}` : 'À jour', icon: 'mailbox', tone: 'blue', route: '/iboite' },
    { label: 'iDocument', sub: plural(docCount, 'document', 'documents'), icon: 'lock', tone: 'yellow', route: '/idoc' },
    { label: 'iCV', sub: cvs === undefined ? '…' : defaultCv ? `Complet à ${Math.round(defaultCv.completionScore)} %` : 'À créer', icon: 'fileUser', tone: 'neutral', route: '/icv' },
  ];

  const upgrade =
    loa === 1 && !tasks.some((x) => x.id.startsWith('kyc'))
      ? { title: 'Vérifie ton identité', sub: 'Pièce d’identité et selfie, en 5 minutes, pour passer au Niveau 2.', route: '/kyc/intro' }
      : loa === 2 && !tasks.some((x) => x.id.startsWith('l3'))
        ? { title: 'Passe au Niveau 3', sub: 'Mets à jour tes pièces, puis un entretien vidéo de 10 min avec un contrôleur.', route: '/kyc/level3' }
        : null;

  return (
    <Screen
      inTabs
      header={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ width: 44, height: 44, borderRadius: 9999, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{initialsOf(pivot?.firstName, pivot?.lastName, user?.email)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: t.muted }}>Bonjour,</Text>
            <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>{fullName || ' '}</Text>
          </View>
          <IconButton icon="scanLine" label="Vérifier un acte officiel" onPress={() => router.push('/scanner')} />
          <IconButton icon="bell" label={unread ? `Notifications, ${unread} non lues` : 'Notifications'} badge={!!unread} onPress={() => router.push('/notifications')} />
        </View>
      }
    >
      {/* Résumé d'identité */}
      <View style={{ marginTop: 8, borderRadius: 20, backgroundColor: t.green, padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.3, color: '#D9EADF', textTransform: 'uppercase' }}>Identité numérique</Text>
          <IdnFlagBars width={42} height={3} />
        </View>
        <Text style={{ marginTop: 14, fontSize: 22, fontWeight: '600', color: '#fff' }}>{fullName || '…'}</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#D9EADF' }}>
          {[profileLabel(user?.profile?.profileType, pivot?.gender), pivot?.dateOfBirth ? `${pivot?.gender === 'F' ? 'Née' : 'Né'} le ${frDate(pivot.dateOfBirth)}` : ''].filter(Boolean).join(' · ')}
        </Text>
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <LevelBadge level={loa} onGreen short={loa < 3} />
          <Pressable
            onPress={() => router.push('/id-card')}
            accessibilityRole="button"
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: pressed ? '#08401F' : '#0A5C2C' })}
          >
            <Icon name="qr" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Présenter ma carte</Text>
          </Pressable>
        </View>
      </View>

      {/* Raccourcis */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {shortcuts.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => router.push(s.route as never)}
            accessibilityRole="button"
            accessibilityLabel={`${s.label}, ${s.sub}`}
            style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 4, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: pressed ? t.surface2 : t.surface })}
          >
            <IconTile icon={s.icon} tone={s.tone} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }}>{s.label}</Text>
            <Text numberOfLines={1} style={{ fontSize: 11, color: t.muted }}>{s.sub}</Text>
          </Pressable>
        ))}
      </View>

      {upgrade ? (
        <Pressable
          onPress={() => router.push(upgrade.route as never)}
          accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: t.dark ? '#5C4D0F' : '#EBD98A', backgroundColor: t.yellowBadge, opacity: pressed ? 0.85 : 1 })}
        >
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.yellow, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shield" size={20} color="#16170F" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>{upgrade.title}</Text>
            <Text style={{ fontSize: 13, lineHeight: 18, color: t.ink2, marginTop: 2 }}>{upgrade.sub}</Text>
          </View>
          <Icon name="arrow" size={18} color={t.ink2} />
        </Pressable>
      ) : null}

      {tasks.length ? (
        <>
          <SectionTitle>À traiter</SectionTitle>
          <Card>
            {tasks.map((task) => (
              <Row key={task.id} icon={task.icon} tone={task.tone} title={task.title} sub={task.sub} chevron onPress={() => router.push(task.route as never)} />
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle action="Tout voir" onAction={() => router.push('/activity')}>Activité récente</SectionTitle>
      <Card>
        {activity === undefined ? (
          <Row title="Chargement…" />
        ) : activity.length === 0 ? (
          <Row title="Aucune activité pour l’instant" sub="Tes connexions et démarches apparaîtront ici." />
        ) : (
          activity.map((a) => {
            const v = activityVisual(a.action);
            return <Row key={a._id} icon={v.icon} tone={v.tone} title={AUDIT_ACTION_LABELS[a.action] ?? a.action} sub={formatRelativeDate(a.createdAt)} />;
          })
        )}
      </Card>

      <SectionTitle>Démarches</SectionTitle>
      <Card>
        <Row icon="landmark" tone="green" title="Services publics" sub="Démarches accessibles avec ton compte IDN" chevron onPress={() => router.push('/services')} />
        <Row icon="keyRound" tone="neutral" title="Applications autorisées" sub="Ce que tu partages avec les services partenaires" chevron onPress={() => router.push('/consents')} />
      </Card>
    </Screen>
  );
}
