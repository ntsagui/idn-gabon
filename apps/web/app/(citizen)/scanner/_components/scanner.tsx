"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Card, DetailRow, ErrorNote, Note } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { classifyScan } from "@/lib/citizen/scan-target"
import {
  formatActDate,
  formatVerificationCodeForDisplay,
  isFoundVerifyResult,
  normalizeVerificationCode,
  parseVerifyResponse,
  verifyEndpoints,
  verifyResultTitle,
  type VerifyResult,
} from "@/lib/official-act-verification"

type State =
  | { view: "scan" }
  | { view: "manual" }
  | { view: "verifying"; code: string }
  | { view: "act"; code: string; result: VerifyResult }
  | { view: "device"; code: string }
  | { view: "device-done" }
  | { view: "presentation" }
  | { view: "unknown" }

/** Lecteur de QR du navigateur (API Shape Detection), absent de Firefox et Safari. */
type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type DetectorCtor = new (opts: { formats: string[] }) => Detector

/** Pourquoi la caméra ne lit pas : navigateur sans lecteur, refus, pas de caméra. */
type CameraState = "starting" | "on" | "unsupported" | "denied" | "unavailable"

/**
 * Scanner (apps/mobile/src/app/scanner.tsx) : vérifier un acte officiel ou
 * connecter un autre appareil. La caméra lit le QR quand le navigateur sait
 * le faire (`BarcodeDetector`) ; sinon on saisit le code imprimé sous le QR.
 */
export function Scanner({ apiBaseUrl }: { apiBaseUrl: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const approveSession = useMutation(api.crossDevice.approveSession)
  const cancelSession = useMutation(api.crossDevice.cancelSession)
  const [state, setState] = React.useState<State>({ view: "scan" })
  const [manual, setManual] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const handled = React.useRef(false)
  const deviceStatus = useQuery(api.crossDevice.getStatus, state.view === "device" ? { sessionCode: state.code } : "skip")

  // La saisie du code est une adresse à part (`?saisie=1`) : le retour du navigateur ramène au viseur.
  const manualMode = params.get("saisie") === "1"

  const verifyAct = React.useCallback(
    async (code: string) => {
      setState({ view: "verifying", code })
      if (new URLSearchParams(window.location.search).has("saisie")) router.replace("/scanner")
      const endpoints = verifyEndpoints(apiBaseUrl, code)
      if (!endpoints) return setState({ view: "act", code, result: { kind: "unknown" } })
      try {
        const res = await fetch(endpoints.statusUrl, { headers: { Accept: "application/json" } })
        const body: unknown = await res.json().catch(() => null)
        setState({ view: "act", code, result: parseVerifyResponse(res.status, body) })
      } catch {
        setState({ view: "act", code, result: { kind: "error" } })
      }
    },
    [apiBaseUrl, router]
  )

  const onScanned = React.useCallback(
    (data: string) => {
      if (handled.current) return
      handled.current = true
      const target = classifyScan(data)
      if (target.kind === "act") void verifyAct(target.code)
      else if (target.kind === "cross-device") setState({ view: "device", code: target.code })
      else setState({ view: target.kind })
    },
    [verifyAct]
  )

  // QR déjà lu ailleurs (lien `/scanner?qr=…`) : seul un code d'acte est
  // accepté par lien. Une connexion d'appareil exige un vrai scan : un lien
  // piégé ferait sinon approuver la demande d'un tiers en un clic.
  const qr = params.get("qr")
  React.useEffect(() => {
    if (!qr) return
    const target = classifyScan(qr)
    if (target.kind === "act") onScanned(qr)
  }, [qr, onScanned])

  function restart() {
    handled.current = false
    setError(null)
    setManual("")
    setState({ view: "scan" })
    if (params.toString()) router.replace("/scanner")
  }

  async function approve(code: string) {
    setBusy(true)
    setError(null)
    try {
      await approveSession({ sessionCode: code })
      setState({ view: "device-done" })
    } catch (err) {
      const data = (err as { data?: { message?: string } })?.data
      setError(data?.message ?? (err instanceof Error && err.message ? cleanError(err.message) : "Cette demande de connexion a expiré. Affiche un nouveau QR sur l’autre appareil."))
    } finally {
      setBusy(false)
    }
  }

  async function refuse(code: string) {
    try {
      await cancelSession({ sessionCode: code })
    } finally {
      restart()
    }
  }

  // ── Viseur ────────────────────────────────────────────────────────────────
  if ((state.view === "scan" && !manualMode) || state.view === "verifying") {
    return (
      <Viewfinder
        verifying={state.view === "verifying"}
        onScanned={onScanned}
        onManual={() => router.push("/scanner?saisie=1")}
      />
    )
  }

  // ── Saisie manuelle ───────────────────────────────────────────────────────
  if (state.view === "scan" || state.view === "manual") {
    const normalized = normalizeVerificationCode(manual)
    return (
      <Screen
        header={<AppBar title="Vérifier un acte officiel" back="/scanner" />}
        footer={
          <IdnButton type="submit" form="act-code" full disabled={!normalized}>
            Vérifier
          </IdnButton>
        }
      >
        <form
          id="act-code"
          onSubmit={(e) => {
            e.preventDefault()
            if (normalized) void verifyAct(normalized)
          }}
        >
          <h2 className="mt-5 text-xl font-semibold text-idn-ink">Code de vérification</h2>
          <p className="mt-1 text-sm leading-5 text-idn-muted">Les 12 caractères imprimés sous le QR code de l’acte.</p>
          <label htmlFor="act-code-input" className="sr-only">
            Code de vérification de l’acte
          </label>
          <input
            id="act-code-input"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            placeholder="ABCD-EFGH-JKMN"
            maxLength={16}
            aria-describedby="act-code-hint"
            className={cn(
              "mt-5 h-14 w-full rounded-[10px] border-2 bg-idn-surface px-3.5 font-mono text-xl uppercase tracking-[2px] text-idn-ink outline-none placeholder:text-idn-muted focus-visible:ring-2 focus-visible:ring-ring",
              normalized ? "border-idn-green" : "border-idn-muted"
            )}
          />
          <p id="act-code-hint" className="mt-1.5 text-[13px] text-idn-muted">
            {normalized ? formatVerificationCodeForDisplay(normalized) : "Lettres et chiffres, tirets facultatifs."}
          </p>
        </form>
      </Screen>
    )
  }

  // ── Connexion d'un autre appareil ─────────────────────────────────────────
  if (state.view === "device" || state.view === "device-done") {
    const done = state.view === "device-done"
    const code = state.view === "device" ? state.code : ""
    const status = deviceStatus?.status
    const stale = !done && (status === "expired" || status === "cancelled" || deviceStatus === null)
    return (
      <Screen
        header={<AppBar title="Connexion d’un appareil" back="/dashboard" backIcon="close" />}
        footer={
          done || stale ? (
            <IdnButton href="/dashboard" full>
              Terminé
            </IdnButton>
          ) : (
            <>
              <IdnButton full onClick={() => void approve(code)} loading={busy} disabled={status !== "pending"}>
                Approuver la connexion
              </IdnButton>
              <IdnButton variant="ghost" full onClick={() => void refuse(code)}>
                Refuser
              </IdnButton>
            </>
          )
        }
      >
        <div className="mt-8 flex flex-col items-center text-center" aria-live="polite">
          {done ? (
            <IdnLottie name="success" size={128} label="Appareil connecté" />
          ) : (
            <span className={cn("flex size-[72px] items-center justify-center rounded-full", stale ? "bg-idn-surface-2 text-idn-muted" : "bg-c-blue-badge text-c-blue-text")}>
              <Icon name="laptop" size={32} />
            </span>
          )}
          <h2 className="mt-4 text-xl font-semibold text-idn-ink">
            {done ? "Appareil connecté" : stale ? "Demande expirée" : "Connecter un autre appareil ?"}
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-5 text-idn-muted">
            {done
              ? "Termine la connexion sur l’autre appareil avec ton code PIN."
              : stale
                ? "Affiche un nouveau QR sur l’autre appareil puis scanne-le."
                : "Un appareil demande à se connecter à ton compte IDN. Approuve seulement si c’est toi qui viens d’afficher ce QR."}
          </p>
        </div>
        {!done && deviceStatus?.status === "pending" ? (
          <Note center>
            Demande valable jusqu’à {new Date(deviceStatus.expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.
          </Note>
        ) : null}
        <ErrorNote>{error}</ErrorNote>
      </Screen>
    )
  }

  // ── Autres QR ─────────────────────────────────────────────────────────────
  if (state.view === "presentation" || state.view === "unknown") {
    return (
      <Screen
        header={<AppBar title="QR code lu" back="/dashboard" backIcon="close" />}
        footer={
          <IdnButton full onClick={restart}>
            Scanner un autre QR
          </IdnButton>
        }
      >
        <div className="mt-8 flex flex-col items-center text-center">
          <span className="flex size-[72px] items-center justify-center rounded-full bg-idn-surface-2 text-idn-ink-2">
            <Icon name={state.view === "presentation" ? "idCard" : "qr"} size={32} />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-idn-ink">
            {state.view === "presentation" ? "Carte d’identité IDN" : "QR code non reconnu"}
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-5 text-idn-muted">
            {state.view === "presentation"
              ? "Seuls les agents habilités peuvent vérifier la carte IDN d’une autre personne, depuis leur outil de contrôle."
              : "Ce QR n’est ni un acte officiel ni une demande de connexion IDN. Par sécurité, il n’est pas ouvert."}
          </p>
        </div>
      </Screen>
    )
  }

  // ── Résultat de vérification d'un acte ────────────────────────────────────
  const { code, result } = state
  const found = isFoundVerifyResult(result) ? result : null
  const endpoints = verifyEndpoints(apiBaseUrl, code)
  return (
    <Screen
      header={<AppBar title="Vérifier un acte officiel" back="/dashboard" backIcon="close" />}
      footer={
        <>
          {found && endpoints ? (
            <IdnButton href={endpoints.pdfUrl} target="_blank" rel="noopener noreferrer" full leadIcon={<Icon name="file" size={18} />}>
              Voir le document original
            </IdnButton>
          ) : null}
          <IdnButton variant={found ? "ghost" : "primary"} full onClick={restart}>
            {result.kind === "error" || result.kind === "unavailable" ? "Réessayer" : "Vérifier un autre acte"}
          </IdnButton>
        </>
      }
    >
      <div className="mt-6 flex flex-col items-center text-center">
        {result.kind === "valid" ? (
          <IdnLottie name="shield" size={120} label="Acte authentique" />
        ) : (
          <span
            className={cn(
              "flex size-[72px] items-center justify-center rounded-full",
              result.kind === "revoked" ? "bg-c-red-badge text-c-red-text" : result.kind === "superseded" ? "bg-c-yellow-badge text-idn-ink-2" : "bg-idn-surface-2 text-idn-ink-2"
            )}
          >
            <Icon name={result.kind === "revoked" ? "close" : result.kind === "superseded" ? "refresh" : "alert"} size={32} />
          </span>
        )}
        <h2 role="status" className="mt-3 text-xl font-semibold text-idn-ink">
          {verifyResultTitle(result)}
        </h2>
        <div className="mt-2">
          {result.kind === "valid" ? (
            <Badge tone="green" icon="shield">Signature valide</Badge>
          ) : result.kind === "revoked" ? (
            <Badge tone="red">Ne plus utiliser</Badge>
          ) : result.kind === "superseded" ? (
            <Badge tone="yellow">Version remplacée</Badge>
          ) : null}
        </div>
        {result.kind === "unknown" ? (
          <p className="mt-2 max-w-md text-sm leading-5 text-idn-muted">
            Aucun acte ne correspond au code {formatVerificationCodeForDisplay(code)}. Vérifie la saisie : un faux document est possible.
          </p>
        ) : null}
      </div>
      {found ? (
        <Card className="mt-5">
          <dl className="divide-y divide-idn-border">
            <DetailRow label="Type" value={found.typeLabel} />
            <DetailRow label="Émetteur" value={found.issuerName} />
            <DetailRow label="Émis le" value={formatActDate(found.issuedAt)} />
            <DetailRow label="Signature" value={found.signed ? (found.signedAt ? `Oui, le ${formatActDate(found.signedAt)}` : "Oui") : "Non signé"} />
            <DetailRow label="Numéro" value={found.documentNumber} mono />
            <DetailRow label="Code" value={formatVerificationCodeForDisplay(code)} mono />
          </dl>
        </Card>
      ) : null}
      {found ? <Note>Compare le document original avec celui que tu as en main : il doit être identique.</Note> : null}
    </Screen>
  )
}

/** Viseur sombre : flux de la caméra, réticule, lecture du QR. */
function Viewfinder({ verifying, onScanned, onManual }: { verifying: boolean; onScanned: (data: string) => void; onManual: () => void }) {
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const [camera, setCamera] = React.useState<CameraState>("starting")

  React.useEffect(() => {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported")
      return
    }
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    let stopped = false
    const detector = new Ctor({ formats: ["qr_code"] })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play().catch(() => {})
        setCamera("on")
        let running = false
        timer = setInterval(async () => {
          if (running || video.readyState < 2) return
          running = true
          try {
            const codes = await detector.detect(video)
            const value = codes[0]?.rawValue
            if (value) onScanned(value)
          } catch {
            // Image illisible : on retente au tour suivant.
          } finally {
            running = false
          }
        }, 250)
      })
      .catch((e: unknown) => {
        const name = (e as { name?: string })?.name
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable")
      })
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onScanned])

  const message = verifying
    ? "Vérification de la signature…"
    : camera === "unsupported"
      ? "Ton navigateur ne sait pas lire les QR codes. Saisis le code imprimé sous le QR."
      : camera === "denied"
        ? "Autorise l’appareil photo pour lire le QR, ou saisis le code imprimé sous le QR."
        : camera === "unavailable"
          ? "Aucune caméra disponible. Saisis le code imprimé sous le QR."
          : "Vise le QR code imprimé en bas de l’acte."

  return (
    <Screen
      width="wide"
      header={<AppBar title="Vérifier un acte officiel" back="/dashboard" backIcon="close" />}
      footer={
        <IdnButton variant="secondary" full onClick={onManual} disabled={verifying} className="min-h-[50px] text-[15px]">
          Saisir le code de l’acte
        </IdnButton>
      }
      contentClassName="flex flex-col px-0 pb-0 md:pb-6"
    >
      <div className="relative flex min-h-[min(70svh,560px)] flex-1 flex-col items-center justify-center overflow-hidden bg-[#0E110D] px-6 py-10 md:mt-4 md:rounded-[20px]">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-hidden
          className={cn("absolute inset-0 size-full object-cover", camera === "on" ? "opacity-100" : "opacity-0")}
        />
        <div aria-hidden className="absolute inset-0 bg-[rgba(14,17,13,0.55)]" />
        <Reticle scanning={camera === "on" && !verifying} />
        <p aria-live="polite" className="relative mt-7 max-w-sm text-center text-[15px] text-[#F2F0E8]">
          {message}
        </p>
        {verifying ? <IdnLottie name="loader" size={64} loop label="Vérification en cours" className="relative mt-3" /> : null}
      </div>
    </Screen>
  )
}

/** Coins du réticule (vert clair sur fond sombre), ligne de balayage animée. */
function Reticle({ scanning }: { scanning: boolean }) {
  const corner = "absolute size-9 rounded-[4px] border-[#5BC57F]"
  return (
    <div role="img" aria-label="Cadre de lecture du QR code" className="relative size-[min(250px,64vw)]">
      <span className={cn(corner, "left-0 top-0 border-l-[3px] border-t-[3px]")} />
      <span className={cn(corner, "right-0 top-0 border-r-[3px] border-t-[3px]")} />
      <span className={cn(corner, "bottom-0 left-0 border-b-[3px] border-l-[3px]")} />
      <span className={cn(corner, "bottom-0 right-0 border-b-[3px] border-r-[3px]")} />
      {scanning ? <span className="idn-scanline absolute inset-x-3.5 top-3.5 h-0.5 bg-[#5BC57F] motion-reduce:top-1/2 motion-reduce:animate-none" /> : null}
      <style>{`@keyframes idn-scan{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(min(250px,64vw) - 30px))}}.idn-scanline{animation:idn-scan 2.8s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.idn-scanline{animation:none}}`}</style>
    </div>
  )
}
