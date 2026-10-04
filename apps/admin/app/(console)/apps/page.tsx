"use client"

/**
 * Applications OAuth — une ligne par application logique (Sandbox et
 * Production regroupées), avec propriétaire, statut, environnements et scopes.
 */
import { Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { Search } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { Input } from "@repo/ui/components/input"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { CreateAppDialog } from "../../_components/create-app-dialog"
import { EmptyState } from "../../_components/empty-state"
import { PageBody, PageHeader } from "../../_components/page-header"
import { Pagination } from "../../_components/pagination"
import { PersonCell } from "../../_components/person"
import { TableSkeleton } from "../../_components/skeleton"
import { StatusPill } from "../../_components/status-pill"
import { DataTable, SortTh, Td, Th, Tr } from "../../_components/table"
import { appStatus, scopeList } from "../../_lib/apps"
import { fmtDate, fmtNumber, plural, relativeTime } from "../../_lib/format"

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  ["all", "Toutes"],
  ["production", "En production"],
  ["pending", "Revue demandée"],
  ["sandbox", "Sandbox"],
  ["suspended", "Suspendues"],
  ["disabled", "Désactivées"],
] as const

type StatusFilter = (typeof STATUS_FILTERS)[number][0]

export default function AppsPage() {
  return (
    <Suspense fallback={null}>
      <AppsPageInner />
    </Suspense>
  )
}

function AppsPageInner() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const statusParam = params.get("statut")
  const filter: StatusFilter = STATUS_FILTERS.some(([k]) => k === statusParam)
    ? (statusParam as StatusFilter)
    : "all"

  const apps = useQuery(api.admin.oauthApps.listApps, { limit: 500 })
  const owners = useQuery(api.admin.appControl.listOwners, {})
  const [q, setQ] = useState("")
  const [sort, setSort] = useState<{ key: "name" | "created"; dir: "asc" | "desc" }>({
    key: "created",
    dir: "desc",
  })
  const [page, setPage] = useState(0)

  const ownerByClient = useMemo(
    () => new Map((owners ?? []).map((o) => [o.clientId, o])),
    [owners],
  )

  const rows = useMemo(() => {
    if (!apps) return undefined
    return apps.map((a) => {
      const control =
        ownerByClient.get(a.clientId) ??
        (a.sandboxClientId ? ownerByClient.get(a.sandboxClientId) : undefined) ??
        (a.productionClientId ? ownerByClient.get(a.productionClientId) : undefined)
      const suspended = [a.clientId, a.sandboxClientId, a.productionClientId].some(
        (id) => id && ownerByClient.get(id)?.suspended,
      )
      return { app: a, owner: control?.owner ?? null, status: appStatus(a.status, suspended) }
    })
  }, [apps, ownerByClient])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows?.length ?? 0 }
    for (const r of rows ?? []) c[r.status.key] = (c[r.status.key] ?? 0) + 1
    return c
  }, [rows])

  const visible = useMemo(() => {
    if (!rows) return undefined
    const needle = q.trim().toLowerCase()
    const list = rows.filter((r) => {
      if (filter !== "all" && r.status.key !== filter) return false
      if (!needle) return true
      return [
        r.app.name,
        r.app.clientId,
        r.app.sandboxClientId ?? "",
        r.app.productionClientId ?? "",
        r.owner?.name ?? "",
        r.owner?.email ?? "",
      ].some((v) => v.toLowerCase().includes(needle))
    })
    list.sort((a, b) => {
      const d =
        sort.key === "name"
          ? a.app.name.localeCompare(b.app.name, "fr")
          : a.app.createdAt - b.app.createdAt
      return sort.dir === "asc" ? d : -d
    })
    return list
  }, [rows, q, filter, sort])

  const pageCount = Math.max(1, Math.ceil((visible?.length ?? 0) / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const slice = visible?.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  const active = rows?.filter((r) => !r.app.disabled).length

  const setFilter = (next: StatusFilter) => {
    setPage(0)
    router.replace(next === "all" ? pathname : `${pathname}?statut=${next}`)
  }

  return (
    <>
      <PageHeader
        kicker={
          rows && active !== undefined
            ? `Registre · ${plural(rows.length, "application", "applications")} · ${fmtNumber(active)} active${active > 1 ? "s" : ""}`
            : "Registre"
        }
        title="Applications OAuth"
        description="Services partenaires autorisés à utiliser « Se connecter avec IDN »."
        actions={<CreateAppDialog />}
      />
      <PageBody>
        <div className="adm-panel">
          <div className="flex flex-wrap items-center gap-3 border-b border-idn-border-soft p-4">
            <div className="relative min-w-[240px] flex-1">
              <label htmlFor="app-search" className="sr-only">
                Rechercher une application
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
              <Input
                id="app-search"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(0)
                }}
                placeholder="Nom, client_id ou propriétaire"
                className="h-9 pl-9"
              />
            </div>
            <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                    filter === key
                      ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                      : "text-idn-muted hover:bg-idn-surface-2 hover:text-idn-ink",
                  )}
                >
                  {label}
                  <span className="font-mono text-[11px]">{fmtNumber(counts[key] ?? 0)}</span>
                </button>
              ))}
            </div>
          </div>

          {slice === undefined ? (
            <TableSkeleton />
          ) : slice.length === 0 ? (
            <EmptyState
              title={rows?.length ? "Aucune application ne correspond" : "Aucune application OAuth"}
              description={
                rows?.length
                  ? "Modifiez la recherche ou choisissez un autre statut."
                  : "Les applications créées ici ou par les développeurs depuis leur portail apparaîtront dans cette liste."
              }
              action={rows?.length ? undefined : <CreateAppDialog />}
            />
          ) : (
            <>
              <DataTable
                label="Applications OAuth"
                minWidth={900}
                head={
                  <>
                    <SortTh
                      label="Application"
                      sortKey="name"
                      current={sort.key}
                      direction={sort.dir}
                      onSort={() => setSort((s) => ({ key: "name", dir: s.key === "name" && s.dir === "asc" ? "desc" : "asc" }))}
                    />
                    <Th>Propriétaire</Th>
                    <Th>Statut</Th>
                    <Th>Environnements</Th>
                    <Th>Niveau min.</Th>
                    <Th>Scopes</Th>
                    <SortTh
                      label="Création"
                      sortKey="created"
                      current={sort.key}
                      direction={sort.dir}
                      onSort={() => setSort((s) => ({ key: "created", dir: s.key === "created" && s.dir === "desc" ? "asc" : "desc" }))}
                    />
                  </>
                }
              >
                {slice.map(({ app, owner, status }) => {
                  const scopes = scopeList(app.scopes)
                  const href = `/apps/${encodeURIComponent(app.clientId)}`
                  return (
                    <Tr key={app.id} onActivate={() => router.push(href)}>
                      <Td className="max-w-[240px]">
                        <span className="flex min-w-0 flex-col">
                          <Link
                            href={href}
                            className="truncate rounded-sm font-medium text-idn-ink outline-none hover:text-idn-green hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
                          >
                            {app.name || "Application sans nom"}
                          </Link>
                          <span className="truncate font-mono text-[11px] text-idn-muted">{app.clientId}</span>
                        </span>
                      </Td>
                      <Td className="max-w-[200px]">
                        {owner ? (
                          <PersonCell person={owner} secondary="email" />
                        ) : (
                          <span className="text-idn-muted">Console admin</span>
                        )}
                      </Td>
                      <Td>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </Td>
                      <Td>
                        <span className="flex gap-1">
                          <EnvChip present={Boolean(app.sandboxClientId)} label="Sandbox" />
                          <EnvChip present={Boolean(app.productionClientId)} label="Production" />
                        </span>
                      </Td>
                      <Td>
                        <LoABadge level={app.loa} compact />
                      </Td>
                      <Td className="max-w-[200px]">
                        <span className="block truncate font-mono text-xs text-idn-ink-2" title={scopes.join(", ")}>
                          {scopes.length === 0 ? "Aucun" : scopes.join(" ")}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-idn-muted">
                        {app.createdAt ? (
                          <time title={fmtDate(app.createdAt)}>{relativeTime(app.createdAt)}</time>
                        ) : (
                          "Inconnue"
                        )}
                      </Td>
                    </Tr>
                  )
                })}
              </DataTable>
              <Pagination
                page={current}
                pageCount={pageCount}
                total={visible?.length ?? 0}
                noun={["application", "applications"]}
                onChange={setPage}
              />
            </>
          )}
        </div>
      </PageBody>
    </>
  )
}

function EnvChip({ present, label }: { present: boolean; label: string }) {
  if (!present) return null
  return (
    <span className="rounded bg-idn-surface-2 px-1.5 font-mono text-[11px] leading-5 text-idn-ink-2">
      {label}
    </span>
  )
}
