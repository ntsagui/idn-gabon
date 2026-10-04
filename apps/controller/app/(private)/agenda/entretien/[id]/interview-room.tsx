"use client"

import * as React from "react"
import Link from "next/link"
import { useAction, useMutation, useQuery } from "convex/react"
import { CheckCircle2Icon, CircleSlashIcon, ShieldCheckIcon, VideoIcon, VideoOffIcon } from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Button } from "@repo/ui/components/button"
import { Label } from "@repo/ui/components/label"
import { LiveVideoRoom } from "@repo/ui/components/live-video-room"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"
import { Textarea } from "@repo/ui/components/textarea"

import { pages } from "../../../../_content/fr"
import { DocumentGallery } from "../../../../_components/image-viewer"
import { PageHeader } from "../../../../_components/page-header"
import { EmptyState, Field, Panel, Skeleton } from "../../../../_components/panel"
import { StatusPill } from "../../../../_components/status-pill"
import { describeError } from "../../../../_lib/errors"
import {
  countryLabel,
  documentTypeLabel,
  formatCivilDate,
  formatDateTime,
  formatTime,
  formatWeekday,
  genderLabel,
  relativeTime,
} from "../../../../_lib/format"
import { useNow } from "../../../../_lib/use-now"
import { composeReason, LEVEL3_REJECT_REASONS, OTHER_REASON } from "../../_components/reasons"

type Credentials = { serverUrl: string; token: string; roomName: string }

const CHECKS = [
  { id: "visage", label: "Le visage à l'écran correspond à la photo des pièces" },
  { id: "original", label: "La pièce originale a été montrée à la caméra, recto et verso" },
  { id: "questions", label: "La date et le lieu de naissance donnés oralement concordent" },
]

/**
 * Salle d'entretien Niveau 3 : vidéo LiveKit à gauche, dossier à droite,
 * décision en bas. Rejoindre ouvre l'entretien (`level3.beginInterview`) ;
 * accorder le Niveau 3 passe par `level3.approve` (décision unique, qui
 * constate aussi la piste documentaire en parcours fusionné).
 */
export function InterviewRoom({ verificationId }: { verificationId: Id<"level3Verification"> }) {
  const room = useQuery(api.controller.agenda.interview, { verificationId })
  const issueJoinToken = useAction(api.level3.livekit.issueJoinToken)
  const beginInterview = useMutation(api.level3.beginInterview)
  const approve = useMutation(api.level3.approve)
  const reject = useMutation(api.level3.reject)
  const now = useNow(15_000)

  const [credentials, setCredentials] = React.useState<Credentials | null>(null)
  const [joining, setJoining] = React.useState(false)
  const [videoError, setVideoError] = React.useState<string | null>(null)
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [dialog, setDialog] = React.useState<"approve" | "reject" | null>(null)
  const [reason, setReason] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  if (room === undefined) {
    return (
      <div className="space-y-4 px-5 py-6 md:px-8" aria-busy="true" aria-label="Chargement de l'entretien">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    )
  }
  if (room === null) {
    return (
      <EmptyState title="Entretien introuvable" action={<Button asChild variant="outline"><Link href="/agenda">Revenir à l&apos;agenda</Link></Button>}>
        Cette demande Niveau 3 n&apos;existe pas ou a été supprimée.
      </EmptyState>
    )
  }

  const decided = room.status === "approved" || room.status === "rejected"
  const active = room.status === "claimed" || room.status === "in_interview"
  const allChecked = CHECKS.every((c) => checked[c.id])

  const join = async () => {
    setJoining(true)
    setVideoError(null)
    try {
      // Le jeton d'abord : s'il est refusé, l'entretien n'est pas marqué ouvert.
      const token = await issueJoinToken({ verificationId })
      await beginInterview({ verificationId })
      setCredentials(token)
    } catch (err) {
      toast.error(describeError(err, "Impossible d'ouvrir la salle. Vérifiez l'heure du rendez-vous et réessayez."))
    } finally {
      setJoining(false)
    }
  }

  const decide = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (dialog === "approve") {
        await approve({ verificationId, ...(details.trim() ? { notes: details.trim() } : {}) })
        toast.success(`Niveau 3 accordé à ${room.citizen.name}.`)
      } else {
        const composed = composeReason(LEVEL3_REJECT_REASONS, reason, details)
        if ("error" in composed) {
          setError(composed.error)
          setSubmitting(false)
          return
        }
        await reject({ verificationId, reason: composed.message })
        toast.success(`Demande Niveau 3 de ${room.citizen.name} refusée. Le motif lui est communiqué.`)
      }
      setCredentials(null)
      setDialog(null)
    } catch (err) {
      setError(describeError(err, "La décision n'a pas pu être enregistrée."))
    } finally {
      setSubmitting(false)
    }
  }

  const declared = room.citizen.declared
  return (
    <>
      <PageHeader
        breadcrumb={[{ label: "Agenda", href: "/agenda" }, { label: `Entretien ${room.ref}` }]}
        kicker={`${pages.interview.kicker} · ${room.ref}`}
        title={room.citizen.name}
        description={
          room.scheduledAt
            ? `Rendez-vous du ${formatWeekday(room.scheduledAt)}, ${formatTime(room.scheduledAt)} – ${room.scheduledEndAt ? formatTime(room.scheduledEndAt) : ""} (heure de Libreville).`
            : "Entretien sans créneau planifié."
        }
        actions={
          <div className="flex items-center gap-2">
            <LoABadge level={room.citizen.loa} />
            {room.status === "approved" && <StatusPill tone="green" size="md">Niveau 3 accordé</StatusPill>}
            {room.status === "rejected" && <StatusPill tone="red" size="md">Refusé</StatusPill>}
            {room.status === "in_interview" && <StatusPill tone="blue" size="md">Entretien ouvert</StatusPill>}
          </div>
        }
      />
      <div className="grid flex-1 gap-6 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
        <div className="min-w-0 space-y-4">
          {decided ? (
            <Panel>
              <EmptyState
                icon={room.status === "approved" ? CheckCircle2Icon : CircleSlashIcon}
                title={room.status === "approved" ? "Niveau 3 accordé" : "Niveau 3 refusé"}
                action={<Button asChild variant="outline"><Link href="/agenda">Revenir à l&apos;agenda</Link></Button>}
              >
                {room.status === "approved"
                  ? `Décision enregistrée ${room.decidedAt ? `le ${formatDateTime(room.decidedAt)}` : ""}. L'identité numérique de ${room.citizen.name} est au Niveau 3 et le titulaire en est notifié.`
                  : `Motif communiqué au titulaire : ${room.rejectionReason ?? "non renseigné"}.`}
              </EmptyState>
            </Panel>
          ) : credentials ? (
            <>
              <LiveVideoRoom
                serverUrl={credentials.serverUrl}
                token={credentials.token}
                className="h-[min(64vh,680px)] rounded-xl"
                onError={(err) => setVideoError(err.message)}
                onDisconnected={() => setCredentials(null)}
              />
              {videoError && (
                <p role="alert" className="text-[13px] text-destructive">
                  Connexion vidéo interrompue : {videoError}. Vous pouvez rejoindre à nouveau la salle.
                </p>
              )}
            </>
          ) : (
            <Panel>
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 rounded-xl bg-[#10120e] px-6 py-10 text-center text-[#F2F0E8]">
                {room.canJoin ? <VideoIcon aria-hidden className="size-8" /> : <VideoOffIcon aria-hidden className="size-8 opacity-70" />}
                <p className="text-base font-semibold">
                  {!room.assignedToMe
                    ? "Entretien assigné à un autre contrôleur"
                    : room.canJoin
                      ? room.status === "in_interview"
                        ? "L'entretien est ouvert : vous pouvez rejoindre la salle"
                        : "La salle est ouverte"
                      : room.joinOpensAt && room.joinOpensAt > now
                        ? `La salle ouvrira ${relativeTime(room.joinOpensAt, now)}, à ${formatTime(room.joinOpensAt)}`
                        : "Le créneau de cet entretien est passé"}
                </p>
                <p className="max-w-[48ch] text-[13px] opacity-80">
                  La caméra et le micro de ce poste seront utilisés. Le citoyen rejoint depuis son espace IDN.
                </p>
                {room.assignedToMe && room.canJoin && active && (
                  <Button onClick={join} disabled={joining} size="lg" className="mt-2">
                    <VideoIcon aria-hidden />
                    {joining ? "Connexion…" : "Rejoindre la salle"}
                  </Button>
                )}
              </div>
            </Panel>
          )}

          {room.assignedToMe && room.status === "in_interview" && (
            <Panel title="Issue de l'entretien" description="Cochez les vérifications faites pendant l'entretien avant d'accorder le Niveau 3.">
              <fieldset className="space-y-2 px-5 py-4">
                <legend className="sr-only">Vérifications</legend>
                {CHECKS.map((check) => (
                  <label key={check.id} className="flex cursor-pointer items-start gap-3 text-sm text-idn-ink">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[check.id])}
                      onChange={(e) => setChecked((c) => ({ ...c, [check.id]: e.target.checked }))}
                      className="mt-0.5 size-4 accent-[#0E7C3A]"
                    />
                    {check.label}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-wrap items-center gap-2 border-t border-idn-border-soft px-5 py-3">
                {credentials && (
                  <Button variant="ghost" onClick={() => setCredentials(null)} className="mr-auto">
                    Quitter la salle
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null)
                    setDialog("reject")
                  }}
                  className="text-[#B3261E] hover:text-[#B3261E] dark:text-[#FF8A80]"
                >
                  <CircleSlashIcon aria-hidden />
                  Refuser
                </Button>
                <Button
                  disabled={!allChecked}
                  onClick={() => {
                    setError(null)
                    setDialog("approve")
                  }}
                >
                  <ShieldCheckIcon aria-hidden />
                  Accorder le Niveau 3
                </Button>
              </div>
            </Panel>
          )}
        </div>

        <aside className="space-y-4" aria-label="Dossier de la personne">
          <Panel title="Identité déclarée">
            {declared ? (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 px-5 py-4">
                <Field label="Nom">{declared.lastName}</Field>
                <Field label="Prénoms">{declared.firstName}</Field>
                <Field label="Date de naissance">{formatCivilDate(declared.dateOfBirth)}</Field>
                <Field label="Lieu de naissance">{declared.birthPlace}</Field>
                <Field label="Sexe">{genderLabel(declared.gender)}</Field>
                <Field label="Nationalité">{countryLabel(declared.nationality)}</Field>
                {declared.nip && <Field label="NIP" mono>{declared.nip}</Field>}
                {room.citizen.idnId && <Field label="Identifiant IDN" mono>{room.citizen.idnId}</Field>}
              </dl>
            ) : (
              <p className="px-5 py-4 text-[13px] text-idn-muted">Identité non déclarée.</p>
            )}
          </Panel>
          <Panel
            title="Pièces déposées"
            description={room.documents ? `${documentTypeLabel(room.documents.documentType)} · à comparer avec l'original montré à la caméra` : undefined}
          >
            {room.documents ? (
              <div className="p-4">
                <DocumentGallery
                  className="sm:grid-cols-1 2xl:grid-cols-2"
                  images={[
                    { label: "Recto", url: room.documents.front },
                    { label: "Verso", url: room.documents.back },
                    { label: "Selfie", url: room.documents.selfie },
                  ]}
                />
              </div>
            ) : (
              <p className="px-5 py-4 text-[13px] text-idn-muted">Aucune pièce rattachée à cette demande.</p>
            )}
          </Panel>
        </aside>
      </div>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && !submitting && setDialog(null)}>
        <AlertDialogContent>
          <form onSubmit={decide} className="grid gap-4" noValidate>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog === "approve" ? `Accorder le Niveau 3 à ${room.citizen.name} ?` : `Refuser le Niveau 3 à ${room.citizen.name} ?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {dialog === "approve"
                  ? room.citizen.loa < 2
                    ? "Ses pièces sont constatées par cet entretien : le compte passe directement au Niveau 3 (élevé). Le titulaire est notifié."
                    : "Le compte passe au Niveau 3 (élevé). Le titulaire est notifié."
                  : "La demande est close et le titulaire reçoit le motif. Il pourra déposer une nouvelle demande."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {dialog === "reject" && (
              <div className="space-y-1.5">
                <Label htmlFor="l3-reason">Motif</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="l3-reason" className="w-full" aria-required="true">
                    <SelectValue placeholder="Choisissez un motif" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL3_REJECT_REASONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="l3-details">
                {dialog === "approve"
                  ? "Observation (facultative, non communiquée)"
                  : reason === OTHER_REASON
                    ? "Précisions (obligatoires)"
                    : "Précisions (facultatives)"}
              </Label>
              <Textarea id="l3-details" rows={2} value={details} onChange={(e) => setDetails(e.target.value)} />
            </div>
            {error && (
              <p role="alert" className="text-[13px] text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={submitting}>
                Retour
              </Button>
              <Button type="submit" variant={dialog === "reject" ? "destructive" : "default"} disabled={submitting}>
                {submitting ? "Enregistrement…" : dialog === "approve" ? "Accorder le Niveau 3" : "Refuser"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
