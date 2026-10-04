"use client"

import * as React from "react"
import type { FunctionReturnType } from "convex/server"
import { SearchIcon, ShieldCheckIcon } from "lucide-react"

import type { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select"
import { cn } from "@repo/ui/lib/utils"

import { kycStatus, type KycStatus } from "../../../_content/fr"
import { EmptyState, Skeleton } from "../../../_components/panel"
import { KycStatusPill } from "../../../_components/status-pill"
import { delayTone, documentTypeLabel, waitingSince } from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"

export const PAGE_SIZE = 20

type ListResult = FunctionReturnType<typeof api.controller.queue.listForReview>

const DELAY_CLASS = {
  ok: "text-idn-muted",
  attention: "text-[#6B5400] dark:text-[#F2C94C]",
  late: "text-[#B3261E] dark:text-[#FF8A80] font-medium",
} as const

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    target.closest("[role=dialog], [role=listbox], [role=menu]") !== null
  )
}

/**
 * Colonne de la file. Raccourcis clavier : J / K pour parcourir la liste,
 * Entrée pour ouvrir le dossier mis en évidence (hors champs de saisie).
 */
export function QueueList({
  result,
  status,
  search,
  page,
  selectedId,
  setParams,
}: {
  result: ListResult | undefined
  status: KycStatus | undefined
  search: string
  page: number
  selectedId: Id<"kycRequest"> | null
  setParams: (next: Record<string, string | null>) => void
}) {
  const now = useNow()
  const [draft, setDraft] = React.useState(search)
  const [cursor, setCursor] = React.useState<number>(-1)
  const listRef = React.useRef<HTMLUListElement>(null)
  const items = React.useMemo(() => result?.items ?? [], [result])
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1

  // La frappe reste locale ; l'URL suit après une courte pause.
  React.useEffect(() => {
    if (draft === search) return
    const timer = window.setTimeout(() => setParams({ q: draft, page: null }), 300)
    return () => window.clearTimeout(timer)
  }, [draft, search, setParams])

  const selectedIndex = items.findIndex((item) => item._id === selectedId)
  const active = cursor >= 0 && cursor < items.length ? cursor : selectedIndex

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return
      if (items.length === 0) return
      const key = event.key.toLowerCase()
      if (key === "j" || key === "k") {
        event.preventDefault()
        const from = active < 0 ? (key === "j" ? -1 : items.length) : active
        const next = Math.min(items.length - 1, Math.max(0, from + (key === "j" ? 1 : -1)))
        setCursor(next)
        listRef.current?.querySelectorAll<HTMLElement>("[data-row]")[next]?.scrollIntoView({ block: "nearest" })
      } else if (event.key === "Enter" && active >= 0 && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault()
        setParams({ id: items[active]!._id })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [items, active, setParams])

  return (
    <div className="flex h-full min-h-0 flex-col bg-idn-surface">
      <div className="space-y-2 border-b border-idn-border-soft p-3">
        <div className="relative">
          <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
          <Input
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Rechercher un dossier"
            placeholder="Nom, NIP, identifiant IDN, référence"
            className="pl-9"
          />
        </div>
        <Select
          value={status ?? "all"}
          onValueChange={(value) => setParams({ status: value === "under_review" ? null : value, page: null })}
        >
          <SelectTrigger className="w-full" aria-label="Filtrer par statut">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="under_review">À examiner (en revue)</SelectItem>
            <SelectItem value="complement_required">{kycStatus.complement_required}</SelectItem>
            <SelectItem value="approved">{kycStatus.approved}</SelectItem>
            <SelectItem value="rejected">{kycStatus.rejected}</SelectItem>
            <SelectItem value="submitted">{kycStatus.submitted}</SelectItem>
            <SelectItem value="pending">{kycStatus.pending}</SelectItem>
            <SelectItem value="expired">{kycStatus.expired}</SelectItem>
            <SelectItem value="all">Tous les statuts</SelectItem>
          </SelectContent>
        </Select>
        {result?.capped && (
          <p role="status" className="text-xs leading-snug text-[#6B5400] dark:text-[#F2C94C]">
            Seules les {result.scanCap} premières demandes de ce statut sont parcourues : affinez le filtre ou la recherche.
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {result === undefined ? (
          <ul aria-busy="true" aria-label="Chargement des dossiers">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="space-y-2 border-b border-idn-border-soft px-4 py-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </li>
            ))}
          </ul>
        ) : items.length === 0 ? (
          <EmptyState icon={search ? SearchIcon : ShieldCheckIcon} title={search ? "Aucun résultat" : "Aucun dossier"}>
            {search
              ? "Aucun dossier ne correspond à cette recherche dans ce statut. Essayez « Tous les statuts »."
              : status === "under_review"
                ? "Aucun dossier n'attend d'examen. Les nouveaux dépôts apparaîtront ici."
                : "Aucun dossier dans ce statut."}
          </EmptyState>
        ) : (
          <ul ref={listRef} aria-label="Dossiers">
            {items.map((item, index) => {
              const selected = item._id === selectedId
              const submittedAt = item.submittedAt
              return (
                <li key={item._id} data-row>
                  <button
                    type="button"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => {
                      setCursor(index)
                      setParams({ id: item._id })
                    }}
                    className={cn(
                      "relative w-full border-b border-idn-border-soft px-4 py-3 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      selected ? "bg-idn-green-soft dark:bg-[#0F2A18]" : "hover:bg-idn-surface-2",
                      index === active && !selected && "bg-idn-surface-2",
                    )}
                  >
                    {index === active && (
                      <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-idn-green" />
                    )}
                    <span className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-idn-ink">{item.name}</span>
                      {submittedAt && (
                        <span className={cn("shrink-0 text-xs", DELAY_CLASS[delayTone(submittedAt, now)])}>
                          {waitingSince(submittedAt, now)}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-idn-muted">
                      <span className="font-mono">{item.ref}</span> · {documentTypeLabel(item.documentType)}
                    </span>
                    {(item.status !== "under_review" || status !== "under_review") && (
                      <span className="mt-2 flex">
                        <KycStatusPill status={item.status} />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-idn-border-soft px-3 py-2.5">
        <p className="min-w-0 flex-1 text-xs text-idn-muted">
          {result === undefined
            ? "Chargement…"
            : `Page ${page + 1} sur ${pages} · ${result.total} dossier${result.total > 1 ? "s" : ""}`}
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0}
          onClick={() => setParams({ page: page > 1 ? String(page - 1) : null })}
        >
          Précédent
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={result === undefined || page + 1 >= pages}
          onClick={() => setParams({ page: String(page + 1) })}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
}
