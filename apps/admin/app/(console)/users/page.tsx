"use client"

/**
 * Comptes IDN — annuaire filtrable et vue « Doublons ».
 *
 * Les doublons ne sont pas une rubrique à part mais un autre regard sur la
 * même population : ils vivent dans un onglet de cette page (`?vue=doublons`).
 */
import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"
import { Search, X } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { LoABadge } from "@repo/ui/components/loa-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { cn } from "@repo/ui/lib/utils"

import { DuplicatesView } from "../../_components/duplicates-view"
import { EmptyState } from "../../_components/empty-state"
import { PageBody, PageHeader } from "../../_components/page-header"
import { Pagination } from "../../_components/pagination"
import { PersonCell } from "../../_components/person"
import { TableSkeleton } from "../../_components/skeleton"
import { StatusPill } from "../../_components/status-pill"
import { DataTable, SortTh, Td, Th, Tr } from "../../_components/table"
import { fmtDate, fmtNumber, plural, relativeTime } from "../../_lib/format"
import {
  KYC_STATUS,
  PROFILE_LABEL,
  ROLE_LABEL,
  ROLES,
  type KycStatus,
  type ProfileType,
  type Role,
} from "../../_lib/labels"

const PAGE_SIZE = 20

type Sort = "newest" | "oldest" | "name" | "loa"
type SortColumn = "name" | "loa" | "created"

type Filters = {
  loa: "all" | "1" | "2" | "3"
  profileType: "all" | ProfileType
  role: "all" | "none" | Role
  kycStatus: "all" | "none" | KycStatus
  state: "all" | "active" | "deleted"
}

const NO_FILTERS: Filters = {
  loa: "all",
  profileType: "all",
  role: "all",
  kycStatus: "all",
  state: "all",
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  )
}

function UsersPageInner() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const view = params.get("vue") === "doublons" ? "duplicates" : "list"

  const total = useQuery(api.admin.directory.countAccounts, {})?.total
  const openFlags = useQuery(api.duplicates.queries.openFlagCount, {})
  const groups = useQuery(api.admin.duplicates.duplicateGroupCount, {})
  const toReview = (openFlags ?? 0) + (groups ?? 0)

  const setView = (next: "list" | "duplicates") =>
    router.replace(next === "list" ? pathname : `${pathname}?vue=doublons`)

  return (
    <>
      <PageHeader
        kicker={total === undefined ? "Registre" : `Registre · ${plural(total, "compte", "comptes")}`}
        title="Comptes IDN"
        description="Recherchez un compte, filtrez le registre et ouvrez une fiche pour agir."
      />
      <PageBody>
        <div role="tablist" aria-label="Vue des comptes" className="mb-4 flex gap-1 border-b border-idn-border">
          {(
            [
              ["list", "Tous les comptes", undefined],
              ["duplicates", "Doublons", toReview],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={view === id}
              aria-controls={`panel-${id}`}
              onClick={() => setView(id)}
              className={cn(
                "-mb-px inline-flex h-10 items-center gap-2 border-b-2 px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                view === id
                  ? "border-idn-green text-idn-ink"
                  : "border-transparent text-idn-muted hover:text-idn-ink",
              )}
            >
              {label}
              {count ? (
                <span className="rounded-full bg-idn-yellow-soft px-1.5 font-mono text-[11px] leading-5 text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
                  {fmtNumber(count)}
                  <span className="sr-only"> à examiner</span>
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${view}`} aria-labelledby={`tab-${view}`}>
          {view === "duplicates" ? <DuplicatesView /> : <AccountDirectory />}
        </div>
      </PageBody>
    </>
  )
}

function AccountDirectory() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [term, setTerm] = useState("")
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [sort, setSort] = useState<Sort>("newest")
  const [page, setPage] = useState(0)

  // La recherche par nom balaie le registre : on attend la fin de la frappe.
  useEffect(() => {
    const id = setTimeout(() => {
      setTerm(input.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(id)
  }, [input])

  const result = useQuery(api.admin.directory.listAccounts, {
    page,
    pageSize: PAGE_SIZE,
    q: term.length >= 2 ? term : undefined,
    loa: filters.loa === "all" ? undefined : (Number(filters.loa) as 1 | 2 | 3),
    profileType: filters.profileType === "all" ? undefined : filters.profileType,
    role: filters.role === "all" ? undefined : filters.role,
    kycStatus: filters.kycStatus === "all" ? undefined : filters.kycStatus,
    state: filters.state === "all" ? undefined : filters.state,
    sort,
  })

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(0)
  }
  const filtered =
    term.length >= 2 ||
    (Object.keys(filters) as Array<keyof Filters>).some((k) => filters[k] !== "all")

  const sortColumn: SortColumn =
    sort === "name" ? "name" : sort === "loa" ? "loa" : "created"
  const direction: "asc" | "desc" = sort === "name" || sort === "oldest" ? "asc" : "desc"
  const onSort = (col: SortColumn) => {
    setPage(0)
    if (col === "name") setSort("name")
    else if (col === "loa") setSort("loa")
    else setSort(sort === "newest" ? "oldest" : "newest")
  }

  return (
    <div className="adm-panel">
      <div className="flex flex-wrap items-end gap-3 border-b border-idn-border-soft p-4">
        <div className="relative min-w-[240px] flex-1">
          <label htmlFor="account-search" className="sr-only">
            Rechercher un compte
          </label>
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
          <Input
            id="account-search"
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nom, e-mail, ID IDN ou NIP"
            className="h-9 pl-9"
          />
        </div>
        <FilterSelect
          label="Niveau"
          value={filters.loa}
          onChange={(v) => setFilter("loa", v)}
          options={[
            ["all", "Tous les niveaux"],
            ["1", "Niveau 1"],
            ["2", "Niveau 2"],
            ["3", "Niveau 3"],
          ]}
        />
        <FilterSelect
          label="Profil"
          value={filters.profileType}
          onChange={(v) => setFilter("profileType", v)}
          options={[
            ["all", "Tous les profils"],
            ...(Object.entries(PROFILE_LABEL) as Array<[ProfileType, string]>),
          ]}
        />
        <FilterSelect
          label="Rôle"
          value={filters.role}
          onChange={(v) => setFilter("role", v)}
          options={[
            ["all", "Tous les rôles"],
            ["none", "Sans rôle"],
            ...ROLES.map((r) => [r, ROLE_LABEL[r]] as [Role, string]),
          ]}
        />
        <FilterSelect
          label="Statut KYC"
          value={filters.kycStatus}
          onChange={(v) => setFilter("kycStatus", v)}
          options={[
            ["all", "Tous les statuts"],
            ["none", "Aucun dossier"],
            ...(Object.entries(KYC_STATUS) as Array<[KycStatus, { label: string }]>).map(
              ([k, s]) => [k, s.label] as [KycStatus, string],
            ),
          ]}
        />
        <FilterSelect
          label="État"
          value={filters.state}
          onChange={(v) => setFilter("state", v)}
          options={[
            ["all", "Tous"],
            ["active", "Actifs"],
            ["deleted", "Anonymisés"],
          ]}
        />
        {filtered ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9"
            onClick={() => {
              setInput("")
              setTerm("")
              setFilters(NO_FILTERS)
              setPage(0)
            }}
          >
            <X aria-hidden />
            Réinitialiser
          </Button>
        ) : null}
      </div>

      {result?.truncated ? (
        <p className="border-b border-idn-border-soft bg-idn-yellow-soft px-4 py-2 text-[13px] text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
          Résultat partiel : le registre dépasse la capacité de balayage de la
          console. Affinez avec un e-mail, un ID IDN ou un NIP.
        </p>
      ) : null}

      {filters.role !== "all" && filters.role !== "none" ? (
        <p className="border-b border-idn-border-soft bg-idn-blue-soft px-4 py-2 text-[13px] text-idn-blue dark:bg-[#10243A] dark:text-idn-blue-on-dark">
          Seuls les comptes dotés d&apos;un profil citoyen figurent ici. Les
          comptes opérateurs créés depuis la console sont listés dans{" "}
          <Link href="/roles" className="font-medium underline underline-offset-2">
            Rôles et habilitations
          </Link>
          .
        </p>
      ) : null}

      {result === undefined ? (
        <TableSkeleton rows={8} />
      ) : result.rows.length === 0 ? (
        <EmptyState
          title={filtered ? "Aucun compte ne correspond" : "Aucun compte IDN"}
          description={
            filtered
              ? "Élargissez la recherche ou retirez un filtre."
              : "Les comptes apparaissent ici dès la fin de leur inscription."
          }
          action={
            filtered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setInput("")
                  setFilters(NO_FILTERS)
                }}
              >
                Retirer les filtres
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <DataTable
            label="Comptes IDN"
            head={
              <>
                <SortTh label="Compte" sortKey="name" current={sortColumn} direction={direction} onSort={onSort} />
                <Th>E-mail</Th>
                <SortTh label="Niveau" sortKey="loa" current={sortColumn} direction={direction} onSort={onSort} />
                <Th>Profil</Th>
                <Th>Rôles</Th>
                <Th>KYC</Th>
                <SortTh label="Inscription" sortKey="created" current={sortColumn} direction={direction} onSort={onSort} />
              </>
            }
          >
            {result.rows.map((u) => (
              <Tr
                key={u.userId}
                onActivate={() => router.push(`/users/${encodeURIComponent(u.userId)}`)}
              >
                <Td className="max-w-[240px]">
                  <PersonCell person={{ ...u, email: u.email || undefined, exists: true }} />
                </Td>
                <Td className="max-w-[220px] truncate font-mono text-xs text-idn-muted">
                  {u.email || "Aucun e-mail"}
                </Td>
                <Td>
                  <LoABadge level={u.loa as 1 | 2 | 3} compact />
                </Td>
                <Td className="text-idn-ink-2">
                  {PROFILE_LABEL[u.profileType as ProfileType] ?? u.profileType}
                </Td>
                <Td>
                  {u.roles.length === 0 ? (
                    <span className="text-idn-muted">Aucun</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className="rounded bg-idn-surface-2 px-1.5 text-xs leading-5 text-idn-ink-2">
                          {ROLE_LABEL[r as Role] ?? r}
                        </span>
                      ))}
                    </span>
                  )}
                </Td>
                <Td>
                  {u.deletedAt !== undefined ? (
                    <StatusPill tone="neutral">Anonymisé</StatusPill>
                  ) : u.kycStatus ? (
                    <StatusPill tone={KYC_STATUS[u.kycStatus as KycStatus].tone}>
                      {KYC_STATUS[u.kycStatus as KycStatus].label}
                    </StatusPill>
                  ) : (
                    <span className="text-idn-muted">Aucun dossier</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-idn-muted">
                  <time dateTime={new Date(u.createdAt).toISOString()} title={fmtDate(u.createdAt)}>
                    {relativeTime(u.createdAt)}
                  </time>
                </Td>
              </Tr>
            ))}
          </DataTable>
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            noun={["compte", "comptes"]}
            onChange={setPage}
          />
        </>
      )}
    </div>
  )
}

function FilterSelect<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: V
  onChange: (value: V) => void
  options: Array<[V, string]>
}) {
  const id = `filter-${label
    .normalize("NFD")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase()}`
  return (
    <div className="flex flex-col gap-1">
      <label className="adm-kicker" htmlFor={id}>
        {label}
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as V)}>
        <SelectTrigger id={id} className="!h-9 min-w-[150px] text-[13px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="shadow-none">
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
