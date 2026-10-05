"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useAction, useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog, cleanError } from "@/app/_components/idn/dialog"
import { Card, IconTile, Note, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { ChoiceRow } from "../_components/cv-ui"
import { useActiveCv } from "../_hooks/use-active-cv"

const MAX_SIZE = 5 * 1024 * 1024
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp,image/heic,image/heif"

type Dialog = { title: string; message: string; then?: () => void }

/** Import d'un CV existant par l'IA (apps/mobile/src/app/icv/import.tsx). */
export default function ICVImport() {
  const router = useRouter()
  const { activeCvId } = useActiveCv()
  const generateUploadUrl = useMutation(api.cv.importInternal.generateUploadUrl)
  const parseAndApply = useAction(api.cv.import.parseAndApply)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [file, setFile] = React.useState<File | null>(null)
  const [mode, setMode] = React.useState<"new" | "merge">("new")
  const [busy, setBusy] = React.useState(false)
  const [dialog, setDialog] = React.useState<Dialog | null>(null)

  function onPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (f.size > MAX_SIZE) return setDialog({ title: "Fichier trop lourd", message: "Le fichier dépasse 5 Mo." })
    setFile(f)
  }

  async function submit() {
    if (!file || busy) return
    if (mode === "merge" && !activeCvId) return setDialog({ title: "Aucun CV actif", message: "Choisis « Créer un nouveau CV »." })
    setBusy(true)
    try {
      const mime = file.type || "application/pdf"
      const uploadUrl = await generateUploadUrl()
      const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mime }, body: file })
      if (!upload.ok) throw new Error(`Envoi du fichier échoué (${upload.status}).`)
      const json = (await upload.json()) as { storageId: string }
      const result = await parseAndApply({
        storageRef: json.storageId as Id<"_storage">,
        mode,
        targetCvId: mode === "merge" ? activeCvId! : undefined,
        newCvName: mode === "new" ? `CV importé — ${file.name.replace(/\.[^.]+$/, "")}` : undefined,
      })
      setDialog({
        title: "Import réussi",
        message: "Les informations de ton CV ont été importées. Relis-les avant de le partager.",
        then: () => router.replace(`/icv?cv=${result.cvId}`),
      })
    } catch (e) {
      setDialog({ title: "Import impossible", message: `L’import a échoué. ${cleanError((e as Error).message ?? "")}`.trim() })
    } finally {
      setBusy(false)
    }
  }

  function closeDialog() {
    const next = dialog?.then
    setDialog(null)
    next?.()
  }

  return (
    <Screen
      header={<AppBar title="Importer un CV" back="history" backIcon="close" />}
      footer={
        <IdnButton full onClick={submit} loading={busy} disabled={!file}>
          {busy ? "Import en cours…" : "Lancer l’import"}
        </IdnButton>
      }
    >
      {busy ? (
        <div className="mt-8 flex flex-col items-center text-center" aria-live="polite">
          <IdnLottie name="loader" size={80} loop label="Import en cours" />
          <p className="mt-3 text-sm text-idn-muted">Lecture de ton CV par l’IA. Cela peut prendre une minute.</p>
        </div>
      ) : (
        <>
          <input ref={fileRef} type="file" accept={ACCEPT} className="sr-only" tabIndex={-1} aria-hidden onChange={onPicked} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label={file ? `Fichier choisi : ${file.name}. Changer de fichier` : "Choisir un fichier"}
            className="mt-4 flex w-full flex-col items-center gap-2 rounded-[14px] border border-dashed border-idn-muted bg-idn-surface p-6 text-center outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <IconTile icon={file ? "file" : "upload"} tone="green" size={44} />
            <span className="max-w-full break-words text-[15px] font-semibold text-idn-ink">{file ? file.name : "Choisir un fichier"}</span>
            <span className="text-[13px] text-idn-muted">
              {file ? `${(file.size / 1024 / 1024).toFixed(2).replace(".", ",")} Mo · appuie pour changer` : "PDF ou image, 5 Mo maximum"}
            </span>
          </button>

          <SectionTitle>Que faire du contenu ?</SectionTitle>
          <Card>
            <div role="radiogroup" aria-label="Que faire du contenu ?" className="divide-y divide-idn-border">
              <ChoiceRow label="Créer un nouveau CV" selected={mode === "new"} onSelect={() => setMode("new")} />
              <ChoiceRow
                label="Fusionner avec le CV actif"
                sub={!activeCvId ? "Aucun CV actif" : "Complète ton CV actuel"}
                selected={mode === "merge"}
                onSelect={() => setMode("merge")}
                disabled={!activeCvId}
              />
            </div>
          </Card>
          <Note>L’IA extrait ton parcours du document. Vérifie toujours le résultat.</Note>
        </>
      )}
      <IdnDialog open={!!dialog} onOpenChange={(o) => !o && closeDialog()} title={dialog?.title ?? ""} description={dialog?.message}>
        <div className="mt-5 flex justify-end">
          <IdnButton size="sm" className="min-h-11" onClick={closeDialog}>
            OK
          </IdnButton>
        </div>
      </IdnDialog>
    </Screen>
  )
}
