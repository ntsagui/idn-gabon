"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ErrorNote, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { Stepper } from "@/app/_components/idn/stepper"
import { KYC_STEPS, kycPostSubmitRoute } from "@/lib/citizen/kyc-flow"

import { CaptureStep } from "../_components/capture-step"
import { errorMessage, uploadToStorage, useKycFlow } from "../_components/flow"

/** KYC · selfie puis envoi du dossier (prototype « kyc », étapes 3 et 4). */
export default function KycSelfiePage() {
  return (
    <React.Suspense fallback={null}>
      <KycSelfie />
    </React.Suspense>
  )
}

function KycSelfie() {
  const router = useRouter()
  const flow = useKycFlow()
  const targetLoa = flow.target === 3 ? 3 : 2
  const active = useQuery(api.kyc.getActiveRequest)
  const generateUploadUrl = useMutation(api.kyc.generateUploadUrl)
  const setSelfie = useMutation(api.kyc.setSelfie)
  const submit = useMutation(api.kyc.submit)
  const respondComplement = useMutation(api.kyc.respondComplement)
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const editable = active?.status === "pending" || active?.status === "complement_required" ? active : null

  async function upload(image: Blob) {
    if (!editable?._id) throw new Error("Prends d’abord le recto et le verso de ta pièce.")
    try {
      const storageRef = await uploadToStorage(await generateUploadUrl({}), image)
      await setSelfie({ kycRequestId: editable._id, storageRef })
    } catch (err) {
      throw new Error(errorMessage(err, "Envoi de la photo impossible. Réessaie."))
    }
  }

  async function send() {
    if (!editable?._id) return
    setSending(true)
    setError(null)
    try {
      const wasComplement = editable.status === "complement_required"
      if (wasComplement) await respondComplement({ kycRequestId: editable._id })
      else await submit({ kycRequestId: editable._id })
      // Parcours délégué : l'app partenaire reprend la main dès l'envoi et suit l'avancement.
      if (flow.returnTo) {
        window.location.assign(flow.returnTo)
        return
      }
      const destination = kycPostSubmitRoute(targetLoa, wasComplement)
      router.replace(destination === "level3" ? "/kyc/level3" : "/kyc/review")
    } catch (err) {
      setError(errorMessage(err, "Envoi du dossier impossible."))
      setSending(false)
    }
  }

  return (
    <Screen
      header={
        <AppBar
          title="Vérification d’identité"
          back={sending ? undefined : flow.href("/kyc/doc", { target: String(targetLoa), side: "back" })}
        />
      }
      subHeader={<Stepper steps={KYC_STEPS} current={sending ? 3 : 2} />}
    >
      {sending ? (
        <div className="mt-[60px] flex flex-col items-center text-center" aria-live="polite">
          <IdnLottie name="loader" size={120} loop label="Envoi en cours" />
          <p className="mt-3 text-lg font-semibold text-idn-ink">Envoi chiffré…</p>
          <p className="mt-1 text-sm text-idn-muted">Ne ferme pas la page.</p>
        </div>
      ) : (
        <>
          <ScreenTitle
            title="Ton selfie"
            lead="Regarde l’objectif, visage dégagé, sans lunettes de soleil. Il sera comparé à la photo de ta pièce."
          />
          {active === undefined ? null : (
            <CaptureStep kind="face" existingUri={editable?.selfieUrl} onUpload={upload} onContinue={() => void send()} continueLabel="Envoyer mon dossier" />
          )}
          <ErrorNote>{error}</ErrorNote>
          {!editable && active !== undefined ? (
            <IdnButton variant="ghost" full className="mt-2" href={flow.href("/kyc/doc", { target: String(targetLoa) })} replace>
              Reprendre au recto
            </IdnButton>
          ) : null}
        </>
      )}
    </Screen>
  )
}
