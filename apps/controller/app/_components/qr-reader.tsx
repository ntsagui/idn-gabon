"use client"

import * as React from "react"
import { CameraIcon, CameraOffIcon } from "lucide-react"

import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

type Detector = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>> }
type DetectorCtor = new (options: { formats: string[] }) => Detector
type JsQr = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null

type CameraState = "idle" | "starting" | "scanning" | "denied" | "unavailable"

const SCAN_INTERVAL_MS = 150

/**
 * Lecteur de QR par la caméra du poste. Utilise `BarcodeDetector` quand le
 * navigateur le fournit, sinon décode les images avec jsQR. La caméra ne
 * s'allume que sur demande de l'agent et s'éteint en quittant la page.
 */
export function QrReader({
  onDetected,
  paused = false,
  className,
}: {
  onDetected: (value: string) => void
  paused?: boolean
  className?: string
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [state, setState] = React.useState<CameraState>("idle")
  const [running, setRunning] = React.useState(false)
  const onDetectedRef = React.useRef(onDetected)
  const pausedRef = React.useRef(paused)
  React.useEffect(() => {
    onDetectedRef.current = onDetected
    pausedRef.current = paused
  })

  React.useEffect(() => {
    if (!running) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    let last = { value: "", at: 0 }

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("unavailable")
        setRunning(false)
        return
      }
      setState("starting")
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      } catch (error) {
        if (cancelled) return
        setState(error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "unavailable")
        setRunning(false)
        return
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => undefined)
      setState("scanning")

      const Native = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
      const detector = Native ? new Native({ formats: ["qr_code"] }) : null
      const jsQR: JsQr | null = detector ? null : ((await import("jsqr")).default as unknown as JsQr)
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d", { willReadFrequently: true })

      const tick = async () => {
        if (cancelled) return
        if (!pausedRef.current && video.readyState >= 2 && video.videoWidth > 0) {
          let value: string | null = null
          try {
            if (detector) {
              value = (await detector.detect(video))[0]?.rawValue ?? null
            } else if (jsQR && context) {
              const scale = Math.min(1, 720 / video.videoWidth)
              canvas.width = Math.round(video.videoWidth * scale)
              canvas.height = Math.round(video.videoHeight * scale)
              context.drawImage(video, 0, 0, canvas.width, canvas.height)
              const image = context.getImageData(0, 0, canvas.width, canvas.height)
              value = jsQR(image.data, image.width, image.height)?.data ?? null
            }
          } catch {
            value = null
          }
          const now = Date.now()
          if (value && (value !== last.value || now - last.at > 4000)) {
            last = { value, at: now }
            onDetectedRef.current(value)
          }
        }
        timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS)
      }
      void tick()
    }
    void start()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [running])

  const stop = () => {
    setRunning(false)
    setState("idle")
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-idn-border bg-idn-surface", className)}>
      <div className="relative aspect-[4/3] bg-[#10120e]">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Image de la caméra"
          className={cn("absolute inset-0 size-full object-cover", state !== "scanning" && "invisible")}
        />
        {state === "scanning" && (
          <div aria-hidden className="pointer-events-none absolute inset-[14%] rounded-lg">
            {["left-0 top-0 border-l-[3px] border-t-[3px]", "right-0 top-0 border-r-[3px] border-t-[3px]", "bottom-0 left-0 border-b-[3px] border-l-[3px]", "bottom-0 right-0 border-b-[3px] border-r-[3px]"].map(
              (corner) => (
                <span key={corner} className={cn("absolute size-8 rounded-[3px] border-white/90", corner)} />
              ),
            )}
          </div>
        )}
        {state !== "scanning" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-[#F2F0E8]">
            {state === "denied" || state === "unavailable" ? (
              <CameraOffIcon aria-hidden className="size-8 opacity-80" />
            ) : (
              <CameraIcon aria-hidden className="size-8 opacity-80" />
            )}
            <p className="max-w-[36ch] text-sm">
              {state === "starting"
                ? "Autorisation de la caméra…"
                : state === "denied"
                  ? "L'accès à la caméra est refusé. Autorisez-le dans les réglages du navigateur, ou utilisez la saisie du code."
                  : state === "unavailable"
                    ? "Aucune caméra disponible sur ce poste. Utilisez la saisie du code ou une douchette."
                    : "Activez la caméra puis présentez le QR dans le cadre."}
            </p>
            {(state === "idle" || state === "denied") && (
              <Button variant="secondary" onClick={() => setRunning(true)}>
                <CameraIcon aria-hidden />
                Activer la caméra
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3 border-t border-idn-border px-4 py-2">
        <p role="status" className="text-[13px] text-idn-muted">
          {state === "scanning" ? (paused ? "Lecture en pause" : "Recherche d'un QR…") : "Caméra éteinte"}
        </p>
        {state === "scanning" && (
          <Button variant="ghost" size="sm" onClick={stop}>
            Éteindre la caméra
          </Button>
        )}
      </div>
    </div>
  )
}
