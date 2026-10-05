import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { AppBar } from '@/design/components/app-bar';
import { Screen } from '@/design/components/screen';
import { Stepper } from '@/design/components/stepper';
import { ScreenTitle } from '@/design/components/list';
import { CaptureStep, type CapturedImage } from '@/components/kyc/capture-step';
import { api } from '@/lib/api';
import { uploadToStorage } from '@/lib/storage-upload';
import { KYC_STEPS } from '@/lib/kyc-flow';
import type { Id } from '@repo/backend/convex/_generated/dataModel';

/** KYC · recto puis verso de la CNI (prototype « kyc », étapes 1 et 2). */
export default function KycDoc() {
  const router = useRouter();
  const { target } = useLocalSearchParams<{ target?: string }>();
  const targetLoa = target === '3' ? 3 : 2;
  const { isAuthenticated } = useConvexAuth();
  const active = useQuery(api.kyc.getActiveRequest, isAuthenticated ? {} : 'skip');
  const requestVerification = useMutation(api.verification.request);
  const generateUploadUrl = useMutation(api.kyc.generateUploadUrl);
  const setDocumentImage = useMutation(api.kyc.setDocumentImage);
  const [side, setSide] = useState<'front' | 'back'>('front');

  const editable = active?.status === 'pending' || active?.status === 'complement_required' ? active : null;

  async function ensureRequest(): Promise<Id<'kycRequest'>> {
    if (editable?._id) return editable._id;
    const result = await requestVerification({ targetLoa, documentType: 'cni_gabon' });
    if (!result.kycRequestId) throw new Error('Aucune demande de vérification n’a pu être ouverte.');
    return result.kycRequestId;
  }

  async function upload(image: CapturedImage) {
    const kycRequestId = await ensureRequest();
    const storageRef = await uploadToStorage(await generateUploadUrl({}), image.uri, image.mimeType);
    await setDocumentImage({ kycRequestId, side, storageRef });
  }

  const isFront = side === 'front';
  return (
    <Screen
      header={<AppBar title="Vérification d’identité" onBack={() => (isFront ? router.back() : setSide('front'))} />}
      subHeader={<Stepper steps={KYC_STEPS} current={isFront ? 0 : 1} />}
    >
      <ScreenTitle
        title={isFront ? 'Recto de ta CNI' : 'Verso de ta CNI'}
        lead={isFront ? 'Place la face avec ta photo dans le cadre. Évite les reflets.' : 'Retourne la carte. Toute la face doit être visible et lisible.'}
      />
      <CaptureStep
        key={side}
        kind="doc"
        existingUri={isFront ? editable?.docFrontUrl : editable?.docBackUrl}
        onUpload={upload}
        onContinue={() => (isFront ? setSide('back') : router.push(`/kyc/selfie?target=${targetLoa}` as never))}
      />
    </Screen>
  );
}
