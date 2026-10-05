"use client"

import * as React from "react"
import { useConvexConnectionState } from "convex/react"

import { cn } from "@repo/ui/lib/utils"

import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, IconTile, Note } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"

type CheckState = "pending" | "ok" | "ko"
type Device = { state: CheckState; reason?: "denied" | "missing" }

function CheckRow({ icon, title, sub, state }: { icon: "camera" | "mic" | "wifi"; title: string; sub: React.ReactNode; state: CheckState }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2.5">
      <IconTile icon={icon} tone={state === "ok" ? "green" : state === "ko" ? "red" : "neutral"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-idn-ink">{title}</p>
        <div className="text-[13px] text-idn-muted">{sub}</div>
      </div>
      {state === "ok" ? (
        <Badge tone="green" icon="check">
          Prêt
        </Badge>
      ) : state === "ko" ? (
        <Badge tone="red">À régler</Badge>
      ) : (
        <span
          role="status"
          aria-label="En cours"
          className="size-4 animate-spin rounded-full border-2 border-idn-muted border-r-transparent motion-reduce:animate-none"
        />
      )}
    </div>
  )
}

function failure(err: unknown): Device {
  const name = err instanceof DOMException ? err.name : ""
  return { state: "ko", reason: name === "NotAllowedError" || name === "SecurityError" ? "denied" : "missing" }
}

function useOnline() {
  return React.useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb)
      window.addEventListener("offline", cb)
      return () => {
        window.removeEventListener("online", cb)
        window.removeEventListener("offline", cb)
      }
    },
    () => navigator.onLine,
    () => true
  )
}

/**
 * Salle d'attente (prototype « l3-waiting ») : vérifie pour de vrai la caméra
 * (aperçu), le micro (niveau sonore mesuré) et le réseau (connexion au
 * serveur IDN) avant d'autoriser l'entrée en visio. Les flux sont coupés en
 * quittant l'écran, pour libérer la caméra avant la visio.
 */
export function Level3Waiting({ onReadyChange }: { onReadyChange: (ready: boolean) => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [cam, setCam] = React.useState<Device>({ state: "pending" })
  const [mic, setMic] = React.useState<Device>({ state: "pending" })
  const [level, setLevel] = React.useState(0)
  const [attempt, setAttempt] = React.useState(0)
  const online = useOnline()
  const connection = useConvexConnectionState()

  React.useEffect(() => {
    let cancelled = false
    const streams: MediaStream[] = []
    let audio: AudioContext | null = null
    let frame = 0
    const video = videoRef.current

    async function open(constraints: MediaStreamConstraints) {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop())
        throw new DOMException("annulé", "AbortError")
      }
      streams.push(stream)
      return stream
    }

    function showVideo(stream: MediaStream) {
      if (!video) return
      video.srcObject = stream
      void video.play().catch(() => undefined)
    }

    function measure(stream: MediaStream) {
      audio = new AudioContext()
      const analyser = audio.createAnalyser()
      analyser.fftSize = 512
      audio.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      let last = 0
      const tick = (t: number) => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const v of data) sum += ((v - 128) / 128) ** 2
        if (t - last > 100) {
          last = t
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4))
        }
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      // Sans geste récent de l'usager, le navigateur peut suspendre l'audio.
      if (audio.state === "suspended") void audio.resume().catch(() => undefined)
    }

    async function run() {
      setCam({ state: "pending" })
      setMic({ state: "pending" })
      if (!navigator.mediaDevices?.getUserMedia) {
        setCam({ state: "ko", reason: "missing" })
        setMic({ state: "ko", reason: "missing" })
        return
      }
      try {
        const both = await open({ video: { facingMode: "user" }, audio: true })
        showVideo(both)
        measure(both)
        setCam({ state: "ok" })
        setMic({ state: "ok" })
        return
      } catch (err) {
        if (cancelled) return
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setCam(failure(err))
          setMic(failure(err))
          return
        }
      }
      // Un des deux périphériques manque : on teste chacun séparément.
      try {
        showVideo(await open({ video: { facingMode: "user" } }))
        setCam({ state: "ok" })
      } catch (err) {
        if (!cancelled) setCam(failure(err))
      }
      try {
        measure(await open({ audio: true }))
        setMic({ state: "ok" })
      } catch (err) {
        if (!cancelled) setMic(failure(err))
      }
    }

    void run()
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      streams.forEach((s) => s.getTracks().forEach((t) => t.stop()))
      if (video) video.srcObject = null
      void audio?.close().catch(() => undefined)
    }
  }, [attempt])

  const net: CheckState = !online ? "ko" : connection.isWebSocketConnected ? "ok" : "pending"
  const ready = cam.state === "ok" && mic.state === "ok" && net === "ok"
  const blocked = cam.state === "ko" || mic.state === "ko"
  React.useEffect(() => onReadyChange(ready), [ready, onReadyChange])

  const deviceSub = (d: Device, missing: string) =>
    d.state === "ok" ? "Accès autorisé" : d.state === "ko" ? (d.reason === "missing" ? missing : "Accès refusé") : "En attente d’autorisation"

  return (
    <>
      <div className="mt-6 flex flex-col items-center text-center">
        {ready ? (
          <span className="flex size-[72px] items-center justify-center rounded-full bg-idn-green text-white">
            <Icon name="check" size={36} strokeWidth={2.5} />
          </span>
        ) : (
          <IdnLottie name="loader" size={72} loop label="Vérification en cours" />
        )}
        <h2 aria-live="polite" className="mt-4 text-xl font-semibold text-idn-ink">
          {ready ? "Tout est prêt" : "Vérification de ton équipement"}
        </h2>
        <p className="mt-1 text-sm leading-5 text-idn-muted">Autorise l’accès à la caméra et au micro si ton navigateur le demande.</p>
      </div>

      <div className="relative mx-auto mt-5 aspect-video w-full max-w-[480px] overflow-hidden rounded-[14px] bg-[#0E110D]">
        <video ref={videoRef} muted playsInline autoPlay aria-label="Aperçu de ta caméra" className={cn("size-full -scale-x-100 object-cover", cam.state !== "ok" && "invisible")} />
        {cam.state !== "ok" ? (
          <span className="absolute inset-0 flex items-center justify-center text-white/70" aria-hidden>
            <Icon name="videoOff" size={28} />
          </span>
        ) : null}
      </div>

      <Card className="mt-5">
        <CheckRow icon="camera" title="Caméra" sub={deviceSub(cam, "Aucune caméra détectée")} state={cam.state} />
        <CheckRow
          icon="mic"
          title="Micro"
          state={mic.state}
          sub={
            mic.state === "ok" ? (
              <span className="flex items-center gap-2">
                <span>Parle pour tester</span>
                <span
                  role="meter"
                  aria-label="Niveau sonore du micro"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(level * 100)}
                  className="h-1.5 w-20 overflow-hidden rounded-full bg-idn-border"
                >
                  <span className="block h-full rounded-full bg-idn-green" style={{ width: `${Math.round(level * 100)}%` }} />
                </span>
              </span>
            ) : (
              deviceSub(mic, "Aucun micro détecté")
            )
          }
        />
        <CheckRow icon="wifi" title="Connexion" sub={net === "ok" ? "Internet joignable" : net === "ko" ? "Pas de connexion" : "Test en cours…"} state={net} />
      </Card>
      {blocked ? (
        <>
          <Note>Autorise la caméra et le micro dans les réglages de ton navigateur (icône à gauche de l’adresse), puis réessaie.</Note>
          <IdnButton variant="secondary" full className="mt-3" onClick={() => setAttempt((n) => n + 1)}>
            Réessayer
          </IdnButton>
        </>
      ) : null}
      <Note>L’entretien se déroule avec un contrôleur habilité. La vidéo n’est pas enregistrée.</Note>
    </>
  )
}
