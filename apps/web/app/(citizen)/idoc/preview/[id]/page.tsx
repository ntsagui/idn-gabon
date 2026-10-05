"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Card, DetailRow, IconTile } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { findDocFolder } from "@/lib/citizen/doc-folders"
import { FILE_TYPE_LABEL, expiryState, formatBytes, formatIsoDate, formatTimestamp } from "@/lib/citizen/doc-format"

/**
 * Fiche d'un document iDocument (apps/mobile/src/app/idoc/preview/[id].tsx) :
 * détails, ouverture du fichier, suppression. Le navigateur affiche en plus
 * l'aperçu de l'image ou du PDF (URL signée de courte durée).
 */
export default function DocPreview() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const itemId = id as Id<"documentItem">
  const item = useQuery(api.idoc.get, { itemId })
  const downloadUrl = useQuery(api.idoc.getDownloadUrl, { itemId })
  const removeItem = useMutation(api.idoc.remove)
  const [confirmOpen, setConfirmOpen] = React.useState(false)

  const name = item?.name || item?.originalName || "Document sans nom"
  const back = item ? `/idoc/folder/${item.folderId}` : "/idoc"
  const header = <AppBar title="Document" back={back} />

  if (item === undefined) {
    return (
      <Screen header={header}>
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement du document" />
        </div>
      </Screen>
    )
  }

  if (!item) {
    return (
      <Screen header={header}>
        <div className="mt-6 flex flex-col items-center text-center">
          <IdnLottie name="idocument" size={120} label="Document introuvable" />
          <p className="mt-2 text-sm text-idn-muted">Ce document est introuvable ou a été supprimé.</p>
        </div>
      </Screen>
    )
  }

  const folder = findDocFolder(item.folderId)
  const expiry = expiryState(item.expirationDate)

  return (
    <Screen
      header={header}
      footer={
        <>
          <IdnButton
            href={downloadUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!downloadUrl || undefined}
            full
            leadIcon={<Icon name="download" size={18} />}
          >
            Ouvrir le fichier
          </IdnButton>
          <IdnButton variant="dangerGhost" full leadIcon={<Icon name="trash" size={18} />} onClick={() => setConfirmOpen(true)}>
            Supprimer
          </IdnButton>
        </>
      }
    >
      <div className="mt-5 flex flex-col items-center gap-2.5 text-center">
        <IconTile icon={item.fileType === "image" ? "camera" : "doc"} tone="green" size={56} />
        <h2 className="break-words text-xl font-semibold text-idn-ink">{name}</h2>
        {expiry === "expired" ? (
          <Badge tone="red" icon="alert">Expiré</Badge>
        ) : expiry === "soon" ? (
          <Badge tone="yellow" icon="clock">Expire bientôt</Badge>
        ) : null}
      </div>

      {downloadUrl && item.fileType !== "other" ? (
        <div className="mt-5 overflow-hidden rounded-[14px] border border-idn-border bg-idn-surface-2">
          {item.fileType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={downloadUrl} alt={`Aperçu de ${name}`} className="mx-auto max-h-[60svh] w-auto max-w-full" />
          ) : (
            <iframe src={downloadUrl} title={`Aperçu de ${name}`} className="h-[60svh] w-full" />
          )}
        </div>
      ) : null}

      <Card className="mt-5">
        <dl className="divide-y divide-idn-border">
          <DetailRow label="Dossier" value={folder?.label ?? item.folderId} />
          <DetailRow label="Type" value={FILE_TYPE_LABEL[item.fileType] ?? item.fileType} />
          {item.side ? <DetailRow label="Face" value={item.side === "front" ? "Recto" : "Verso"} /> : null}
          <DetailRow label="Ajouté le" value={formatTimestamp(item.createdAt)} />
          <DetailRow label="Taille" value={formatBytes(item.fileSize)} />
          {item.expirationDate ? <DetailRow label="Expire le" value={formatIsoDate(item.expirationDate)} /> : null}
          {item.originalName && item.originalName !== item.name ? (
            <DetailRow label="Fichier d’origine" value={item.originalName} mono />
          ) : null}
        </dl>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Supprimer ce document ?"
        description={`« ${name} » sera retiré de ton iDocument.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          await removeItem({ itemId })
          router.replace(back)
        }}
      />
    </Screen>
  )
}
