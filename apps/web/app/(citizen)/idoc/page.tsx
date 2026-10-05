"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { DOC_FOLDERS, findDocFolder } from "@/lib/citizen/doc-folders"
import { plural } from "@/lib/citizen/doc-format"

import { FolderCard } from "./_components/folder-card"

/** iDocument : transposition de apps/mobile/src/app/idoc/index.tsx (compteur et grille des dossiers). */
export default function IDocHome() {
  const router = useRouter()
  const params = useSearchParams()
  const summary = useQuery(api.idoc.summary)

  // Anciennes adresses (?folder=, ?doc=, ?add=1) : redirigées vers les écrans dédiés.
  const legacy = React.useMemo(() => {
    const doc = params.get("doc")
    if (doc) return `/idoc/preview/${encodeURIComponent(doc)}`
    const folder = findDocFolder(params.get("folder") ?? undefined)
    if (params.get("add") === "1") return `/idoc/add${folder ? `?folder=${folder.id}` : ""}`
    if (folder) return `/idoc/folder/${folder.id}`
    return null
  }, [params])
  React.useEffect(() => {
    if (legacy) router.replace(legacy)
  }, [legacy, router])

  const countsById = new Map(summary?.map((s) => [s.folderId as string, s]) ?? [])
  const folders = DOC_FOLDERS.map((f) => ({
    folder: f,
    count: countsById.get(f.id)?.count ?? 0,
    hasExpiring: countsById.get(f.id)?.hasExpiring ?? false,
  }))
  const totalItems = folders.reduce((sum, f) => sum + f.count, 0)
  const filledFolders = folders.filter((f) => f.count > 0).length

  return (
    <Screen
      header={<AppBar title="iDocument" back="/dashboard" />}
      footer={
        <IdnButton href="/idoc/add" full leadIcon={<Icon name="plus" size={18} />}>
          Ajouter un document
        </IdnButton>
      }
    >
      {summary === undefined || legacy ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement de tes documents" />
        </div>
      ) : (
        <>
          {totalItems === 0 ? (
            <div className="mt-4 flex flex-col items-center text-center">
              <IdnLottie name="idocument" size={120} label="iDocument" />
              <h2 className="mt-2 text-[17px] font-semibold text-idn-ink">Aucun document pour l’instant</h2>
              <p className="mt-1 max-w-md text-sm leading-5 text-idn-muted">
                Range ici tes pièces importantes, classées par dossier, pour les retrouver à tout moment.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-idn-muted">
              {plural(totalItems, "document", "documents")} · {plural(filledFolders, "dossier utilisé", "dossiers utilisés")}
            </p>
          )}
          <ul aria-label="Dossiers" className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {folders.map((f) => (
              <li key={f.folder.id} className="grid">
                <FolderCard f={f.folder} count={f.count} hasExpiring={f.hasExpiring} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  )
}
