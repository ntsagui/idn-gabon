"use client"

import { useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { IdnButton } from "@/app/_components/idn/button"
import { Card, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { findDocFolder } from "@/lib/citizen/doc-folders"
import { plural } from "@/lib/citizen/doc-format"

/** Confirmation après l'ajout d'un document (apps/mobile/src/app/idoc/add-success.tsx). */
export default function DocAddSuccess() {
  const params = useSearchParams()
  const summary = useQuery(api.idoc.summary)
  const folder = findDocFolder(params.get("folder") ?? undefined)
  const count = summary?.find((s) => s.folderId === folder?.id)?.count

  return (
    <Screen
      footer={
        <>
          <IdnButton href="/idoc" replace full>
            Retour à mes documents
          </IdnButton>
          <IdnButton href={`/idoc/add${folder ? `?folder=${folder.id}` : ""}`} replace variant="ghost" full>
            Ajouter un autre document
          </IdnButton>
        </>
      }
    >
      <div className="mt-12 flex flex-col items-center text-center">
        <IdnLottie name="success" size={128} label="Document ajouté" />
        <h1 className="mt-3 text-[22px] font-semibold text-idn-ink">Document ajouté</h1>
        <p className="mt-1.5 max-w-md text-sm leading-5 text-idn-muted">
          {folder ? `Il est rangé dans le dossier « ${folder.label} ».` : "Il est rangé dans ton iDocument."} Tu peux le retrouver à tout moment depuis l’accueil.
        </p>
      </div>
      {folder ? (
        <Card className="mt-6">
          <Row
            icon={folder.icon}
            tone="green"
            title={folder.label}
            sub={count === undefined ? "…" : plural(count, "document", "documents")}
            chevron
            href={`/idoc/folder/${folder.id}`}
          />
        </Card>
      ) : null}
    </Screen>
  )
}
