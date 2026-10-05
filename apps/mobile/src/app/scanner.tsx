import React from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as WebBrowser from 'expo-web-browser';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { useReduceMotion } from '@/design/motion';
import { Icon } from '@/design/icons';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { IdnButton } from '@/design/components/idn-button';
import { Badge } from '@/design/components/badge';
import { Card, DetailRow, ErrorNote, Note } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { api } from '@/lib/api';
import {
  administrationVerifyApiUrl,
  formatActDate,
  formatVerificationCodeForDisplay,
  isFoundVerifyResult,
  normalizeVerificationCode,
  parseVerifyResponse,
  verifyEndpoints,
  verifyResultTitle,
  type VerifyResult,
} from '@/lib/official-act';
import { classifyScan } from '@/lib/scan-target';

type State =
  | { view: 'scan' }
  | { view: 'manual' }
  | { view: 'verifying'; code: string }
  | { view: 'act'; code: string; result: VerifyResult }
  | { view: 'device'; code: string }
  | { view: 'device-done' }
  | { view: 'presentation' }
  | { view: 'unknown' };

const API_BASE = administrationVerifyApiUrl(process.env as Record<string, string | undefined>);
const GREEN_ON_DARK = '#5BC57F';

/** Coins du réticule (vert clair sur fond sombre). */
function Reticle({ scanning }: { scanning: boolean }) {
  const reduce = useReduceMotion();
  const y = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!scanning || reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scanning, reduce, y]);
  const corner = (pos: object, b: object) => (
    <View style={[{ position: 'absolute', width: 36, height: 36, borderColor: GREEN_ON_DARK, borderRadius: 4 }, pos, b]} />
  );
  return (
    <View style={{ width: 250, height: 250 }} accessible accessibilityLabel="Cadre de lecture du QR code">
      {corner({ top: 0, left: 0 }, { borderTopWidth: 3, borderLeftWidth: 3 })}
      {corner({ top: 0, right: 0 }, { borderTopWidth: 3, borderRightWidth: 3 })}
      {corner({ bottom: 0, left: 0 }, { borderBottomWidth: 3, borderLeftWidth: 3 })}
      {corner({ bottom: 0, right: 0 }, { borderBottomWidth: 3, borderRightWidth: 3 })}
      {scanning ? (
        <Animated.View
          style={{ position: 'absolute', left: 14, right: 14, top: reduce ? 124 : 14, height: 2, backgroundColor: GREEN_ON_DARK, transform: reduce ? [] : [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }) }] }}
        />
      ) : null}
    </View>
  );
}

/** Scanner (prototype « scanner ») : vérifier un acte officiel ou connecter un autre appareil. */
export default function Scanner() {
  const t = useIdnTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useConvexAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const approveSession = useMutation(api.crossDevice.approveSession);
  const cancelSession = useMutation(api.crossDevice.cancelSession);
  const [state, setState] = React.useState<State>({ view: 'scan' });
  const [manual, setManual] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const handled = React.useRef(false);
  // QR déjà lu ailleurs (appareil photo d'iOS, lien idn://scanner?qr=…) : mêmes règles qu'un scan.
  const { qr } = useLocalSearchParams<{ qr?: string }>();
  const deviceStatus = useQuery(api.crossDevice.getStatus, state.view === 'device' ? { sessionCode: state.code } : 'skip');

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  const verifyAct = React.useCallback(async (code: string) => {
    setState({ view: 'verifying', code });
    const endpoints = verifyEndpoints(API_BASE, code);
    if (!endpoints) return setState({ view: 'act', code, result: { kind: 'unknown' } });
    try {
      const res = await fetch(endpoints.statusUrl, { headers: { Accept: 'application/json' } });
      const body = await res.json().catch(() => null);
      setState({ view: 'act', code, result: parseVerifyResponse(res.status, body) });
    } catch {
      setState({ view: 'act', code, result: { kind: 'error' } });
    }
  }, []);

  function onScanned(data: string) {
    if (handled.current) return;
    const target = classifyScan(data);
    handled.current = true;
    if (target.kind === 'act') void verifyAct(target.code);
    else if (target.kind === 'cross-device') setState({ view: 'device', code: target.code });
    else setState({ view: target.kind });
  }

  React.useEffect(() => {
    if (qr) onScanned(qr);
    // Une seule fois, au premier rendu avec le paramètre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qr]);

  function restart() {
    handled.current = false;
    setError(null);
    setManual('');
    setState({ view: 'scan' });
  }

  async function approve(code: string) {
    setBusy(true);
    setError(null);
    try {
      await approveSession({ sessionCode: code });
      setState({ view: 'device-done' });
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data;
      setError(data?.message ?? 'Cette demande de connexion a expiré. Affiche un nouveau QR sur l’autre appareil.');
    } finally {
      setBusy(false);
    }
  }

  async function refuse(code: string) {
    try {
      await cancelSession({ sessionCode: code });
    } finally {
      restart();
    }
  }

  // ── Viseur sombre ───────────────────────────────────────────────────────
  if (state.view === 'scan' || state.view === 'verifying') {
    const canScan = !!permission?.granted && state.view === 'scan';
    return (
      <View style={{ flex: 1, backgroundColor: '#0E110D', paddingTop: insets.top }}>
        <StatusBar style="light" />
        {permission?.granted ? (
          <CameraView
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={canScan ? (e) => onScanned(e.data) : undefined}
          />
        ) : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(14,17,13,0.55)' }} />
        <AppBar title="Vérifier un acte officiel" onBack={() => router.back()} backIcon="close" tone="dark" border={false} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Reticle scanning={state.view === 'scan'} />
          <Text accessibilityLiveRegion="polite" style={{ marginTop: 28, fontSize: 15, color: '#F2F0E8', textAlign: 'center', paddingHorizontal: 32 }}>
            {state.view === 'verifying'
              ? 'Vérification de la signature…'
              : permission && !permission.granted
                ? 'Autorise l’appareil photo pour lire le QR, ou saisis le code imprimé sous le QR.'
                : 'Vise le QR code imprimé en bas de l’acte.'}
          </Text>
          {state.view === 'verifying' ? <IdnLottie name="loader" size={64} loop style={{ marginTop: 12 }} /> : null}
        </View>
        <View style={{ paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <Pressable
            onPress={() => setState({ view: 'manual' })}
            disabled={state.view === 'verifying'}
            accessibilityRole="button"
            style={({ pressed }) => ({ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: pressed ? '#2C3128' : '#181C16', alignItems: 'center', justifyContent: 'center' })}
          >
            <Text style={{ color: '#F2F0E8', fontSize: 15, fontWeight: '600' }}>Saisir le code de l’acte</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Saisie manuelle ─────────────────────────────────────────────────────
  if (state.view === 'manual') {
    const normalized = normalizeVerificationCode(manual);
    return (
      <Screen
        keyboard
        header={<AppBar title="Vérifier un acte officiel" onBack={restart} />}
        footer={<IdnButton t={t} full disabled={!normalized} onPress={() => normalized && void verifyAct(normalized)}>Vérifier</IdnButton>}
      >
        <Text accessibilityRole="header" style={{ marginTop: 20, fontSize: 20, fontWeight: '600', color: t.ink }}>Code de vérification</Text>
        <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted }}>Les 12 caractères imprimés sous le QR code de l’acte.</Text>
        <TextInput
          value={manual}
          onChangeText={setManual}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          placeholder="ABCD-EFGH-JKMN"
          placeholderTextColor={t.muted}
          accessibilityLabel="Code de vérification de l’acte"
          maxLength={16}
          style={{ marginTop: 20, height: 56, borderRadius: 10, borderWidth: 2, borderColor: normalized ? t.green : t.muted, paddingHorizontal: 14, fontSize: 20, letterSpacing: 2, color: t.ink, fontFamily: t.mono, backgroundColor: t.surface }}
        />
        <Text style={{ marginTop: 6, fontSize: 13, color: t.muted }}>{normalized ? formatVerificationCodeForDisplay(normalized) : 'Lettres et chiffres, tirets facultatifs.'}</Text>
      </Screen>
    );
  }

  // ── Connexion d'un autre appareil ──────────────────────────────────────
  if (state.view === 'device' || state.view === 'device-done') {
    const done = state.view === 'device-done';
    const status = deviceStatus?.status;
    const stale = !done && (status === 'expired' || status === 'cancelled' || deviceStatus === null);
    return (
      <Screen
        header={<AppBar title="Connexion d’un appareil" onBack={() => router.back()} backIcon="close" />}
        footer={
          done || stale ? (
            <IdnButton t={t} full onPress={() => router.back()}>Terminé</IdnButton>
          ) : (
            <>
              <IdnButton t={t} full onPress={() => void approve((state as { code: string }).code)} loading={busy} disabled={!isAuthenticated || status !== 'pending'}>Approuver la connexion</IdnButton>
              <IdnButton t={t} variant="ghost" full onPress={() => void refuse((state as { code: string }).code)}>Refuser</IdnButton>
            </>
          )
        }
      >
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          {done ? <IdnLottie name="success" size={128} label="Appareil connecté" /> : (
            <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: stale ? t.surface2 : t.blueBadge, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="laptop" size={32} color={stale ? t.muted : t.blueText} />
            </View>
          )}
          <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
            {done ? 'Appareil connecté' : stale ? 'Demande expirée' : 'Connecter un autre appareil ?'}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
            {done
              ? 'Termine la connexion sur l’autre appareil avec ton code PIN.'
              : stale
                ? 'Affiche un nouveau QR sur l’autre appareil puis scanne-le.'
                : 'Un appareil demande à se connecter à ton compte IDN. Approuve seulement si c’est toi qui viens d’afficher ce QR.'}
          </Text>
        </View>
        {!done && status === 'pending' && deviceStatus?.status === 'pending' ? (
          <Note center>Demande valable jusqu’à {new Date(deviceStatus.expiresAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.</Note>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </Screen>
    );
  }

  // ── Autres QR ───────────────────────────────────────────────────────────
  if (state.view === 'presentation' || state.view === 'unknown') {
    return (
      <Screen header={<AppBar title="QR code lu" onBack={() => router.back()} backIcon="close" />} footer={<IdnButton t={t} full onPress={restart}>Scanner un autre QR</IdnButton>}>
        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={state.view === 'presentation' ? 'idCard' : 'qr'} size={32} color={t.ink2} />
          </View>
          <Text accessibilityRole="header" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
            {state.view === 'presentation' ? 'Carte d’identité IDN' : 'QR code non reconnu'}
          </Text>
          <Text style={{ marginTop: 6, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
            {state.view === 'presentation'
              ? 'Seuls les agents habilités peuvent vérifier la carte IDN d’une autre personne, depuis leur outil de contrôle.'
              : 'Ce QR n’est ni un acte officiel ni une demande de connexion IDN. Par sécurité, il n’est pas ouvert.'}
          </Text>
        </View>
      </Screen>
    );
  }

  // ── Résultat de vérification d'un acte ──────────────────────────────────
  const { code, result } = state;
  const found = isFoundVerifyResult(result) ? result : null;
  const endpoints = verifyEndpoints(API_BASE, code);
  return (
    <Screen
      header={<AppBar title="Vérifier un acte officiel" onBack={() => router.back()} backIcon="close" />}
      footer={
        <>
          {found && endpoints ? (
            <IdnButton t={t} full onPress={() => void WebBrowser.openBrowserAsync(endpoints.pdfUrl)} leadIcon={<Icon name="file" size={18} color="#fff" />}>
              Voir le document original
            </IdnButton>
          ) : null}
          <IdnButton t={t} variant={found ? 'ghost' : 'primary'} full onPress={restart}>{result.kind === 'error' || result.kind === 'unavailable' ? 'Réessayer' : 'Vérifier un autre acte'}</IdnButton>
        </>
      }
    >
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        {result.kind === 'valid' ? (
          <IdnLottie name="shield" size={120} label="Acte authentique" />
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: result.kind === 'revoked' ? t.redBadge : result.kind === 'superseded' ? t.yellowBadge : t.surface2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={result.kind === 'revoked' ? 'close' : result.kind === 'superseded' ? 'refresh' : 'alert'} size={32} color={result.kind === 'revoked' ? t.redText : t.ink2} />
          </View>
        )}
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ marginTop: 12, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>{verifyResultTitle(result)}</Text>
        <View style={{ marginTop: 8 }}>
          {result.kind === 'valid' ? <Badge tone="green" icon="shield">Signature valide</Badge> : result.kind === 'revoked' ? <Badge tone="red">Ne plus utiliser</Badge> : result.kind === 'superseded' ? <Badge tone="yellow">Version remplacée</Badge> : null}
        </View>
        {result.kind === 'unknown' ? (
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>Aucun acte ne correspond au code {formatVerificationCodeForDisplay(code)}. Vérifie la saisie : un faux document est possible.</Text>
        ) : null}
      </View>
      {found ? (
        <Card style={{ marginTop: 20 }}>
          <DetailRow label="Type" value={found.typeLabel} />
          <DetailRow label="Émetteur" value={found.issuerName} />
          <DetailRow label="Émis le" value={formatActDate(found.issuedAt)} />
          <DetailRow label="Signature" value={found.signed ? (found.signedAt ? `Oui, le ${formatActDate(found.signedAt)}` : 'Oui') : 'Non signé'} />
          <DetailRow label="Numéro" value={found.documentNumber} mono />
          <DetailRow label="Code" value={formatVerificationCodeForDisplay(code)} mono />
        </Card>
      ) : null}
      {found ? <Note>Compare le document original avec celui que tu as en main : il doit être identique.</Note> : null}
    </Screen>
  );
}
