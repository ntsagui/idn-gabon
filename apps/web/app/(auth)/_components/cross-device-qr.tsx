"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { QRCodeSVG } from "qrcode.react"

import { api } from "@repo/backend/convex/_generated/api"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"

import { Spinner } from "./pin-login"

type Props = {
  onApproved: (email: string) => void
  onClose: () => void
}

/**
 * Connexion depuis un autre appareil : crée une session `crossDevice`,
 * affiche le QR `idn:cross-device:<code>` et suit son statut. Une fois le
 * téléphone approuvé, l'adresse du compte remonte pour l'étape PIN. Fermer la
 * fenêtre annule la session côté serveur.
 */
export function CrossDeviceQr({ onApproved, onClose }: Props) {
  const createSession = useMutation(api.crossDevice.createSession)
  const cancelSession = useMutation(api.crossDevice.cancelSession)
  const [sessionCode, setSessionCode] = React.useState<string | null>(null)
  const [expiresAt, setExpiresAt] = React.useState<number | null>(null)
  const [bootError, setBootError] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)

  const status = useQuery(api.crossDevice.getStatus, sessionCode ? { sessionCode } : "skip")

  const create = React.useCallback(async () => {
    setCreating(true)
    setBootError(null)
    try {
      const res = await createSession({ userAgent: navigator.userAgent })
      setSessionCode(res.sessionCode)
      setExpiresAt(res.expiresAt)
    } catch {
      setBootError("Impossible de créer le code. Réessaie.")
    } finally {
      setCreating(false)
    }
  }, [createSession])

  const started = React.useRef(false)
  React.useEffect(() => {
    if (started.current) return
    started.current = true
    void create()
  }, [create])

  React.useEffect(() => {
    if (status?.status === "approved") onApproved(status.approvedEmail)
  }, [status, onApproved])

  async function cancelCurrent() {
    if (!sessionCode) return
    try {
      await cancelSession({ sessionCode })
    } catch {
      // Session déjà expirée ou consommée : rien à annuler.
    }
  }

  async function close() {
    await cancelCurrent()
    onClose()
  }

  async function refresh() {
    await cancelCurrent()
    setSessionCode(null)
    setExpiresAt(null)
    await create()
  }

  const isApproved = status?.status === "approved"
  const isExpired = status?.status === "expired" || status?.status === "cancelled"
  const minutesLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000)) : null

  return (
    <IdnDialog
      open
      onOpenChange={(open) => {
        if (!open) void close()
      }}
      title="Connexion par téléphone"
      description="Ouvre l’app IDN sur ton téléphone déjà connecté, touche l’icône de scan en haut de l’accueil, puis vise ce code."
    >
      <div className="mt-5 flex flex-col items-center gap-3">
        <div className="grid size-[240px] place-items-center rounded-[14px] border border-idn-border bg-white p-4">
          {isApproved ? (
            <div className="flex flex-col items-center gap-2 text-c-green-text">
              <Icon name="checkCir" size={56} />
              <span className="text-sm font-semibold">Téléphone approuvé</span>
            </div>
          ) : isExpired ? (
            <div className="flex flex-col items-center gap-2 text-idn-muted">
              <Icon name="close" size={36} />
              <span className="text-[13px] font-medium">Ce code a expiré.</span>
            </div>
          ) : sessionCode ? (
            <QRCodeSVG
              value={`idn:cross-device:${sessionCode}`}
              size={208}
              level="M"
              bgColor="#ffffff"
              fgColor="#0a0a0a"
              title="Code QR de connexion à scanner avec l’app IDN"
            />
          ) : bootError ? (
            <p role="alert" className="px-2 text-center text-[13px] text-c-red-text">
              {bootError}
            </p>
          ) : (
            <Spinner label="Création du code…" />
          )}
        </div>
        {isApproved ? (
          <p className="text-center text-[13px] text-idn-muted">Saisis ton code PIN pour terminer la connexion.</p>
        ) : status?.status === "pending" && minutesLeft !== null ? (
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-idn-muted">
            Valable encore {minutesLeft} min
          </p>
        ) : null}
      </div>
      <div className="mt-5 flex flex-col gap-2">
        {!isApproved ? (
          <IdnButton variant="ghost" full onClick={() => void refresh()} loading={creating} leadIcon={<Icon name="refresh" size={18} />}>
            Nouveau code
          </IdnButton>
        ) : null}
        <IdnButton variant="quiet" full onClick={() => void close()}>
          Annuler
        </IdnButton>
      </div>
    </IdnDialog>
  )
}
