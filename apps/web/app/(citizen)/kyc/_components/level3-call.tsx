"use client"

import * as React from "react"

import { LiveVideoRoom } from "@repo/ui/components/live-video-room"

import { Icon } from "@/app/_components/idn/icons"

/** Au-delà, le serveur vidéo est jugé injoignable (LiveKit abandonne lui-même après 15 s par étape). */
const CONNECT_TIMEOUT_MS = 30_000

export type Level3Credentials = { serverUrl: string; token: string; roomName: string }

/** Chrono de l'entretien, isolé pour que son tic ne fasse pas re-rendre la salle vidéo. */
function Chrono() {
  const [start] = React.useState(() => Date.now())
  const [now, setNow] = React.useState(start)
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(timer)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - start) / 1000))
  return <span className="tabular-nums">{`${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`}</span>
}

/**
 * Visio de l'entretien Niveau 3 : plein écran sombre, chrono, salle LiveKit
 * commune (`LiveVideoRoom`, contrôles micro, caméra et départ).
 *
 * Une fin de salle (raccrocher, décision du contrôleur) ou une connexion
 * annulée n'est pas une erreur : seule une vraie panne remonte à l'écran (bug
 * déjà corrigé sur le mobile). Un serveur vidéo injoignable est signalé au
 * bout de 30 s, et « Quitter » reste possible avant même la connexion (le
 * bouton de départ de LiveKit n'agit qu'une fois connecté). Les rappels passés à la salle sont stables :
 * `LiveKitRoom` relance sa connexion quand `onError` change, et une
 * déconnexion survenue avant la première connexion (tentative annulée, double
 * montage de React en développement) ne ferme pas la visio.
 */
export function Level3Call({
  credentials,
  onLeave,
  onError,
}: {
  credentials: Level3Credentials
  onLeave: () => void
  onError: (message: string) => void
}) {
  const title = React.useRef<HTMLHeadingElement>(null)
  const callbacks = React.useRef({ onLeave, onError })
  const connected = React.useRef(false)

  React.useEffect(() => {
    callbacks.current = { onLeave, onError }
  }, [onLeave, onError])

  React.useEffect(() => {
    const watchdog = window.setTimeout(() => {
      if (!connected.current) callbacks.current.onError("le serveur vidéo ne répond pas. Réessaie dans un instant.")
    }, CONNECT_TIMEOUT_MS)
    return () => window.clearTimeout(watchdog)
  }, [])

  React.useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    title.current?.focus()
    return () => {
      document.body.style.overflow = overflow
    }
  }, [])

  const room = React.useMemo(
    () => (
      <LiveVideoRoom
        serverUrl={credentials.serverUrl}
        token={credentials.token}
        className="h-full min-h-0 rounded-[20px] border-0"
        onConnected={() => {
          connected.current = true
        }}
        onDisconnected={() => {
          if (connected.current) callbacks.current.onLeave()
        }}
        onError={(error) => {
          // Annulation par notre propre démontage ou départ : pas une panne. Un
          // délai dépassé arrive aussi comme « annulé » chez LiveKit : il reste une panne.
          const reason = (error as { reason?: number }).reason
          const cancelled = reason === 3 || reason === 4 || /disconnect|abort|cancel/i.test(error.message)
          if (cancelled && !/timed out|unreachable/i.test(error.message)) return
          callbacks.current.onError(error.message)
        }}
      />
    ),
    [credentials.serverUrl, credentials.token]
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="l3-call-title"
      className="fixed inset-0 z-[60] flex flex-col bg-[#0E110D] pb-[max(env(safe-area-inset-bottom),12px)] pt-[env(safe-area-inset-top)] text-white [&_.lk-toast]:top-[calc(72px+env(safe-area-inset-top))]! [&_.lk-toast]:shadow-none!"
    >
      <div className="flex items-start gap-3 px-5 py-3">
        <div className="min-w-0 flex-1">
          <h1 id="l3-call-title" ref={title} tabIndex={-1} className="text-[17px] font-semibold outline-none">
            Entretien Niveau 3
          </h1>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/70">
            <Icon name="lock" size={12} />
            <span>
              Chiffré · <Chrono />
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => callbacks.current.onLeave()}
          aria-label="Quitter l’entretien"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/80 outline-none hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
        >
          <Icon name="close" size={22} />
        </button>
      </div>
      <div className="min-h-0 flex-1 px-4">{room}</div>
    </div>
  )
}
