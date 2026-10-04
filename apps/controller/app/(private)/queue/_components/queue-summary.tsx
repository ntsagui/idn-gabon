"use client"

import * as React from "react"
import type { FunctionReturnType } from "convex/server"
import { useQuery } from "convex/react"
import { ArrowRightIcon, ShieldCheckIcon } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"

import { EmptyState, Panel, Skeleton, StatTile } from "../../../_components/panel"
import { documentTypeLabel, formatNumber, waitingSince } from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"

type Item = FunctionReturnType<typeof api.controller.queue.listForReview>["items"][number]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-idn-border bg-idn-surface px-1.5 font-mono text-xs text-idn-ink">
      {children}
    </kbd>
  )
}

/** Panneau affiché tant qu'aucun dossier n'est ouvert : de quoi démarrer tout de suite. */
export function QueueSummary({
  items,
  onOpen,
}: {
  items: Item[] | undefined
  onOpen: (id: Id<"kycRequest">) => void
}) {
  const summary = useQuery(api.controller.dashboard.summary, {})
  const now = useNow()
  const next = items?.find((item) => item.status === "under_review")

  return (
    <div className="mx-auto max-w-[760px] space-y-5 px-5 py-6 md:px-8">
      {summary === undefined ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : summary.queue.toReview === 0 ? (
        <Panel>
          <EmptyState icon={ShieldCheckIcon} title="File à jour">
            Aucun dossier n&apos;attend d&apos;examen. Consultez les compléments demandés ou l&apos;historique de vos décisions.
          </EmptyState>
        </Panel>
      ) : (
        <Panel title="Prochain dossier" description="Le plus ancien en attente : la file se traite dans l'ordre d'arrivée.">
          {(() => {
            const target = next
              ? { id: next._id, name: next.name, at: next.submittedAt, detail: `${next.ref} · ${documentTypeLabel(next.documentType)}` }
              : summary.queue.next
                ? { id: summary.queue.next.kycRequestId, name: summary.queue.next.name, at: summary.queue.next.submittedAt, detail: "" }
                : null
            if (!target) return null
            return (
              <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-idn-ink">{target.name}</p>
                  <p className="mt-0.5 text-[13px] text-idn-muted">
                    {target.detail && <span className="font-mono">{target.detail}</span>}
                    {target.detail && target.at ? " · " : ""}
                    {target.at ? `en attente ${waitingSince(target.at, now)}` : ""}
                  </p>
                </div>
                <Button onClick={() => onOpen(target.id)}>
                  Ouvrir le dossier
                  <ArrowRightIcon aria-hidden />
                </Button>
              </div>
            )
          })()}
        </Panel>
      )}

      {summary && summary.queue.toReview > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Moins de 3 jours" value={formatNumber(summary.queue.byAge.under1d + summary.queue.byAge.d1to3)} context="Dans les délais" />
          <StatTile label="3 à 7 jours" value={formatNumber(summary.queue.byAge.d3to7)} context="À traiter en priorité" />
          <StatTile label="Plus de 7 jours" value={formatNumber(summary.queue.byAge.over7d)} context="Délai de traitement dépassé" />
        </div>
      )}

      <Panel title="Raccourcis clavier" headingLevel={2}>
        <dl className="grid gap-3 px-5 py-4 text-[13px] sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <dt className="flex gap-1">
              <Kbd>J</Kbd>
              <Kbd>K</Kbd>
            </dt>
            <dd className="text-idn-ink-2">Dossier suivant / précédent dans la liste</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt>
              <Kbd>Entrée</Kbd>
            </dt>
            <dd className="text-idn-ink-2">Ouvrir le dossier mis en évidence</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt>
              <Kbd>Échap</Kbd>
            </dt>
            <dd className="text-idn-ink-2">Fermer le dossier ouvert</dd>
          </div>
          <div className="flex items-center gap-3">
            <dt className="flex gap-1">
              <Kbd>+</Kbd>
              <Kbd>−</Kbd>
            </dt>
            <dd className="text-idn-ink-2">Zoomer sur une pièce agrandie</dd>
          </div>
        </dl>
      </Panel>
      {summary && summary.queue.complementRequired > 0 && (
        <p className="text-[13px] text-idn-muted">
          {summary.queue.complementRequired} dossier{summary.queue.complementRequired > 1 ? "s attendent" : " attend"} un complément du citoyen ; il{summary.queue.complementRequired > 1 ? "s reviendront" : " reviendra"} dans la file au renvoi des pièces.
        </p>
      )}
    </div>
  )
}
