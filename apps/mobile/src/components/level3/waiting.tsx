import React from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as Network from 'expo-network';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { Badge } from '@/design/components/badge';
import { Card, IconTile, Note } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { IdnButton } from '@/design/components/idn-button';

type CheckState = 'pending' | 'ok' | 'ko';

function CheckRow({ icon, title, sub, state }: { icon: 'camera' | 'mic' | 'wifi'; title: string; sub: string; state: CheckState }) {
  const t = useIdnTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 10 }}>
      <IconTile icon={icon} tone={state === 'ok' ? 'green' : state === 'ko' ? 'red' : 'neutral'} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: t.ink }}>{title}</Text>
        <Text style={{ fontSize: 13, color: t.muted }}>{sub}</Text>
      </View>
      {state === 'ok' ? <Badge tone="green" icon="check">Prêt</Badge> : state === 'ko' ? <Badge tone="red">À régler</Badge> : <ActivityIndicator size="small" color={t.muted} />}
    </View>
  );
}

/**
 * Salle d'attente (prototype « l3-waiting ») : vérifie pour de vrai l'accès
 * à la caméra, au micro et au réseau avant d'autoriser l'entrée en visio.
 */
export function Level3Waiting({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const t = useIdnTheme();
  const [cam, requestCam] = useCameraPermissions();
  const [mic, requestMic] = useMicrophonePermissions();
  const [net, setNet] = React.useState<CheckState>('pending');

  React.useEffect(() => {
    if (cam && !cam.granted && cam.canAskAgain) void requestCam();
  }, [cam, requestCam]);
  React.useEffect(() => {
    if (cam?.granted && mic && !mic.granted && mic.canAskAgain) void requestMic();
  }, [cam?.granted, mic, requestMic]);
  React.useEffect(() => {
    const check = () =>
      void Network.getNetworkStateAsync()
        .then((s) => setNet(s.isConnected && s.isInternetReachable !== false ? 'ok' : 'ko'))
        .catch(() => setNet('ko'));
    check();
    const sub = Network.addNetworkStateListener(check);
    return () => sub.remove();
  }, []);

  const camState: CheckState = !cam ? 'pending' : cam.granted ? 'ok' : cam.canAskAgain ? 'pending' : 'ko';
  const micState: CheckState = !mic ? 'pending' : mic.granted ? 'ok' : mic.canAskAgain ? 'pending' : 'ko';
  const ready = camState === 'ok' && micState === 'ok' && net === 'ok';
  const blocked = camState === 'ko' || micState === 'ko';
  React.useEffect(() => onReadyChange(ready), [ready, onReadyChange]);

  return (
    <>
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        {ready ? (
          <View style={{ width: 72, height: 72, borderRadius: 9999, backgroundColor: t.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={36} color="#fff" strokeWidth={2.5} />
          </View>
        ) : (
          <IdnLottie name="loader" size={72} loop />
        )}
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ marginTop: 16, fontSize: 20, fontWeight: '600', color: t.ink, textAlign: 'center' }}>
          {ready ? 'Tout est prêt' : 'Vérification de ton équipement'}
        </Text>
        <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: t.muted, textAlign: 'center' }}>
          Autorise l’accès à la caméra et au micro si ton téléphone le demande.
        </Text>
      </View>
      <Card style={{ marginTop: 20 }}>
        <CheckRow icon="camera" title="Caméra" sub={camState === 'ok' ? 'Accès autorisé' : camState === 'ko' ? 'Accès refusé' : 'En attente d’autorisation'} state={camState} />
        <CheckRow icon="mic" title="Micro" sub={micState === 'ok' ? 'Accès autorisé' : micState === 'ko' ? 'Accès refusé' : 'En attente d’autorisation'} state={micState} />
        <CheckRow icon="wifi" title="Connexion" sub={net === 'ok' ? 'Internet joignable' : net === 'ko' ? 'Pas de connexion' : 'Test en cours…'} state={net} />
      </Card>
      {blocked ? (
        <IdnButton t={t} variant="secondary" full onPress={() => void Linking.openSettings()} style={{ marginTop: 12 }}>
          Ouvrir les réglages du téléphone
        </IdnButton>
      ) : null}
      <Note>L’entretien se déroule avec un contrôleur habilité. La vidéo n’est pas enregistrée.</Note>
    </>
  );
}
