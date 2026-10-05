import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { Icon } from '@/design/icons';
import { IdnButton } from '@/design/components/idn-button';
import { ErrorNote } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';

export type CapturedImage = { uri: string; mimeType: string };

type Props = {
  kind: 'doc' | 'face';
  /** Image déjà enregistrée côté serveur (reprise d'un dossier). */
  existingUri?: string | null;
  /** Envoie l'image au backend ; une erreur levée est affichée telle quelle. */
  onUpload: (image: CapturedImage) => Promise<void>;
  onContinue: () => void;
  continueLabel?: string;
};

type Phase = 'ready' | 'capturing' | 'uploading' | 'captured';

/**
 * Prise de vue d'une étape KYC (prototype « kyc ») : viseur noir de 280 px
 * avec la caméra en direct, cadre pointillé (carte) ou ovale (visage).
 * Sans caméra (simulateur, permission refusée), l'import depuis la galerie
 * prend le relais : la démarche reste possible.
 */
export function CaptureStep({ kind, existingUri, onUpload, onContinue, continueLabel = 'Continuer' }: Props) {
  const t = useIdnTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = React.useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>(existingUri ? 'captured' : 'ready');
  const [preview, setPreview] = React.useState<string | null>(existingUri ?? null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
  }, [permission, requestPermission]);

  async function upload(image: CapturedImage) {
    setPhase('uploading');
    try {
      await onUpload(image);
      setPreview(image.uri);
      setPhase('captured');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi de la photo impossible. Réessaie.');
      setPhase('ready');
    }
  }

  async function takePhoto() {
    setError(null);
    if (!camera.current || !cameraReady) {
      await importPhoto();
      return;
    }
    setPhase('capturing');
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (!photo?.uri) throw new Error('La photo n’a pas pu être prise.');
      await upload({ uri: photo.uri, mimeType: 'image/jpeg' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La photo n’a pas pu être prise.');
      setPhase('ready');
    }
  }

  async function importPhoto() {
    setError(null);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    await upload({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
  }

  function retake() {
    setPreview(null);
    setPhase('ready');
  }

  const showCamera = phase !== 'captured' && permission?.granted;
  return (
    <View>
      <View
        style={{ marginTop: 20, height: 280, borderRadius: 20, backgroundColor: '#0E110D', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
        accessible
        accessibilityLabel={kind === 'doc' ? 'Viseur : place la carte dans le cadre' : 'Viseur : place ton visage dans l’ovale'}
      >
        {showCamera ? (
          <CameraView
            ref={camera}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            facing={kind === 'face' ? 'front' : 'back'}
            onCameraReady={() => setCameraReady(true)}
            onMountError={() => setCameraReady(false)}
          />
        ) : null}
        {preview && phase === 'captured' ? (
          <Image source={{ uri: preview }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
        ) : null}
        {phase !== 'captured' ? (
          kind === 'doc' ? (
            <View style={{ width: '72%', height: 140, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}>
              {!cameraReady && phase === 'ready' ? <Icon name="idCard" size={34} color="rgba(255,255,255,0.8)" /> : null}
            </View>
          ) : (
            <View style={{ width: 170, height: 220, borderRadius: 110, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' }}>
              {!cameraReady && phase === 'ready' ? <Icon name="scanFace" size={34} color="rgba(255,255,255,0.8)" /> : null}
            </View>
          )
        ) : null}
        {phase === 'capturing' || phase === 'uploading' ? (
          <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(14,17,13,0.55)' }}>
            <IdnLottie name="scan" size={180} loop />
          </View>
        ) : null}
      </View>

      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
        {phase === 'captured' ? (
          <>
            <Icon name="checkCir" size={16} color={t.greenText} />
            <Text style={{ fontSize: 13, color: t.greenText, fontWeight: '500' }}>Photo enregistrée. Vérifie qu’elle est nette, sans reflet.</Text>
          </>
        ) : phase === 'capturing' ? (
          <Text style={{ fontSize: 13, color: t.muted }}>Ne bouge pas…</Text>
        ) : phase === 'uploading' ? (
          <>
            <ActivityIndicator size="small" color={t.green} />
            <Text style={{ fontSize: 13, color: t.muted }}>Envoi chiffré…</Text>
          </>
        ) : (
          <>
            <Icon name="lock" size={14} color={t.muted} />
            <Text style={{ fontSize: 13, color: t.muted }}>Les images sont chiffrées pendant l’envoi.</Text>
          </>
        )}
      </View>
      <ErrorNote>{error}</ErrorNote>

      <View style={{ gap: 8, marginTop: 20 }}>
        {phase === 'captured' ? (
          <>
            <IdnButton t={t} full onPress={onContinue}>{continueLabel}</IdnButton>
            <IdnButton t={t} variant="ghost" full onPress={retake}>Reprendre</IdnButton>
          </>
        ) : (
          <>
            <IdnButton t={t} full onPress={takePhoto} loading={phase !== 'ready'} leadIcon={<Icon name="camera" size={18} color="#fff" />}>
              Prendre la photo
            </IdnButton>
            <IdnButton t={t} variant="ghost" full onPress={importPhoto} disabled={phase !== 'ready'}>Importer depuis la galerie</IdnButton>
          </>
        )}
      </View>
    </View>
  );
}
