"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { useMemo, useState } from "react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { AppLogo } from "../../_components/app-logo"
import { applicationStatus, primaryOf, type ApplicationGroup } from "../../_components/application-groups"
import { useApplications } from "../../_components/data"
import { formatDate, formatRelative, pluralize } from "../../_components/format"
import { Icon } from "../../_components/icons"
import {
  EmptyState,
  EnvTag,
  LoadingBlock,
  PageBody,
  PageHeader,
  StatusPill,
} from "../../_components/ui"

type EnvFilter = "all" | "sandbox" | "production"
type SortKey = "recent" | "activity" | "name"

export default function ApplicationsPage() {
  const { groups } = useApplications()
  const usage = useQuery(api.developer.usage.overview, { days: 30 })
  const branding = useQuery(api.developer.appProfile.listBranding, {})
  const [search, setSearch] = useState("")
  const [env, setEnv] = useState<EnvFilter>("all")
  const [sort, setSort] = useState<SortKey>("recent")

  const activityByClient = useMemo(() => {
    const map = new Map<string, number | null>()
    for (const app of usage?.apps ?? []) map.set(app.clientId, app.lastActivityAt)
    return map
  }, [usage])
  const iconByClient = useMemo(
    () => new Map((branding ?? []).map((b) => [b.clientId, b.icon])),
    [branding],
  )

  const lastActivity = (group: ApplicationGroup): number | null => {
    const values = [group.sandbox?.clientId, group.production?.clientId]
      .map((id) => (id ? activityByClient.get(id) : null))
      .filter((v): v is number => typeof v === "number")
    return values.length ? Math.max(...values) : null
  }

  const visible = useMemo(() => {
    if (!groups) return undefined
    const q = search.trim().toLowerCase()
    const filtered = groups.filter((group) => {
      if (env === "production" && !group.production) return false
      if (env === "sandbox" && group.production && !group.production.disabled) return false
      if (!q) return true
      return [group.name, group.sandbox?.clientId, group.production?.clientId]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    })
    const sorted = [...filtered]
    if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"))
    if (sort === "activity")
      sorted.sort((a, b) => (lastActivity(b) ?? 0) - (lastActivity(a) ?? 0))
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lastActivity dérive de activityByClient
  }, [groups, search, env, sort, activityByClient])

  return (
    <>
      <PageHeader
        kicker="Intégration"
        title="Applications"
        description="Chaque application dispose d'un client_id sandbox, puis d'un client_id de production après validation."
        actions={
          <Button asChild>
            <Link href="/applications/new">
              <Icon name="plus" size={16} /> Nouvelle application
            </Link>
          </Button>
        }
      />
      <PageBody>
        {groups === undefined ? (
          <LoadingBlock rows={4} label="Chargement des applications…" />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="apps"
            title="Aucune application pour l'instant"
            description="Enregistrez votre première application pour obtenir un client_id et un secret de sandbox, puis testez la connexion avec vos comptes de test."
            action={
              <Button asChild>
                <Link href="/applications/new">
                  <Icon name="plus" size={16} /> Créer une application
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative sm:w-72">
                <Icon
                  name="search"
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-idn-muted"
                />
                <Input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nom ou client_id"
                  aria-label="Rechercher une application"
                  className="h-9 pl-9"
                />
              </div>
              <div role="group" aria-label="Filtrer par environnement" className="flex rounded-[10px] border border-idn-border bg-idn-surface p-0.5">
                {(
                  [
                    ["all", "Toutes"],
                    ["sandbox", "Sandbox"],
                    ["production", "Production"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={env === value}
                    onClick={() => setEnv(value)}
                    className={cn(
                      "h-8 rounded-[8px] px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-idn-green",
                      env === value ? "bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark" : "text-idn-ink-2 hover:text-idn-ink",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[13px] text-idn-muted sm:ml-auto">
                Trier par
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="h-9 rounded-[10px] border border-idn-border bg-idn-surface px-2 text-[13px] text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
                >
                  <option value="recent">Création récente</option>
                  <option value="activity">Dernière activité</option>
                  <option value="name">Nom</option>
                </select>
              </label>
            </div>
            <p className="sr-only" aria-live="polite">
              {visible ? pluralize(visible.length, "application affichée", "applications affichées") : ""}
            </p>
            {visible && visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="Aucune application ne correspond"
                description="Modifiez la recherche ou le filtre d'environnement."
                action={
                  <Button variant="outline" onClick={() => { setSearch(""); setEnv("all") }}>
                    Réinitialiser les filtres
                  </Button>
                }
              />
            ) : (
              <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible?.map((group) => {
                  const primary = primaryOf(group)
                  const status = applicationStatus(group)
                  const activity = lastActivity(group)
                  return (
                    <li key={group.id}>
                      <Link
                        href={`/applications/${group.id}`}
                        className="group flex h-full flex-col rounded-[14px] border border-idn-border bg-idn-surface p-5 transition-colors duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-idn-green/50 hover:bg-idn-surface-2/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green motion-reduce:transition-none"
                      >
                        <div className="flex items-start gap-3">
                          <AppLogo name={group.name} icon={iconByClient.get(group.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-semibold text-idn-ink group-hover:text-idn-green dark:group-hover:text-idn-green-on-dark">
                              {group.name}
                            </p>
                            <p className="truncate font-mono text-xs text-idn-muted">{group.id}</p>
                          </div>
                          <Icon name="chevronRight" size={16} className="mt-1 shrink-0 text-idn-muted" />
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <StatusPill tone={status.tone}>{status.label}</StatusPill>
                          <LoABadge level={primary.loa} compact />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {group.sandbox ? <EnvTag env="sandbox" /> : null}
                          {group.production ? <EnvTag env="production" /> : null}
                        </div>
                        <div className="min-h-4 flex-1" />
                        <dl className="grid grid-cols-2 gap-3 border-t border-idn-border-soft pt-4 text-[13px]">
                          <div>
                            <dt className="text-idn-muted">Dernière activité</dt>
                            <dd className="mt-0.5 text-idn-ink">
                              {usage === undefined ? "…" : activity ? formatRelative(activity) : "Aucune"}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-idn-muted">Créée le</dt>
                            <dd className="mt-0.5 text-idn-ink">{formatDate(primary.createdAt)}</dd>
                          </div>
                        </dl>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </PageBody>
    </>
  )
}
