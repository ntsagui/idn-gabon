"use client"

import * as React from "react"
import type { FunctionReturnType } from "convex/server"
import { useMutation, useQuery } from "convex/react"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CheckIcon,
  CircleSlashIcon,
  MinusIcon,
  UserCheckIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { DocumentGallery } from "../../../_components/image-viewer"
import { EmptyState, Field, Panel, Skeleton } from "../../../_components/panel"
import { KycStatusPill, StatusPill, type Tone } from "../../../_components/status-pill"
import { describeError } from "../../../_lib/errors"
import {
  countryLabel,
  documentTypeLabel,
  formatCivilDate,
  formatDateTime,
  fullName,
  genderLabel,
  relativeTime,
  waitingSince,
} from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"
import { DecisionDialog, type DecisionKind } from "./decision-dialog"

type Dossier = NonNullable<FunctionReturnType<typeof api.controller.review.dossier>>

const SIGNALS: Record<Dossier["duplicates"][number]["signal"], { label: string; strong: boolean; help: string }> = {
  nip: { label: "NIP identique", strong: true, help: "Le même NIP est déjà déclaré par un autre compte." },
  document: { label: "Même pièce d'identité", strong: true, help: "Cette pièce a déjà été présentée par un autre compte." },
  face: { label: "Visage similaire", strong: false, help: "Le selfie ressemble à celui d'une identité déjà vérifiée (jumeaux possibles)." },
  pivot: { label: "Même nom et date de naissance", strong: false, help: "Homonymie possible : ce triplet n'est pas un identifiant." },
}

const SIGNAL_STATUS: Record<Dossier["duplicates"][number]["status"], { label: string; tone: Tone }> = {
  open: { label: "Ouvert", tone: "yellow" },
  confirmed: { label: "Confirmé", tone: "red" },
  dismissed: { label: "Écarté", tone: "neutral" },
  superseded: { label: "Clos", tone: "neutral" },
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s'-]+/g, " ")
    .trim()
}

function percent(score: number | undefined): string | null {
  return score === undefined ? null : `${Math.round(score * 100)} %`
}

export function DossierReview({
  kycRequestId,
  onClose,
  onDecided,
}: {
  kycRequestId: Id<"kycRequest">
  onClose: () => void
  onDecided: (id: Id<"kycRequest">) => void
}) {
  const dossier = useQuery(api.controller.review.dossier, { kycRequestId })
  const claim = useMutation(api.controller.queue.claim)
  const now = useNow()
  const [decision, setDecision] = React.useState<DecisionKind | null>(null)
  const [claiming, setClaiming] = React.useState(false)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [dossier?._id])

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || decision) return
      if (document.querySelector("[role=dialog], [role=alertdialog]")) return
      onClose()
    }
    // Phase de capture : on passe AVANT le gestionnaire d'Échap des dialogues
    // (visionneuse, décision), qui les retire du DOM. Sinon Échap fermerait
    // à la fois la visionneuse et le dossier.
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [decision, onClose])

  if (dossier === undefined) {
    return (
      <div className="space-y-4 px-5 py-6 md:px-8" aria-busy="true" aria-label="Chargement du dossier">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="aspect-[1.58/1]" />
          <Skeleton className="aspect-[1.58/1]" />
          <Skeleton className="aspect-[1.58/1]" />
        </div>
        <Skeleton className="h-56" />
      </div>
    )
  }
  if (dossier === null) {
    return (
      <EmptyState
        title="Dossier introuvable"
        action={
          <Button variant="outline" onClick={onClose}>
            Revenir à la file
          </Button>
        }
      >
        Ce dossier n&apos;existe plus. Il a peut-être été supprimé à la demande du titulaire.
      </EmptyState>
    )
  }

  const declared = dossier.citizen.declared
  const name = fullName(declared?.firstName, declared?.lastName) || "Identité non déclarée"
  const claimedByOther = Boolean(dossier.reviewer && !dossier.reviewer.isMe)
  const decidable = dossier.status === "under_review" && !claimedByOther
  const openSignals = dossier.duplicates.filter((d) => d.status === "open")
  const analysisDegraded = dossier.analysis.ocrAvailable === false || dossier.analysis.biometricAvailable === false
  const submittedAt = dossier.submittedAt ?? dossier.createdAt

  const onClaim = async () => {
    setClaiming(true)
    try {
      await claim({ kycRequestId })
      toast.success(`Dossier ${dossier.ref} pris en charge.`)
    } catch (error) {
      toast.error(describeError(error, "Impossible de prendre ce dossier en charge."))
    } finally {
      setClaiming(false)
    }
  }

  return (
    <article aria-labelledby="dossier-title" className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5 px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-start gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="-ml-2 lg:hidden">
            <ArrowLeftIcon aria-hidden />
            File
          </Button>
          <div className="min-w-0 flex-1 basis-full sm:basis-auto">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              {dossier.ref} · {documentTypeLabel(dossier.documentType)} · Demande de Niveau 2
            </p>
            <h2
              id="dossier-title"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 text-xl font-semibold text-idn-ink focus:outline-none"
            >
              {name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-idn-muted">
              <KycStatusPill status={dossier.status} />
              <LoABadge level={dossier.citizen.loa} compact />
              {dossier.citizen.idnId && <span className="font-mono text-xs">{dossier.citizen.idnId}</span>}
              <span>
                Déposé le {formatDateTime(submittedAt)}
                {dossier.status === "under_review" && ` · en attente ${waitingSince(submittedAt, now)}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dossier.status === "under_review" && !dossier.reviewer && (
              <Button variant="outline" size="sm" onClick={onClaim} disabled={claiming}>
                <UserCheckIcon aria-hidden />
                {claiming ? "Prise en charge…" : "Prendre en charge"}
              </Button>
            )}
            {dossier.reviewer?.isMe && dossier.status === "under_review" && (
              <StatusPill tone="green">Pris en charge par vous</StatusPill>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fermer le dossier" className="max-lg:hidden">
              <XIcon aria-hidden />
            </Button>
          </div>
        </div>

        {claimedByOther && (
          <Notice tone="yellow" title="Dossier pris en charge par un autre contrôleur">
            {dossier.reviewer!.name} examine ce dossier : les décisions sont verrouillées pour éviter deux décisions concurrentes.
          </Notice>
        )}
        {openSignals.length > 0 && dossier.status === "under_review" && (
          <Notice tone={openSignals.some((s) => SIGNALS[s.signal].strong) ? "red" : "yellow"} title="Doublon possible à examiner">
            {openSignals.map((s) => SIGNALS[s.signal].label).join(", ")}. Comparez avec le compte en regard avant de
            décider ; une approbation malgré ce signal doit être motivée.
          </Notice>
        )}
        {analysisDegraded && dossier.status === "under_review" && (
          <Notice tone="yellow" title="Analyse automatique incomplète">
            {dossier.analysis.ocrAvailable === false && "La lecture automatique de la pièce n'a pas pu être faite. "}
            {dossier.analysis.biometricAvailable === false && "La comparaison faciale n'a pas pu être faite. "}
            Le dossier exige un contrôle visuel complet.
          </Notice>
        )}
        {(dossier.status === "approved" || dossier.status === "rejected") && dossier.reviewedAt && (
          <Notice tone={dossier.status === "approved" ? "green" : "red"} title={`Décision du ${formatDateTime(dossier.reviewedAt)}`}>
            {dossier.status === "approved"
              ? "Dossier approuvé."
              : `Refusé : ${dossier.rejectionReason ?? "motif non renseigné"}.`}
          </Notice>
        )}
        {dossier.status === "complement_required" && dossier.complementRequest && (
          <Notice tone="yellow" title={`Complément demandé ${relativeTime(dossier.complementRequest.requestedAt, now)}`}>
            {dossier.complementRequest.message}
          </Notice>
        )}

        <Panel title="Pièces" description="Cliquez sur une pièce pour l'agrandir et zoomer.">
          <div className="p-4">
            <DocumentGallery
              images={[
                { label: "Recto", url: dossier.images.front },
                { label: "Verso", url: dossier.images.back },
                { label: "Selfie", url: dossier.images.selfie },
              ]}
            />
          </div>
        </Panel>

        <Comparison dossier={dossier} now={now} />

        <div className="grid gap-5 xl:grid-cols-2">
          <Panel title="Analyse automatique" description="Aide à la décision : elle ne remplace pas l'examen.">
            <dl className="grid grid-cols-3 gap-4 px-5 py-4">
              <Signal
                label="Lecture de la pièce"
                available={dossier.analysis.ocrAvailable}
                value={percent(dossier.analysis.score)}
                hint="confiance"
              />
              <Signal
                label="Correspondance visage"
                available={dossier.analysis.biometricAvailable}
                value={percent(dossier.analysis.faceMatchScore)}
                hint="selfie / pièce"
              />
              <Signal
                label="Présence réelle"
                available={dossier.analysis.biometricAvailable}
                value={
                  dossier.analysis.livenessVerdict === "real"
                    ? "Confirmée"
                    : dossier.analysis.livenessVerdict === "spoof"
                      ? "Usurpation"
                      : dossier.analysis.livenessVerdict === "uncertain"
                        ? "Incertaine"
                        : null
                }
                warn={dossier.analysis.livenessVerdict !== undefined && dossier.analysis.livenessVerdict !== "real"}
              />
            </dl>
          </Panel>

          <Panel title="Signaux de doublon" description="Rapprochements levés à l'inscription ou au dépôt des pièces.">
            {dossier.duplicates.length === 0 ? (
              <p className="px-5 py-4 text-[13px] text-idn-muted">
                Aucun rapprochement avec un autre compte (NIP, pièce, visage, nom et date de naissance).
              </p>
            ) : (
              <ul>
                {dossier.duplicates.map((signal) => (
                  <li key={signal._id} className="border-b border-idn-border-soft px-5 py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-idn-ink">{SIGNALS[signal.signal].label}</span>
                      <StatusPill tone={signal.status === "open" && SIGNALS[signal.signal].strong ? "red" : SIGNAL_STATUS[signal.status].tone}>
                        {SIGNAL_STATUS[signal.status].label}
                      </StatusPill>
                      {signal.score !== undefined && (
                        <span className="font-mono text-xs text-idn-muted">similarité {signal.score.toFixed(2).replace(".", ",")}</span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-idn-muted">{SIGNALS[signal.signal].help}</p>
                    {signal.matched ? (
                      <p className="mt-1 text-[13px] text-idn-ink-2">
                        Compte en regard : <span className="font-medium">{signal.matched.name}</span>
                        {signal.matched.idnId && <span className="font-mono text-xs text-idn-muted"> · {signal.matched.idnId}</span>}
                        {signal.matched.loa && <span className="text-idn-muted"> · Niveau {signal.matched.loa}</span>}
                      </p>
                    ) : (
                      <p className="mt-1 text-[13px] text-idn-muted">Compte en regard supprimé.</p>
                    )}
                    <p className="mt-0.5 text-xs text-idn-muted">Détecté {relativeTime(signal.detectedAt, now)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Historique du dossier">
          {dossier.timeline.length === 0 && dossier.previousRequests.length === 0 ? (
            <p className="px-5 py-4 text-[13px] text-idn-muted">Aucun événement enregistré pour ce dossier.</p>
          ) : (
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <ol className="px-5 py-4">
                {dossier.timeline.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                    <span aria-hidden className="relative mt-1.5 flex flex-col items-center">
                      <span className="size-2 rounded-full bg-idn-green" />
                      {index < dossier.timeline.length - 1 && (
                        <span className="absolute top-3 h-[calc(100%+0.25rem)] w-px bg-idn-border" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-idn-ink">{event.label}</p>
                      <p className="text-xs text-idn-muted">
                        <span className="font-mono">{formatDateTime(event.at)}</span> · {event.actor}
                      </p>
                      {event.detail && <p className="mt-0.5 text-[13px] text-idn-ink-2">« {event.detail} »</p>}
                    </div>
                  </li>
                ))}
                {dossier.level3 && (
                  <li className="mt-2 rounded-lg bg-idn-surface-2 px-3 py-2 text-[13px] text-idn-ink-2">
                    Pièces rattachées à la demande Niveau 3 <span className="font-mono text-xs">{dossier.level3.ref}</span>
                    {dossier.level3.scheduledAt && ` · entretien prévu le ${formatDateTime(dossier.level3.scheduledAt)}`}
                  </li>
                )}
              </ol>
              <div className="border-t border-idn-border-soft px-5 py-4 xl:border-l xl:border-t-0">
                <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
                  Demandes antérieures
                </h3>
                {dossier.previousRequests.length === 0 ? (
                  <p className="mt-2 text-[13px] text-idn-muted">Première demande de ce compte.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {dossier.previousRequests.map((previous) => (
                      <li key={previous._id} className="text-[13px]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-idn-ink-2">{previous.ref}</span>
                          <KycStatusPill status={previous.status} />
                        </div>
                        <p className="text-xs text-idn-muted">
                          {documentTypeLabel(previous.documentType)} · {formatDateTime(previous.at)}
                        </p>
                        {previous.rejectionReason && <p className="text-xs text-idn-ink-2">« {previous.rejectionReason} »</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>

      {decidable && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-2 border-t border-idn-border bg-idn-surface px-5 py-3 md:px-8">
          <p className="mr-auto text-[13px] text-idn-muted max-sm:basis-full">Décision sur le dossier {dossier.ref}</p>
          <Button variant="outline" onClick={() => setDecision("reject")} className="text-[#B3261E] hover:text-[#B3261E] dark:text-[#FF8A80]">
            <CircleSlashIcon aria-hidden />
            Refuser
          </Button>
          <Button variant="outline" onClick={() => setDecision("complement")}>
            Demander un complément
          </Button>
          <Button onClick={() => setDecision("approve")}>
            <CheckIcon aria-hidden />
            Approuver
          </Button>
        </div>
      )}

      {decision && (
        <DecisionDialog
          kind={decision}
          dossier={{ _id: dossier._id, ref: dossier.ref, name, openSignals: openSignals.length }}
          onCancel={() => setDecision(null)}
          onDone={() => {
            setDecision(null)
            onDecided(dossier._id)
          }}
        />
      )}
    </article>
  )
}

function Notice({ tone, title, children }: { tone: "yellow" | "red" | "green"; title: string; children: React.ReactNode }) {
  const styles = {
    yellow: "border-[#9A7400]/30 bg-idn-yellow-soft text-[#4D3C00] dark:bg-[#3A2E14] dark:text-[#F2C94C]",
    red: "border-[#B3261E]/30 bg-[#FBE9E7] text-[#8C1D18] dark:bg-[#3A1E1E] dark:text-[#FF8A80]",
    green: "border-idn-green/30 bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
  }[tone]
  return (
    <div role={tone === "green" ? "status" : "note"} className={cn("flex gap-3 rounded-lg border px-4 py-3", styles)}>
      {tone === "green" ? (
        <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertTriangleIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
      )}
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="font-semibold">{title}</p>
        <p>{children}</p>
      </div>
    </div>
  )
}

function Signal({
  label,
  value,
  available,
  hint,
  warn,
}: {
  label: string
  value: string | null
  available: boolean | undefined
  hint?: string
  warn?: boolean
}) {
  const unavailable = available === false
  return (
    <div>
      <dt className="text-xs text-idn-muted">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          unavailable || warn ? "text-[#6B5400] dark:text-[#F2C94C]" : "text-idn-ink",
        )}
      >
        {unavailable ? "Indisponible" : (value ?? "Non mesurée")}
      </dd>
      {hint && !unavailable && value && <dd className="text-xs text-idn-muted">{hint}</dd>}
    </div>
  )
}

const ROWS: Array<{
  key: string
  label: string
  declared: (d: NonNullable<Dossier["citizen"]["declared"]>) => string | undefined
  display?: (v: string) => string
}> = [
  { key: "lastName", label: "Nom", declared: (d) => d.lastName },
  { key: "firstName", label: "Prénoms", declared: (d) => d.firstName },
  { key: "dateOfBirth", label: "Date de naissance", declared: (d) => d.dateOfBirth, display: formatCivilDate },
  { key: "birthPlace", label: "Lieu de naissance", declared: (d) => d.birthPlace },
  { key: "gender", label: "Sexe", declared: (d) => d.gender, display: genderLabel },
  { key: "nationality", label: "Nationalité", declared: (d) => d.nationality, display: countryLabel },
  { key: "nip", label: "NIP", declared: (d) => d.nip },
]

/** Données déclarées par le titulaire face à ce que l'OCR a lu sur la pièce. */
function Comparison({ dossier, now }: { dossier: Dossier; now: number }) {
  const declared = dossier.citizen.declared
  const extracted = dossier.extracted
  const expiresOn = extracted?.expiresOn
  const expired = expiresOn ? Date.parse(`${expiresOn}T23:59:59+01:00`) < now : false
  const mismatches = declared && extracted
    ? ROWS.filter((row) => {
        const a = row.declared(declared)
        const b = extracted[row.key]
        return a && b && normalize(a) !== normalize(b)
      }).length
    : 0

  return (
    <Panel
      title="Données déclarées et pièce"
      description={
        extracted
          ? mismatches > 0
            ? `${mismatches} écart${mismatches > 1 ? "s" : ""} entre la déclaration et la lecture de la pièce.`
            : "La lecture de la pièce concorde avec la déclaration."
          : "Lecture automatique non disponible pour ce dossier : comparez à l'œil avec la pièce."
      }
    >
      {!declared ? (
        <p className="px-5 py-4 text-[13px] text-idn-muted">Le titulaire n&apos;a pas encore déclaré son identité.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-idn-border-soft text-xs text-idn-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Champ</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Déclaré</th>
                {extracted && <th scope="col" className="px-3 py-2.5 font-medium">Lu sur la pièce</th>}
                {extracted && <th scope="col" className="px-5 py-2.5 font-medium">Concordance</th>}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const a = row.declared(declared)
                const b = extracted?.[row.key]
                const show = (v: string | undefined) => (v ? (row.display ? row.display(v) : v) : null)
                const state = !extracted ? null : !a || !b ? "missing" : normalize(a) === normalize(b) ? "match" : "diff"
                return (
                  <tr key={row.key} className={cn("border-b border-idn-border-soft last:border-b-0", state === "diff" && "bg-[#FBE9E7]/60 dark:bg-[#3A1E1E]/60")}>
                    <th scope="row" className="whitespace-nowrap px-5 py-2.5 font-medium text-idn-ink-2">{row.label}</th>
                    <td className={cn("px-3 py-2.5 text-idn-ink", row.key === "nip" && "font-mono")}>{show(a) ?? <span className="text-idn-muted">Non déclaré</span>}</td>
                    {extracted && (
                      <td className="px-3 py-2.5 text-idn-ink">{show(b) ?? <span className="text-idn-muted">{row.key === "nip" ? "Non lu (jamais conservé)" : "Non lu"}</span>}</td>
                    )}
                    {extracted && (
                      <td className="px-5 py-2.5">
                        {state === "match" ? (
                          <span className="inline-flex items-center gap-1 text-idn-green-dark dark:text-idn-green-on-dark"><CheckIcon aria-hidden className="size-4" />Concorde</span>
                        ) : state === "diff" ? (
                          <span className="inline-flex items-center gap-1 font-medium text-[#B3261E] dark:text-[#FF8A80]"><XIcon aria-hidden className="size-4" />Diffère</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-idn-muted"><MinusIcon aria-hidden className="size-4" />À vérifier à l&apos;œil</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {expiresOn && (
            <dl className="flex flex-wrap gap-6 border-t border-idn-border-soft px-5 py-3">
              <Field label="Expiration de la pièce">
                <span className={cn(expired && "font-medium text-[#B3261E] dark:text-[#FF8A80]")}>
                  {formatCivilDate(expiresOn)}
                  {expired ? " · pièce expirée" : ""}
                </span>
              </Field>
              <Field label="Compte créé">
                {dossier.citizen.accountCreatedAt ? formatDateTime(dossier.citizen.accountCreatedAt) : "Date inconnue"}
              </Field>
            </dl>
          )}
        </div>
      )}
    </Panel>
  )
}
