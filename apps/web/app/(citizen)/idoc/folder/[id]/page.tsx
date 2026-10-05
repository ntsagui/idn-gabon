"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { Card, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { findDocFolder } from "@/lib/citizen/doc-folders"
import { FILE_TYPE_LABEL, expiryState, formatTimestamp, plural } from "@/lib/citizen/doc-format"

/** Contenu d'un dossier iDocument (apps/mobile/src/app/idoc/folder/[id].tsx). */
export default function FolderDetail() {
  const { id } = useParams<{ id: string }>()
  const folder = findDocFolder(id)
  const items = useQuery(api.idoc.listByFolder, folder ? { folderId: folder.id } : "skip")

  return (
    <Screen
      header={<AppBar title={folder?.label ?? "Dossier"} back="/idoc" />}
      footer={
        folder ? (
          <IdnButton href={`/idoc/add?folder=${folder.id}`} full leadIcon={<Icon name="plus" size={18} />}>
            Ajouter un document
          </IdnButton>
        ) : undefined
      }
    >
      {!folder ? (
        <p className="mt-6 text-center text-sm text-idn-muted">Ce dossier n’existe pas.</p>
      ) : items === undefined ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement du dossier" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center">
          <IdnLottie name="idocument" size={120} label="Dossier vide" />
          <h2 className="mt-2 text-[17px] font-semibold text-idn-ink">Dossier vide</h2>
          <p className="mt-1 max-w-md text-sm leading-5 text-idn-muted">
            {folder.desc}. Ajoute ton premier document à ce dossier.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 mt-4 text-sm text-idn-muted">{plural(items.length, "document", "documents")}</p>
          <Card>
            {items.map((d) => {
              const name = d.name || d.originalName || "Document sans nom"
              const expiry = expiryState(d.expirationDate)
              const sub = [
                FILE_TYPE_LABEL[d.fileType] ?? d.fileType,
                d.side ? (d.side === "front" ? "Recto" : "Verso") : null,
                `ajouté le ${formatTimestamp(d.createdAt)}`,
              ]
                .filter(Boolean)
                .join(" · ")
              return (
                <Row
                  key={d._id}
                  icon={d.fileType === "image" ? "camera" : "doc"}
                  tone="green"
                  title={<span className="break-words">{name}</span>}
                  sub={sub}
                  chevron
                  href={`/idoc/preview/${d._id}`}
                  ariaLabel={`${name}, ${sub}${expiry === "expired" ? ", expiré" : expiry === "soon" ? ", expire bientôt" : ""}`}
                  right={
                    expiry === "expired" ? (
                      <Badge tone="red">Expiré</Badge>
                    ) : expiry === "soon" ? (
                      <Badge tone="yellow">Expire bientôt</Badge>
                    ) : undefined
                  }
                />
              )
            })}
          </Card>
        </>
      )}
    </Screen>
  )
}
