"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { ScreenTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { Stepper } from "@/app/_components/idn/stepper"
import { KYC_STEPS } from "@/lib/citizen/kyc-flow"

import { CaptureStep } from "../_components/capture-step"
import { errorMessage, uploadToStorage, useKycFlow } from "../_components/flow"

/** KYC · recto puis verso de la CNI (prototype « kyc », étapes 1 et 2). */
export default function KycDocPage() {
  return (
    <React.Suspense fallback={null}>
      <KycDoc />
    </React.Suspense>
  )
}

function KycDoc() {
  const router = useRouter()
  const flow = useKycFlow()
  const side = useSearchParams().get("side") === "back" ? "back" : "front"
  const targetLoa = flow.target === 3 ? 3 : 2
  const active = useQuery(api.kyc.getActiveRequest)
  const requestVerification = useMutation(api.verification.request)
  const generateUploadUrl = useMutation(api.kyc.generateUploadUrl)
  const setDocumentImage = useMutation(api.kyc.setDocumentImage)

  const editable = active?.status === "pending" || active?.status === "complement_required" ? active : null

  async function ensureRequest(): Promise<Id<"kycRequest">> {
    if (active === undefined) throw new Error("Chargement de ton dossier en cours. Réessaie dans un instant.")
    if (editable?._id) return editable._id
    const result = await requestVerification({ targetLoa, documentType: "cni_gabon" })
    if (!result.kycRequestId) throw new Error("Aucune demande de vérification n’a pu être ouverte.")
    return result.kycRequestId
  }

  async function upload(image: Blob) {
    try {
      const kycRequestId = await ensureRequest()
      const storageRef = await uploadToStorage(await generateUploadUrl({}), image)
      await setDocumentImage({ kycRequestId, side, storageRef })
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi de la photo impossible. Réessaie."))
    }
  }

  const isFront = side === "front"
  return (
    <Screen
      header={
        <AppBar
          title="Vérification d’identité"
          back={isFront ? flow.href("/kyc/intro") : flow.href("/kyc/doc", { target: String(targetLoa) })}
        />
      }
      subHeader={<Stepper steps={KYC_STEPS} current={isFront ? 0 : 1} />}
    >
      <ScreenTitle
        title={isFront ? "Recto de ta CNI" : "Verso de ta CNI"}
        lead={isFront ? "Place la face avec ta photo dans le cadre. Évite les reflets." : "Retourne la carte. Toute la face doit être visible et lisible."}
      />
      {active === undefined ? null : (
        <CaptureStep
          key={side}
          kind="doc"
          existingUri={isFront ? editable?.docFrontUrl : editable?.docBackUrl}
          onUpload={upload}
          onContinue={() =>
            router.push(
              isFront
                ? flow.href("/kyc/doc", { target: String(targetLoa), side: "back" })
                : flow.href("/kyc/selfie", { target: String(targetLoa) })
            )
          }
        />
      )}
    </Screen>
  )
}
