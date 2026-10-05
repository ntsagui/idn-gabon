"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog, IdnDialog, cleanError } from "@/app/_components/idn/dialog"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Card, Note, Row, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { useCvPdf } from "../_components/pdf"
import { useActiveCv } from "../_hooks/use-active-cv"

const MAX_CVS = 10

const SOURCE_LABEL: Record<string, string> = {
  onboarding: "CV initial",
  manual: "Créé à la main",
  ai_optimize: "Variante IA",
  import: "Importé",
}

/** Mes CV (apps/mobile/src/app/icv/list.tsx), qui sert aussi de sélecteur du CV actif. */
export default function ICVList() {
  const cvs = useQuery(api.cv.cvs.listMine)
  const full = !!cvs && cvs.length >= MAX_CVS

  return (
    <Screen
      header={
        <AppBar title="Mes CV" back="/icv" right={cvs && !full ? <IconButton icon="plus" label="Créer un CV" href="/icv/create" /> : null} />
      }
    >
      {cvs === undefined ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={64} loop label="Chargement" />
        </div>
      ) : cvs.length === 0 ? (
        <div className="mt-8 flex flex-col items-center">
          <IdnLottie name="icv" size={120} label="iCV" />
          <ScreenTitle center title="Tu n’as pas encore de CV" lead="Crée ton premier CV pour le personnaliser et le partager." />
          <IdnButton href="/icv/create" className="mt-5">
            Crée ton premier CV
          </IdnButton>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-idn-muted">
            {cvs.length} CV sur {MAX_CVS} possibles.
          </p>
          <ul className="flex flex-col gap-3 pt-3">
            {cvs.map((cv) => (
              <li key={cv._id}>
                <CvCard cv={cv} canSafelyDelete={cvs.length > 1} />
              </li>
            ))}
          </ul>
          {full ? <Note>Tu as atteint la limite de {MAX_CVS} CV. Supprime un CV pour en créer un nouveau.</Note> : null}
        </>
      )}
    </Screen>
  )
}

interface CvSummary {
  _id: Id<"citizenCv">
  name: string
  isDefault: boolean
  source: "onboarding" | "manual" | "ai_optimize" | "import"
  completionScore: number
}

function CvCard({ cv, canSafelyDelete }: { cv: CvSummary; canSafelyDelete: boolean }) {
  const router = useRouter()
  const { setActiveCvId } = useActiveCv()
  const create = useMutation(api.cv.cvs.create)
  const setDefault = useMutation(api.cv.cvs.setDefault)
  const remove = useMutation(api.cv.cvs.remove)
  const pdf = useCvPdf(cv._id, cv.name)
  const [mutating, setMutating] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [alert, setAlert] = React.useState<{ title: string; message: string } | null>(null)
  const busy = mutating || pdf.pending !== null

  function open() {
    setActiveCvId(cv._id)
    router.push("/icv")
  }

  async function handleDuplicate() {
    if (busy) return
    setMutating(true)
    try {
      const id = await create({ name: `${cv.name} (copie)`, copyFromCvId: cv._id })
      router.push(`/icv?cv=${id}`)
    } catch (e) {
      const msg = (e as Error).message ?? ""
      setAlert({ title: "Duplication impossible", message: msg.includes("CV_LIMIT_REACHED") ? `Tu as atteint la limite de ${MAX_CVS} CV.` : cleanError(msg) })
    } finally {
      setMutating(false)
    }
  }

  async function handleSetDefault() {
    if (busy || cv.isDefault) return
    setMutating(true)
    try {
      await setDefault({ cvId: cv._id })
    } catch (e) {
      setAlert({ title: "Action impossible", message: cleanError((e as Error).message ?? "") || "Réessaie dans un instant." })
    } finally {
      setMutating(false)
    }
  }

  return (
    <Card>
      <Row
        icon="fileUser"
        tone={cv.isDefault ? "green" : "neutral"}
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{cv.name}</span>
            {cv.isDefault ? <Badge tone="green">Principal</Badge> : null}
          </span>
        }
        sub={`${SOURCE_LABEL[cv.source] ?? cv.source} · score ${cv.completionScore}/100`}
        ariaLabel={`Ouvrir ${cv.name}`}
        onClick={open}
        disabled={busy}
        chevron
      />
      <div className="flex flex-wrap gap-2 py-3">
        <Action icon="edit" label="Renommer" disabled={busy} href={`/icv/rename?cv=${cv._id}&name=${encodeURIComponent(cv.name)}`} />
        <Action icon="copy" label="Dupliquer" disabled={busy} onClick={handleDuplicate} />
        {!cv.isDefault ? <Action icon="check" label="Définir comme principal" disabled={busy} onClick={handleSetDefault} /> : null}
        <Action icon="download" label={pdf.pending ? "Préparation…" : "PDF"} disabled={busy} onClick={() => void pdf.open()} />
        {canSafelyDelete && !cv.isDefault ? <Action icon="trash" label="Supprimer" disabled={busy} onClick={() => setConfirmDelete(true)} danger /> : null}
      </div>
      {pdf.errorDialog}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce CV ?"
        description={`« ${cv.name} » sera supprimé de ta liste.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          await remove({ cvId: cv._id })
        }}
      />
      <IdnDialog open={!!alert} onOpenChange={(o) => !o && setAlert(null)} title={alert?.title ?? ""} description={alert?.message}>
        <div className="mt-5 flex justify-end">
          <IdnButton size="sm" className="min-h-11" onClick={() => setAlert(null)}>
            OK
          </IdnButton>
        </div>
      </IdnDialog>
    </Card>
  )
}

function Action({
  icon,
  label,
  onClick,
  href,
  disabled,
  danger,
}: {
  icon: IconName
  label: string
  onClick?: () => void
  href?: string
  disabled?: boolean
  danger?: boolean
}) {
  const cls = cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-idn-border bg-idn-surface px-3 text-[13px] font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
    danger ? "text-c-red-text hover:bg-c-red-badge" : "text-idn-ink-2 hover:bg-idn-surface-2"
  )
  const inner = (
    <>
      <Icon name={icon} size={15} />
      {label}
    </>
  )
  return href ? (
    <Link href={href} className={cls} aria-disabled={disabled || undefined}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  )
}
