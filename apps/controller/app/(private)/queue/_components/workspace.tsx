"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { kycStatus, pages, type KycStatus } from "../../../_content/fr"
import { PageHeader } from "../../../_components/page-header"
import { formatNumber } from "../../../_lib/format"
import { DossierReview } from "./dossier-review"
import { PAGE_SIZE, QueueList } from "./queue-list"
import { QueueSummary } from "./queue-summary"

const STATUSES = Object.keys(kycStatus) as KycStatus[]

function isStatus(value: string | null): value is KycStatus {
  return value !== null && (STATUSES as string[]).includes(value)
}

export function QueueWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const selectedId = params.get("id") as Id<"kycRequest"> | null
  const statusParam = params.get("status")
  const status: KycStatus | undefined = statusParam === "all" ? undefined : isStatus(statusParam) ? statusParam : "under_review"
  const search = params.get("q") ?? ""
  const pageParam = Number.parseInt(params.get("page") ?? "0", 10)
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 0

  const setParams = React.useCallback(
    (next: Record<string, string | null>) => {
      const sp = new URLSearchParams(params.toString())
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") sp.delete(key)
        else sp.set(key, value)
      }
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  const result = useQuery(api.controller.queue.listForReview, {
    status,
    search: search || undefined,
    page,
    pageSize: PAGE_SIZE,
  })
  const counts = useQuery(api.controller.dashboard.counts, {})

  // Instantané de l'ordre de la liste au moment de la décision : le dossier
  // tranché quitte la liste réactive, on enchaîne sur celui qui le suivait.
  const items = React.useMemo(() => result?.items ?? [], [result])
  const openNext = React.useCallback(
    (decidedId: Id<"kycRequest">) => {
      const index = items.findIndex((item) => item._id === decidedId)
      const candidates = index >= 0 ? [...items.slice(index + 1), ...items.slice(0, index).reverse()] : items
      const next = candidates.find((item) => item._id !== decidedId && item.status === "under_review")
      setParams({ id: next ? next._id : null })
    },
    [items, setParams],
  )

  const queueCount = counts?.queue
  const description =
    queueCount === undefined
      ? pages.queue.description
      : queueCount === 0
        ? "Aucun dossier n'attend d'examen."
        : `${formatNumber(queueCount)}${counts?.queueCapped ? "+" : ""} dossier${queueCount > 1 ? "s" : ""} à examiner, du plus ancien au plus récent.`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader kicker={pages.queue.kicker} title={pages.queue.title} description={description} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className={cn("min-h-0 border-idn-border lg:border-r", selectedId && "max-lg:hidden")}>
          <QueueList
            result={result}
            status={status}
            search={search}
            page={page}
            selectedId={selectedId}
            setParams={setParams}
          />
        </div>
        <div className={cn("min-h-0 overflow-y-auto bg-idn-bg", !selectedId && "max-lg:hidden")}>
          {selectedId ? (
            <DossierReview
              key={selectedId}
              kycRequestId={selectedId}
              onClose={() => setParams({ id: null })}
              onDecided={openNext}
            />
          ) : (
            <QueueSummary items={status === "under_review" && !search ? items : undefined} onOpen={(id) => setParams({ id })} />
          )}
        </div>
      </div>
    </div>
  )
}
