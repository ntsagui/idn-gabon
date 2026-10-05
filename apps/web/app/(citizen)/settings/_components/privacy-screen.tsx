"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError, IdnDialog } from "@/app/_components/idn/dialog"
import { IdnInput } from "@/app/_components/idn/input"
import { Card, ErrorNote, Row, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { useNotice } from "../../_components/account/notice"

function DeleteAccountDialog({
  open,
  onClose,
  currentEmail,
  onDone,
}: {
  open: boolean
  onClose: () => void
  currentEmail: string
  onDone: () => void
}) {
  const requestDeletion = useMutation(api.privacy.requestAccountDeletion)
  const [confirmEmail, setConfirmEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setConfirmEmail("")
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  const matches = !!currentEmail && confirmEmail.trim().toLowerCase() === currentEmail.toLowerCase()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!matches) {
      setError("Cette adresse ne correspond pas à ton compte.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await requestDeletion({ confirmEmail: confirmEmail.trim().toLowerCase() })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? cleanError(err.message) : "Demande impossible.")
      setSubmitting(false)
    }
  }

  return (
    <IdnDialog open={open} onOpenChange={(o) => !o && !submitting && onClose()} title="Supprimer mon compte">
      <div className="mt-4 rounded-[14px] bg-c-red-badge p-3.5">
        <p className="text-sm font-semibold text-c-red-text">Action définitive après 30 jours</p>
        <p className="mt-1.5 text-[13px] leading-[19px] text-idn-ink-2">
          Ton identité numérique, tes cartes, ton iBoîte et tes documents seront supprimés au bout de 30 jours. Tu peux annuler pendant ce délai en te reconnectant. Le journal de sécurité est conservé 5 ans (obligation légale).
        </p>
      </div>
      <form onSubmit={submit} noValidate>
        <IdnInput
          label="Pour confirmer, saisis ton adresse IDN"
          hint={currentEmail}
          type="email"
          autoComplete="off"
          value={confirmEmail}
          onChange={(e) => setConfirmEmail(e.target.value)}
          mono
          autoFocus
          error={error ?? undefined}
        />
        <div className="mt-4 flex flex-col gap-2">
          <IdnButton type="submit" variant="danger" full loading={submitting} disabled={!matches}>
            Programmer la suppression
          </IdnButton>
          <IdnButton variant="ghost" full href="/legal/delete-account">
            En savoir plus sur la suppression
          </IdnButton>
        </div>
      </form>
    </IdnDialog>
  )
}

/** Confidentialité et données : transposition de apps/mobile/src/app/settings/privacy.tsx. */
export function PrivacyScreen({ initialAction }: { initialAction?: string }) {
  const user = useQuery(api.profile.getCurrentUser)
  const deletionStatus = useQuery(api.privacy.getDeletionStatus)
  const requestExport = useMutation(api.privacy.requestDataExport)
  const cancelDeletion = useMutation(api.privacy.cancelAccountDeletion)
  const [deleteOpen, setDeleteOpen] = React.useState(initialAction === "delete")
  const [exporting, setExporting] = React.useState(false)
  const [cancelling, setCancelling] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const { notice, show } = useNotice()

  // L'action ne vaut qu'à l'arrivée depuis le Profil : un rechargement ne doit pas rouvrir la fenêtre.
  React.useEffect(() => {
    if (initialAction) window.history.replaceState(null, "", "/settings/privacy")
  }, [initialAction])

  /** La limite d'un export par 24 h renvoie une erreur technique : on la traduit. */
  function exportError(err: unknown): string {
    const data = (err as { data?: { kind?: string } })?.data
    if (data?.kind === "RateLimited") return "Tu as déjà demandé un export aujourd’hui. Tu pourras en demander un nouveau 24 h après le précédent."
    return err instanceof Error ? cleanError(err.message) : "Demande impossible."
  }

  async function handleCancelDeletion() {
    setCancelling(true)
    setError(null)
    try {
      await cancelDeletion({})
      show("Suppression annulée", "Ton compte n’est plus programmé pour la suppression.")
    } catch (err) {
      setError(err instanceof Error ? cleanError(err.message) : "Annulation impossible.")
    } finally {
      setCancelling(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      await requestExport({})
      show("Export demandé", "Tu recevras dans ton iBoîte un e-mail avec le lien de ton archive, valable 24 h.")
    } catch (err) {
      setError(exportError(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <Screen header={<AppBar title="Confidentialité et données" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">Consulte, exporte ou supprime les données de ton compte IDN.</p>
      <SectionTitle>Tes données</SectionTitle>
      <Card>
        <Row
          icon="download"
          title="Télécharger une copie"
          sub="Archive envoyée par e-mail dans ton iBoîte, lien valable 24 h"
          chevron={!exporting}
          right={
            exporting ? (
              <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-idn-green border-r-transparent motion-reduce:animate-none" />
            ) : null
          }
          onClick={exporting ? undefined : handleExport}
          disabled={exporting}
        />
        <Row icon="keyRound" title="Partages actifs" sub="Applications autorisées à lire tes informations" chevron href="/consents" />
        <Row icon="activity" title="Journal d’activité" sub="Connexions et opérations sur ton compte" chevron href="/activity" />
      </Card>
      <ErrorNote>{error}</ErrorNote>

      <SectionTitle>Suppression du compte</SectionTitle>
      {deletionStatus ? (
        <Card padded className="border-c-red-badge bg-c-red-badge">
          <p className="text-sm font-semibold text-c-red-text">Suppression programmée</p>
          <p className="mt-1 text-[13px] leading-[19px] text-idn-ink-2">
            {`Ton compte sera supprimé dans ${deletionStatus.daysRemaining} jour${deletionStatus.daysRemaining > 1 ? "s" : ""}. Tu peux encore changer d’avis.`}
          </p>
          <IdnButton full className="mt-3" loading={cancelling} onClick={handleCancelDeletion}>
            Annuler la suppression
          </IdnButton>
        </Card>
      ) : (
        <Card padded>
          <p className="text-[13px] leading-[19px] text-idn-muted">Supprime définitivement ton compte IDN après un délai de réflexion de 30 jours.</p>
          <IdnButton variant="dangerGhost" full className="mt-3" onClick={() => setDeleteOpen(true)} disabled={deletionStatus === undefined}>
            Supprimer mon compte
          </IdnButton>
        </Card>
      )}
      <DeleteAccountDialog
        open={deleteOpen && deletionStatus === null}
        onClose={() => setDeleteOpen(false)}
        currentEmail={user?.email ?? ""}
        onDone={() => {
          setDeleteOpen(false)
          show("Demande enregistrée", "Ton compte sera supprimé dans 30 jours. Tu peux annuler d’ici là depuis Confidentialité et données.")
        }}
      />
      {notice}
    </Screen>
  )
}
