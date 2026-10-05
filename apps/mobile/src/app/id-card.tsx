import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import QRCode from 'react-native-qrcode-svg';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { IdnFlagBars } from '@/design/mark';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnButton } from '@/design/components/idn-button';
import { LevelBadge } from '@/design/components/badge';
import { ErrorNote } from '@/design/components/list';
import { api } from '@/lib/api';
import { initialsOf } from '@/lib/last-account';
import { formatNip, maskNip } from '@/lib/nip-format';

// On renouvelle un peu avant l'expiration pour qu'un code affiché soit toujours valide.
const REFRESH_PADDING_MS = 2_000;
const TOKEN_TTL_S = 30;

function frDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Field({ label, value }: { label: string; value: string }) {
  const t = useIdnTheme();
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontFamily: t.mono, fontSize: 10, letterSpacing: 1.2, color: '#BFDCC9', textTransform: 'uppercase' }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 }}>{value || '—'}</Text>
    </View>
  );
}

/** Carte d'identité numérique et QR de présentation (prototype « idcard »). */
export default function IdCard() {
  const t = useIdnTheme();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : 'skip');
  const mintToken = useMutation(api.presentation.mintToken);
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showNip, setShowNip] = useState(false);
  const [minting, setMinting] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    setMinting(true);
    try {
      const r = await mintToken({});
      setToken(r.token);
      setExpiresAt(r.expiresAt);
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data;
      setError(data?.message ?? (err instanceof Error ? err.message : 'Impossible de générer le code.'));
      setToken(null);
    } finally {
      setMinting(false);
    }
  }, [mintToken]);

  useEffect(() => {
    if (isAuthenticated) void refresh();
  }, [refresh, isAuthenticated]);

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      const left = expiresAt - Date.now();
      setRemainingMs(left);
      if (left <= REFRESH_PADDING_MS) void refresh();
    }, 250);
    return () => clearInterval(id);
  }, [expiresAt, refresh]);

  const profile = user?.profile;
  const pivot = profile?.pivot;
  const loa = (profile?.loa ?? 1) as 1 | 2 | 3;
  const nip = pivot?.nip;
  const secondsLeft = Math.max(0, Math.ceil((remainingMs - REFRESH_PADDING_MS) / 1000));
  const progress = Math.min(1, Math.max(0, secondsLeft / (TOKEN_TTL_S - REFRESH_PADDING_MS / 1000)));
  // Empreinte courte du jeton, lisible à voix haute si le QR ne passe pas.
  const shortCode = token ? token.slice(-8).toUpperCase().replace(/[^A-Z0-9]/g, '7') : '········';

  return (
    <Screen header={<AppBar title="Ma carte d’identité" onBack={() => router.back()} />}>
      <View style={{ marginTop: 16, borderRadius: 20, backgroundColor: t.green, padding: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: t.mono, fontSize: 11, letterSpacing: 1.3, color: '#D9EADF', textTransform: 'uppercase' }}>République gabonaise</Text>
          <IdnFlagBars width={42} height={3} />
        </View>
        <Text style={{ marginTop: 4, fontSize: 15, fontWeight: '600', color: '#fff' }}>Carte d’identité numérique</Text>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 16 }}>
          <View style={{ width: 76, height: 92, borderRadius: 10, backgroundColor: '#E3F0E7', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile?.photoUrl ? (
              <Image source={{ uri: profile.photoUrl }} style={{ width: 76, height: 92 }} contentFit="cover" accessibilityLabel="Photo d’identité" />
            ) : (
              <Text style={{ fontSize: 24, fontWeight: '600', color: '#0A5C2C' }}>{initialsOf(pivot?.firstName, pivot?.lastName)}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Nom" value={pivot?.lastName.toUpperCase() ?? ''} />
            <Field label="Prénom" value={pivot?.firstName ?? ''} />
            <Field label={pivot?.gender === 'F' ? 'Née le' : 'Né le'} value={pivot ? `${frDate(pivot.dateOfBirth)} à ${pivot.birthPlace}` : ''} />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.18)', marginVertical: 12 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: t.mono, fontSize: 10, letterSpacing: 1.2, color: '#BFDCC9' }}>NIP</Text>
            {nip ? (
              <Text style={{ marginTop: 2, fontFamily: t.mono, fontSize: 16, letterSpacing: 1.5, color: '#fff', fontWeight: '500' }}>
                {showNip ? formatNip(nip) : maskNip(nip)}
              </Text>
            ) : (
              <Text style={{ marginTop: 2, fontSize: 14, color: '#fff' }}>Attribué après la vérification d’identité</Text>
            )}
          </View>
          {nip ? (
            <Pressable
              onPress={() => setShowNip((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showNip ? 'Masquer le NIP' : 'Afficher le NIP'}
              style={{ width: 40, height: 40, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={showNip ? 'eyeOff' : 'eye'} size={18} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        <LevelBadge level={loa} onGreen style={{ marginTop: 12 }} />
      </View>

      <View style={{ marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, padding: 20, alignItems: 'center' }}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel="QR code de présentation de ton identité, renouvelé toutes les 30 secondes"
          style={{ padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#E6E4DD', backgroundColor: '#fff', width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}
        >
          {token ? <QRCode value={token} size={176} color="#16170F" backgroundColor="#FFFFFF" ecl="M" /> : <Icon name="qr" size={48} color="#C9C7BF" />}
        </View>
        <Text selectable style={{ marginTop: 12, fontFamily: t.mono, fontSize: 13, letterSpacing: 2, color: t.ink }}>{shortCode}</Text>
        <View style={{ alignSelf: 'stretch', height: 4, borderRadius: 9999, backgroundColor: t.border, marginTop: 12, overflow: 'hidden' }}>
          <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: t.green }} />
        </View>
        <View accessibilityLiveRegion="none" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Icon name="clock" size={14} color={t.muted} />
          <Text style={{ fontSize: 13, color: t.muted }}>{token ? `Nouveau code dans ${secondsLeft} s` : minting ? 'Génération du code…' : 'Code indisponible'}</Text>
        </View>
        <Text style={{ marginTop: 10, fontSize: 13, lineHeight: 19, color: t.muted, textAlign: 'center' }}>
          Présente ce code à un agent ou au vérificateur public. Il change toutes les 30 secondes pour empêcher les copies.
        </Text>
        <ErrorNote>{error}</ErrorNote>
        <IdnButton t={t} variant="secondary" full onPress={refresh} loading={minting} leadIcon={<Icon name="refresh" size={16} color={t.ink} />} style={{ marginTop: 16 }}>
          Régénérer maintenant
        </IdnButton>
      </View>
    </Screen>
  );
}
