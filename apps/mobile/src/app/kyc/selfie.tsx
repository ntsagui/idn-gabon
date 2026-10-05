import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { Text } from '@/design/text';
import { useIdnTheme } from '@/design/theme';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Stepper } from '@/design/components/stepper';
import { IdnButton } from '@/design/components/idn-button';
import { ErrorNote, ScreenTitle } from '@/design/components/list';
import { IdnLottie } from '@/design/components/lottie';
import { CaptureStep, type CapturedImage } from '@/components/kyc/capture-step';
import { api } from '@/lib/api';
import { KYC_STEPS, kycPostSubmitRoute } from '@/lib/kyc-flow';
import { uploadToStorage } from '@/lib/storage-upload';

/** KYC · selfie puis envoi du dossier (prototype « kyc », étapes 3 et 4). */
export default function KycSelfie() {
  const t = useIdnTheme();
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const targetLoa = target === '3' ? 3 : 2;
  const { isAuthenticated } = useConvexAuth();
  const active = useQuery(api.kyc.getActiveRequest, isAuthenticated ? {} : 'skip');
  const generateUploadUrl = useMutation(api.kyc.generateUploadUrl);
  const setSelfie = useMutation(api.kyc.setSelfie);
  const submit = useMutation(api.kyc.submit);
  const respondComplement = useMutation(api.kyc.respondComplement);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(image: CapturedImage) {
    if (!active?._id) throw new Error('Prends d’abord le recto et le verso de ta pièce.');
    const storageRef = await uploadToStorage(await generateUploadUrl({}), image.uri, image.mimeType);
    await setSelfie({ kycRequestId: active._id, storageRef });
  }

  async function send() {
    if (!active?._id) return;
    setSending(true);
    setError(null);
    try {
      const wasComplement = active.status === 'complement_required';
      if (wasComplement) await respondComplement({ kycRequestId: active._id });
      else await submit({ kycRequestId: active._id });
      const destination = kycPostSubmitRoute(targetLoa, wasComplement);
      router.replace((destination === 'level3' ? '/kyc/level3' : '/kyc/review') as never);
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data;
      setError(data?.message ?? (err instanceof Error ? err.message : 'Envoi du dossier impossible.'));
      setSending(false);
    }
  }

  return (
    <Screen
      header={<AppBar title="Vérification d’identité" onBack={sending ? undefined : () => router.back()} />}
      subHeader={<Stepper steps={KYC_STEPS} current={sending ? 3 : 2} />}
    >
      {sending ? (
        <View style={{ alignItems: 'center', marginTop: 60 }}>
          <IdnLottie name="loader" size={120} loop label="Envoi en cours" />
          <Text style={{ marginTop: 12, fontSize: 18, fontWeight: '600', color: t.ink }}>Envoi chiffré…</Text>
          <Text style={{ marginTop: 4, fontSize: 14, color: t.muted }}>Ne ferme pas l’application.</Text>
        </View>
      ) : (
        <>
          <ScreenTitle title="Ton selfie" lead="Regarde l’objectif, visage dégagé, sans lunettes de soleil. Il sera comparé à la photo de ta pièce." />
          <CaptureStep kind="face" existingUri={active?.selfieUrl} onUpload={upload} onContinue={send} continueLabel="Envoyer mon dossier" />
          <ErrorNote>{error}</ErrorNote>
          {!active?._id && active !== undefined ? (
            <IdnButton t={t} variant="ghost" full onPress={() => router.replace(`/kyc/doc?target=${targetLoa}` as never)} style={{ marginTop: 8 }}>
              Reprendre au recto
            </IdnButton>
          ) : null}
        </>
      )}
    </Screen>
  );
}
