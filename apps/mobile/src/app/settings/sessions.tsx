import React, { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { Text } from '@/design/text';
import { useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Badge } from '@/design/components/badge';
import { Card, ErrorNote, Row } from '@/design/components/list';
import { IdnButton } from '@/design/components/idn-button';
import { deviceLabel } from '@/lib/device-label';
import { api } from '@/lib/api';

type Session = {
  id: string;
  device: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: number;
  expiresAt: number;
  isCurrent: boolean;
};

function relative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return 'Active maintenant';
  if (diff < 60_000) return 'Il y a un instant';
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`;
  return `Il y a ${Math.floor(diff / 86_400_000)} j`;
}

export default function SettingsSessions() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const sessions = useQuery(api.sessions.listMine, isAuthenticated ? {} : 'skip') as Session[] | undefined;
  const revoke = useMutation(api.sessions.revoke);
  const revokeAllOthers = useMutation(api.sessions.revokeAllOthers);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke(s: Session) {
    if (s.isCurrent || revoking) return;
    Alert.alert(
      'Déconnecter cet appareil ?',
      `${s.device} devra se reconnecter avec ton code PIN.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            setRevoking(s.id);
            setError(null);
            try {
              await revoke({ sessionId: s.id });
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Révocation impossible.');
            } finally {
              setRevoking(null);
            }
          },
        },
      ],
    );
  }

  async function handleRevokeAllOthers() {
    Alert.alert(
      'Déconnecter tous les autres appareils ?',
      'Toutes les autres sessions sont fermées immédiatement. Tu restes connecté sur cet appareil.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter tout',
          style: 'destructive',
          onPress: async () => {
            setRevoking('all');
            setError(null);
            try {
              await revokeAllOthers({});
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Révocation impossible.');
            } finally {
              setRevoking(null);
            }
          },
        },
      ],
    );
  }

  const named = (sessions ?? []).map((s) => ({ ...s, device: deviceLabel(s.device, s.userAgent ?? null) }));
  const others = named.filter((s) => !s.isCurrent);
  const icon = (d: string) => (/iphone|android/i.test(d) ? 'smartphone' : /ipad/i.test(d) ? 'tablet' : 'laptop') as 'smartphone' | 'tablet' | 'laptop';

  return (
    <Screen
      header={<AppBar title="Appareils et sessions" onBack={() => router.back()} />}
      footer={others.length > 0 ? (
        <IdnButton t={t} variant="dangerGhost" full onPress={handleRevokeAllOthers} loading={revoking === 'all'}>Déconnecter tous les autres appareils</IdnButton>
      ) : undefined}
    >
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        {sessions === undefined ? 'Chargement…' : `${named.length} session${named.length > 1 ? 's' : ''} active${named.length > 1 ? 's' : ''}. Déconnecte un appareil que tu ne reconnais pas.`}
      </Text>
      <Card style={{ marginTop: 16 }}>
        {named.map((s) => (
          <Row
            key={s.id}
            icon={icon(s.device)}
            tone={s.isCurrent ? 'green' : 'neutral'}
            title={s.device}
            sub={[s.isCurrent ? 'Cet appareil' : relative(s.createdAt), s.ipAddress].filter(Boolean).join(' · ')}
            right={s.isCurrent ? <Badge tone="green">Actif</Badge> : (
              <Pressable onPress={() => handleRevoke(s)} disabled={revoking !== null} accessibilityRole="button" accessibilityLabel={`Déconnecter ${s.device}`} hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: t.redText }}>{revoking === s.id ? '…' : 'Déconnecter'}</Text>
              </Pressable>
            )}
          />
        ))}
      </Card>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  );
}
