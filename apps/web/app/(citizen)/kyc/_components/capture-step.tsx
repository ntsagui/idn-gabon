"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"

type Props = {
  kind: "doc" | "face"
  /** Image déjà enregistrée côté serveur (reprise d'un dossier). */
  existingUri?: string | null
  /** Envoie l'image au backend ; une erreur levée est affichée telle quelle. */
  onUpload: (image: Blob) => Promise<void>
  onContinue: () => void
  continueLabel?: string
}

type Phase = "ready" | "capturing" | "uploading" | "captured"
type CameraState = "starting" | "live" | "denied" | "unavailable"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE = 8 * 1024 * 1024
const MAX_SIDE = 1600

/**
 * Prise de vue d'une étape KYC (transposition de
 * apps/mobile/src/components/kyc/capture-step.tsx) : viseur noir avec la
 * caméra du navigateur (`getUserMedia`, arrière pour la pièce, frontale pour
 * le selfie), cadre pointillé (carte) ou ovale (visage). Sans caméra
 * (ordinateur sans webcam, permission refusée), l'import d'une photo prend le
 * relais : la démarche reste possible.
 */
export function CaptureStep({ kind, existingUri, onUpload, onContinue, continueLabel = "Continuer" }: Props) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const captureInput = React.useRef<HTMLInputElement>(null)
  const importInput = React.useRef<HTMLInputElement>(null)
  const [phase, setPhase] = React.useState<Phase>(existingUri ? "captured" : "ready")
  const [preview, setPreview] = React.useState<string | null>(existingUri ?? null)
  const [camera, setCamera] = React.useState<CameraState>("starting")
  const [error, setError] = React.useState<string | null>(null)
  const [attempt, setAttempt] = React.useState(0)
  const wantsCamera = phase !== "captured"

  // Caméra en direct tant qu'aucune photo n'est retenue ; coupée dès qu'elle l'est.
  React.useEffect(() => {
    if (!wantsCamera) return
    let cancelled = false
    let stream: MediaStream | null = null
    const video = videoRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unavailable")
      return
    }
    setCamera("starting")
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: kind === "face" ? "user" : { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (video) {
          video.srcObject = s
          void video.play().catch(() => undefined)
        }
        setCamera("live")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const name = err instanceof DOMException ? err.name : ""
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable")
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      if (video) video.srcObject = null
    }
  }, [wantsCamera, kind, attempt])

  // Libère les aperçus locaux (blob:) quand ils sont remplacés.
  React.useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview)
    }
  }, [preview])

  async function upload(image: Blob) {
    setPhase("uploading")
    try {
      await onUpload(image)
      setPreview(URL.createObjectURL(image))
      setPhase("captured")
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Envoi de la photo impossible. Réessaie.")
      setPhase("ready")
    }
  }

  async function takePhoto() {
    setError(null)
    const video = videoRef.current
    if (camera !== "live" || !video || !video.videoWidth) {
      // Pas de flux en direct : appareil photo du téléphone ou choix d'un fichier.
      captureInput.current?.click()
      return
    }
    setPhase("capturing")
    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88))
    if (!blob) {
      setError("La photo n’a pas pu être prise.")
      setPhase("ready")
      return
    }
    await upload(blob)
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non pris en charge. Choisis une photo JPEG, PNG ou WebP.")
      return
    }
    if (file.size > MAX_SIZE) {
      setError("Photo trop lourde : 8 Mo au maximum.")
      return
    }
    void upload(file)
  }

  function retake() {
    setPreview(null)
    setPhase("ready")
  }

  const busy = phase === "capturing" || phase === "uploading"
  const live = camera === "live" && wantsCamera
  const frameLabel = kind === "doc" ? "Viseur : place la carte dans le cadre" : "Viseur : place ton visage dans l’ovale"

  return (
    <div>
      <div
        role="group"
        aria-label={frameLabel}
        className="relative mt-5 flex h-[280px] items-center justify-center overflow-hidden rounded-[20px] bg-[#0E110D] md:h-[360px]"
      >
        {wantsCamera ? (
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            aria-hidden
            className={cn("absolute inset-0 size-full object-cover", kind === "face" && "-scale-x-100", !live && "invisible")}
          />
        ) : null}
        {preview && phase === "captured" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={kind === "doc" ? "Photo enregistrée de ta pièce" : "Selfie enregistré"}
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        {phase !== "captured" ? (
          kind === "doc" ? (
            <div
              aria-hidden
              className="relative flex aspect-[1.586/1] w-[min(72%,420px)] items-center justify-center rounded-[14px] border-2 border-dashed border-white/80"
            >
              {!live && phase === "ready" ? <Icon name="idCard" size={34} className="text-white/80" /> : null}
            </div>
          ) : (
            <div
              aria-hidden
              className="relative flex h-[220px] w-[170px] items-center justify-center rounded-[50%] border-2 border-dashed border-white/80"
            >
              {!live && phase === "ready" ? <Icon name="scanFace" size={34} className="text-white/80" /> : null}
            </div>
          )
        ) : null}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0E110D]/55">
            <IdnLottie name="scan" size={180} label={phase === "capturing" ? "Prise de vue" : "Envoi en cours"} />
          </div>
        ) : null}
      </div>

      <div aria-live="polite" className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px]">
        {phase === "captured" ? (
          <>
            <Icon name="checkCir" size={16} className="shrink-0 text-c-green-text" />
            <span className="font-medium text-c-green-text">Photo enregistrée. Vérifie qu’elle est nette, sans reflet.</span>
          </>
        ) : phase === "capturing" ? (
          <span className="text-idn-muted">Ne bouge pas…</span>
        ) : phase === "uploading" ? (
          <>
            <span aria-hidden className="size-3.5 animate-spin rounded-full border-2 border-idn-green border-r-transparent motion-reduce:animate-none" />
            <span className="text-idn-muted">Envoi chiffré…</span>
          </>
        ) : (
          <>
            <Icon name="lock" size={14} className="shrink-0 text-idn-muted" />
            <span className="text-idn-muted">Les images sont chiffrées pendant l’envoi.</span>
          </>
        )}
      </div>

      {wantsCamera && (camera === "denied" || camera === "unavailable") ? (
        <div className="mt-3 flex flex-col items-center gap-1 text-center">
          <p className="text-[13px] leading-[19px] text-idn-muted">
            {camera === "denied"
              ? "Accès à la caméra refusé. Autorise-le dans les réglages de ton navigateur, ou importe une photo."
              : kind === "doc"
                ? "Aucune caméra disponible sur cet appareil. Importe une photo de ta pièce."
                : "Aucune caméra disponible sur cet appareil. Importe un selfie pris avec ton téléphone."}
          </p>
          {camera === "denied" ? (
            <IdnButton variant="quiet" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              Réessayer la caméra
            </IdnButton>
          ) : null}
        </div>
      ) : null}
      <ErrorNote>{error}</ErrorNote>

      <input
        ref={captureInput}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        capture={kind === "face" ? "user" : "environment"}
        onChange={onFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <input
        ref={importInput}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={onFile}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      <div className="mt-5 flex flex-col gap-2">
        {phase === "captured" ? (
          <>
            <IdnButton full onClick={onContinue}>
              {continueLabel}
            </IdnButton>
            <IdnButton variant="ghost" full onClick={retake}>
              Reprendre
            </IdnButton>
          </>
        ) : (
          <>
            <IdnButton full onClick={() => void takePhoto()} loading={phase !== "ready"} leadIcon={<Icon name="camera" size={18} />}>
              Prendre la photo
            </IdnButton>
            <IdnButton
              variant="ghost"
              full
              disabled={phase !== "ready"}
              onClick={() => {
                setError(null)
                importInput.current?.click()
              }}
            >
              Importer une photo
            </IdnButton>
          </>
        )}
      </div>
    </div>
  )
}
