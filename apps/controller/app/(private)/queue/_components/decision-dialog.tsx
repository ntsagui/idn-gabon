"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog"
import { Label } from "@repo/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"
import { Textarea } from "@repo/ui/components/textarea"

import { describeError } from "../../../_lib/errors"

export type DecisionKind = "approve" | "complement" | "reject"

const OTHER = "autre"

/** Motifs normalisés : le citoyen reçoit le libellé, suivi des précisions éventuelles. */
const REASONS: Record<"complement" | "reject", Array<{ value: string; label: string }>> = {
  complement: [
    { value: "recto", label: "Photo du recto illisible ou floue" },
    { value: "verso", label: "Verso de la pièce manquant ou illisible" },
    { value: "selfie", label: "Selfie non conforme (lumière, cadrage, visage couvert)" },
    { value: "expiree", label: "Pièce expirée : fournissez une pièce en cours de validité" },
    { value: "ecart", label: "Données déclarées différentes de la pièce" },
    { value: OTHER, label: "Autre motif" },
  ],
  reject: [
    { value: "falsification", label: "Pièce falsifiée ou altérée" },
    { value: "visage", label: "Le visage ne correspond pas à la pièce" },
    { value: "doublon", label: "Identité déjà rattachée à un autre compte" },
    { value: "irrecevable", label: "Pièce non recevable pour le Niveau 2" },
    { value: "usurpation", label: "Usurpation suspectée au contrôle de présence" },
    { value: OTHER, label: "Autre motif" },
  ],
}

const COPY = {
  approve: {
    title: (ref: string) => `Approuver le dossier ${ref}`,
    confirm: "Approuver",
    pending: "Approbation…",
  },
  complement: {
    title: (ref: string) => `Demander un complément · ${ref}`,
    confirm: "Envoyer la demande",
    pending: "Envoi…",
  },
  reject: {
    title: (ref: string) => `Refuser le dossier ${ref}`,
    confirm: "Refuser le dossier",
    pending: "Refus…",
  },
}

export function DecisionDialog({
  kind,
  dossier,
  onCancel,
  onDone,
}: {
  kind: DecisionKind
  dossier: { _id: Id<"kycRequest">; ref: string; name: string; openSignals: number }
  onCancel: () => void
  onDone: () => void
}) {
  const approve = useMutation(api.controller.queue.approve)
  const requestComplement = useMutation(api.controller.queue.requestComplement)
  const reject = useMutation(api.controller.queue.reject)

  const [reason, setReason] = React.useState("")
  const [details, setDetails] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const copy = COPY[kind]
  const noteRequired = kind === "approve" && dossier.openSignals > 0

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    let message = ""
    if (kind !== "approve") {
      const option = REASONS[kind].find((r) => r.value === reason)
      if (!option) {
        setError("Choisissez un motif dans la liste.")
        return
      }
      if (option.value === OTHER && details.trim().length < 5) {
        setError("Précisez le motif (au moins 5 caractères).")
        return
      }
      message = option.value === OTHER ? details.trim() : details.trim() ? `${option.label} — ${details.trim()}` : option.label
    } else if (noteRequired && details.trim().length < 5) {
      setError("Un signal de doublon est ouvert : motivez votre approbation (au moins 5 caractères).")
      return
    }

    setSubmitting(true)
    try {
      if (kind === "approve") {
        await approve({ kycRequestId: dossier._id, ...(details.trim() ? { notes: details.trim() } : {}) })
        toast.success(`Dossier ${dossier.ref} approuvé : ${dossier.name} passe au Niveau 2.`)
      } else if (kind === "complement") {
        await requestComplement({ kycRequestId: dossier._id, message })
        toast.success(`Complément demandé à ${dossier.name}.`)
      } else {
        await reject({ kycRequestId: dossier._id, reason: message })
        toast.success(`Dossier ${dossier.ref} refusé. ${dossier.name} est notifié du motif.`)
      }
      onDone()
    } catch (err) {
      setError(describeError(err, "La décision n'a pas pu être enregistrée. Réessayez."))
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !submitting && onCancel()}>
      <AlertDialogContent className="sm:max-w-[520px]">
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.title(dossier.ref)}</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "approve" &&
                `Le compte de ${dossier.name} passera au Niveau 2 (substantiel) et son visage entrera dans la galerie anti-doublon. Le titulaire est notifié.`}
              {kind === "complement" &&
                `Le dossier quitte la file jusqu'au renvoi des pièces. ${dossier.name} reçoit le motif et peut renvoyer la pièce concernée.`}
              {kind === "reject" &&
                `Décision définitive pour ce dossier : ${dossier.name} devra déposer une nouvelle demande. Le motif lui est communiqué.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {kind !== "approve" && (
            <div className="space-y-1.5">
              <Label htmlFor="decision-reason">Motif</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="decision-reason" className="w-full" aria-required="true">
                  <SelectValue placeholder="Choisissez un motif" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS[kind].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="decision-details">
              {kind === "approve"
                ? noteRequired
                  ? "Motivation (obligatoire, non communiquée au titulaire)"
                  : "Observation (facultative, non communiquée au titulaire)"
                : reason === OTHER
                  ? "Précisions (obligatoires)"
                  : "Précisions pour le titulaire (facultatives)"}
            </Label>
            <Textarea
              id="decision-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={
                kind === "approve"
                  ? "Ex. : homonyme vérifié, dates de naissance différentes."
                  : "Ex. : le numéro de la pièce est masqué par un reflet."
              }
            />
          </div>

          {error && (
            <p role="alert" className="text-[13px] text-destructive">
              {error}
            </p>
          )}

          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" variant={kind === "reject" ? "destructive" : "default"} disabled={submitting}>
              {submitting ? copy.pending : copy.confirm}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
