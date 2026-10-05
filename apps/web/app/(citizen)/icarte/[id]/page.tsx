"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { QRCodeSVG } from "qrcode.react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog, IdnDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Screen, CenterState } from "@/app/_components/idn/screen"

import { CardVisual } from "../_components/card-face"
import { formatLabel, walletCardToUi } from "../_content/cards"

/** Carte iCarte : transposition de apps/mobile/src/app/(tabs)/icarte/[id].tsx. */
export default function ICarteCardPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const wallet = useQuery(api.wallet.listMine)
  const removeCard = useMutation(api.wallet.remove)
  const [verso, setVerso] = React.useState(false)
  const [qrOpen, setQrOpen] = React.useState(false)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [shareNote, setShareNote] = React.useState<string | null>(null)
  const deleted = React.useRef(false)

  const raw = wallet?.cards.find((c) => c._id === id)

  if (wallet === undefined) {
    return (
      <Screen header={<AppBar title="iCarte" back="/icarte" />}>
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      </Screen>
    )
  }

  if (!raw) {
    return (
      <Screen header={<AppBar title="Carte introuvable" back="/icarte" />}>
        <CenterState visual={<Icon name="wallet" size={40} className="text-idn-muted" />} title="Carte introuvable">
          {deleted.current ? "Carte supprimée." : "Cette carte n’existe plus."}
        </CenterState>
      </Screen>
    )
  }

  const card = walletCardToUi(raw)
  const frontEntries = Object.entries(raw.data ?? {})
  const backEntries = Object.entries(raw.backData ?? {})
  const hasBack = backEntries.length > 0
  const visible = verso ? backEntries : frontEntries
  // Champs renseignés uniquement — aucun vide dans le QR ni dans le partage.
  const filledFront = frontEntries.filter(([, v]) => v && v.length > 0)
  const filledBack = backEntries.filter(([, v]) => v && v.length > 0)

  // Représentation locale des champs de la carte (aucune vérification serveur
  // n’existe pour ces cartes déclaratives), comme sur le mobile.
  const qrPayload = JSON.stringify({
    card: raw.name,
    ...(raw.subtitle ? { subtitle: raw.subtitle } : {}),
    data: Object.fromEntries(filledFront),
    ...(filledBack.length > 0 ? { backData: Object.fromEntries(filledBack) } : {}),
  })

  async function shareCard() {
    if (!raw) return
    const lines: string[] = [raw.name]
    if (raw.subtitle) lines.push(raw.subtitle)
    for (const group of [filledFront, filledBack]) {
      if (group.length === 0) continue
      lines.push("")
      for (const [k, val] of group) lines.push(`${formatLabel(k)} : ${val}`)
    }
    const text = lines.join("\n")
    setShareNote(null)
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: raw.name, text })
      } catch {
        // partage annulé
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setShareNote("Informations de la carte copiées.")
    } catch {
      setShareNote("Partage impossible sur ce navigateur.")
    }
  }

  return (
    <Screen
      header={
        <AppBar
          title={raw.name}
          back="/icarte"
          right={<IconButton icon="edit" label="Modifier la carte" plain href={`/icarte/edit/${raw._id}`} />}
        />
      }
    >
      <div className="mx-auto mt-5 max-w-md">
        <CardVisual card={card} entries={visible} showSide={hasBack} verso={verso} />
        {hasBack ? (
          <button
            type="button"
            onClick={() => setVerso((v) => !v)}
            className="mx-auto mt-3.5 flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] text-idn-muted outline-none hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="rotateCcw" size={16} />
            {verso ? "Voir le recto" : "Voir le verso"}
          </button>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-2">
          <IdnButton variant="ghost" full href={`/icarte/edit/${raw._id}`} leadIcon={<Icon name="edit" size={16} />}>
            Modifier
          </IdnButton>
          <IdnButton variant="ghost" full onClick={() => setQrOpen(true)} leadIcon={<Icon name="qr" size={16} />}>
            QR Code
          </IdnButton>
        </div>
        <IdnButton size="lg" full className="mt-2.5" onClick={() => void shareCard()} leadIcon={<Icon name="share" size={16} />}>
          Partager
        </IdnButton>
        {shareNote ? (
          <p role="status" className="mt-2 text-center text-[13px] text-idn-muted">
            {shareNote}
          </p>
        ) : null}
        <IdnButton variant="quiet" full className="mt-3 text-c-red-text" onClick={() => setConfirmOpen(true)}>
          Supprimer cette carte
        </IdnButton>
      </div>

      <IdnDialog open={qrOpen} onOpenChange={setQrOpen} title={raw.name}>
        <div className="mt-4 flex flex-col items-center gap-4">
          <div className="rounded-[18px] border border-idn-border bg-white p-[18px]" role="img" aria-label={`QR code de la carte ${raw.name}`}>
            <QRCodeSVG value={qrPayload} size={224} bgColor="#FFFFFF" fgColor="#0E110D" level="M" />
          </div>
          <p className="text-center text-[13px] leading-[19px] text-idn-muted">
            Ce QR contient les informations de la carte, lisibles hors ligne. Il ne prouve aucune vérification par un service.
          </p>
          <IdnButton variant="secondary" full onClick={() => setQrOpen(false)}>
            Fermer
          </IdnButton>
        </div>
      </IdnDialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer cette carte ?"
        description={`« ${raw.name} » sera retirée de ton portefeuille. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          deleted.current = true
          await removeCard({ cardId: raw._id })
          router.replace("/icarte")
        }}
      />
    </Screen>
  )
}
