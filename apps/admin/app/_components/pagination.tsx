"use client"

import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { fmtNumber } from "../_lib/format"

/**
 * Pagination numérotée : savoir où l'on est, revenir, sauter à une page.
 * Au-delà de 7 pages, la barre se replie autour de la page courante.
 */
function pageItems(page: number, pageCount: number): Array<number | null> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i)
  const items: Array<number | null> = [0]
  const from = Math.max(1, Math.min(page - 1, pageCount - 4))
  const to = Math.min(pageCount - 2, Math.max(page + 1, 3))
  if (from > 1) items.push(null)
  for (let i = from; i <= to; i++) items.push(i)
  if (to < pageCount - 2) items.push(null)
  items.push(pageCount - 1)
  return items
}

export function Pagination({
  page,
  pageCount,
  total,
  noun,
  onChange,
}: {
  page: number
  pageCount: number
  total: number
  noun: [string, string]
  onChange: (page: number) => void
}) {
  const totalLabel = `${fmtNumber(total)} ${total > 1 ? noun[1] : noun[0]}`
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-idn-border px-4 py-3"
    >
      <p className="text-[13px] text-idn-muted" aria-live="polite">
        {pageCount > 1 ? `Page ${page + 1} sur ${pageCount} · ${totalLabel}` : totalLabel}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(page - 1)}
            disabled={page === 0}
          >
            Précédent
          </Button>
          {pageItems(page, pageCount).map((n, i) =>
            n === null ? (
              <span key={`gap-${i}`} aria-hidden className="px-1 text-xs text-idn-muted">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Page ${n + 1}`}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                  n === page
                    ? "border-idn-green bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                    : "border-idn-border text-idn-ink hover:bg-idn-surface-2",
                )}
              >
                {n + 1}
              </button>
            ),
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount - 1}
          >
            Suivant
          </Button>
        </div>
      ) : null}
    </nav>
  )
}
