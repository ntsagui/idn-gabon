"use client"

import Link from "next/link"
import { useQuery } from "convex/react"
import { useMemo, useState } from "react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { BarChart } from "../../_components/bar-chart"
import { useApplications } from "../../_components/data"
import { formatDayKey, formatNumber, formatRelative, pluralize } from "../../_components/format"
import { Icon } from "../../_components/icons"
import {
  EmptyState,
  EnvTag,
  LoadingBlock,
  Notice,
  PageBody,
  PageHeader,
  Panel,
  StatTile,
} from "../../_components/ui"

type Days = 7 | 30 | 90
type SortKey = "name" | "tokens" | "activeConsents" | "deliveriesFailed" | "lastActivityAt"

export default function UsagePage() {
  const [days, setDays] = useState<Days>(30)
  const [clientId, setClientId] = useState<string>("")
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "tokens", dir: "desc" })
  const { groups } = useApplications()
  const usage = useQuery(api.developer.usage.overview, clientId ? { days, clientId } : { days })

  const options = (groups ?? []).flatMap((group) =>
    [group.sandbox, group.production]
      .filter((app): app is NonNullable<typeof app> => Boolean(app))
      .map((app) => ({
        clientId: app.clientId,
        label: `${group.name} · ${app.env === "production" ? "Production" : "Sandbox"}`,
      })),
  )

  const rows = useMemo(() => {
    const list = [...(usage?.apps ?? [])]
    const factor = sort.dir === "asc" ? 1 : -1
    list.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name, "fr") * factor
      return ((a[sort.key] ?? 0) - (b[sort.key] ?? 0)) * factor
    })
    return list
  }, [usage, sort])

  const totals = usage?.totals
  const deliveries = totals ? totals.deliveriesSucceeded + totals.deliveriesFailed : 0
  const hasActivity = Boolean(totals && (totals.tokens > 0 || deliveries > 0 || totals.activeConsents > 0))

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))
  const header = (label: string, key: SortKey, align: "left" | "right" = "right") => (
    <th
      scope="col"
      aria-sort={sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cn("px-4 font-medium", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 rounded-sm hover:text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
      >
        {label}
        <Icon
          name={sort.key === key && sort.dir === "asc" ? "chevronUp" : "chevronDown"}
          size={13}
          className={sort.key === key ? "text-idn-ink" : "opacity-40"}
        />
      </button>
    </th>
  )

  return (
    <>
      <PageHeader
        kicker="Intégration"
        title="Usage"
        description="Activité réelle de vos applications : connexions d'usagers, consentements et livraisons de webhooks."
      />
      <PageBody>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div role="group" aria-label="Période" className="flex w-fit rounded-[10px] border border-idn-border bg-idn-surface p-0.5">
            {([7, 30, 90] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={days === value}
                onClick={() => setDays(value)}
                className={cn(
                  "h-8 rounded-[8px] px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-idn-green",
                  days === value
                    ? "bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                    : "text-idn-ink-2 hover:text-idn-ink",
                )}
              >
                {value} jours
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-idn-muted">
            Application
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-9 max-w-[280px] rounded-[10px] border border-idn-border bg-idn-surface px-2 text-[13px] text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
            >
              <option value="">Toutes les applications</option>
              {options.map((option) => (
                <option key={option.clientId} value={option.clientId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {usage === undefined || groups === undefined ? (
          <LoadingBlock rows={4} label="Chargement de l'usage…" />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="chart"
            title="Aucune application, donc aucun usage"
            description="L'usage apparaît ici dès que des usagers se connectent via une de vos applications."
            action={
              <Button asChild>
                <Link href="/applications/new">
                  <Icon name="plus" size={16} /> Créer une application
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Connexions"
                value={formatNumber(totals!.tokens)}
                context={`jetons émis sur ${days} jours`}
              />
              <StatTile
                label="Usagers autorisés"
                value={formatNumber(totals!.activeConsents)}
                context="consentements actifs aujourd'hui"
              />
              <StatTile
                label="Livraisons webhook"
                value={formatNumber(totals!.deliveriesSucceeded)}
                context={deliveries > 0 ? `réussies sur ${formatNumber(deliveries)} terminées` : "aucune livraison terminée"}
              />
              <StatTile
                label="Erreurs"
                value={formatNumber(totals!.deliveriesFailed)}
                context={
                  deliveries > 0
                    ? `${Math.round((totals!.deliveriesFailed / deliveries) * 100)} % des livraisons en échec`
                    : "aucune livraison en échec"
                }
              />
            </div>

            {usage.truncated ? (
              <Notice tone="attention" title="Totaux partiels">
                Le volume dépasse la limite de lecture d&apos;une requête : les chiffres affichés sont des minima.
              </Notice>
            ) : null}

            {!hasActivity ? (
              <EmptyState
                icon="chart"
                title={`Aucune activité sur les ${days} derniers jours`}
                description="Aucune connexion d'usager ni livraison de webhook n'a été enregistrée. En sandbox, connectez-vous avec un compte de test pour voir apparaître les premières données."
              />
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <Panel title="Connexions par jour" description="Jetons OAuth émis, à l'heure de Libreville.">
                  <BarChart
                    title="Connexions par jour"
                    data={usage.daily.map((d) => ({ date: d.date, value: d.tokens }))}
                    tone="green"
                    unit={(v) => pluralize(v, "connexion", "connexions")}
                  />
                </Panel>
                <Panel title="Échecs de livraison par jour" description="Livraisons de webhooks abandonnées après tous les essais.">
                  <BarChart
                    title="Échecs de livraison par jour"
                    data={usage.daily.map((d) => ({ date: d.date, value: d.deliveriesFailed }))}
                    tone="red"
                    unit={(v) => pluralize(v, "échec", "échecs")}
                  />
                </Panel>
              </div>
            )}

            {hasActivity ? (
              <details className="rounded-[14px] border border-idn-border bg-idn-surface">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green">
                  Voir les données par jour (tableau)
                </summary>
                <div className="max-h-80 overflow-auto border-t border-idn-border-soft">
                  <table className="w-full text-left text-[13px]">
                    <thead className="sticky top-0 bg-idn-surface-2 text-xs text-idn-muted">
                      <tr className="h-10">
                        <th scope="col" className="px-4 font-medium">Jour</th>
                        <th scope="col" className="px-4 text-right font-medium">Connexions</th>
                        <th scope="col" className="px-4 text-right font-medium">Livraisons réussies</th>
                        <th scope="col" className="px-4 text-right font-medium">Échecs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-idn-border-soft">
                      {[...usage.daily].reverse().map((d) => (
                        <tr key={d.date} className="h-9">
                          <td className="px-4">{formatDayKey(d.date)}</td>
                          <td className="px-4 text-right tabular-nums">{formatNumber(d.tokens)}</td>
                          <td className="px-4 text-right tabular-nums">{formatNumber(d.deliveriesSucceeded)}</td>
                          <td className="px-4 text-right tabular-nums">{formatNumber(d.deliveriesFailed)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}

            <Panel title="Par application" bodyClassName="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-[13px]">
                  <thead className="sticky top-0 bg-idn-surface-2 text-xs text-idn-muted">
                    <tr className="h-10">
                      {header("Application", "name", "left")}
                      {header("Connexions", "tokens")}
                      {header("Usagers autorisés", "activeConsents")}
                      <th scope="col" className="px-4 text-right font-medium">Livraisons réussies</th>
                      {header("Échecs", "deliveriesFailed")}
                      {header("Dernière activité", "lastActivityAt")}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-idn-border-soft">
                    {rows.map((row) => {
                      const group = groups.find(
                        (g) => g.sandbox?.clientId === row.clientId || g.production?.clientId === row.clientId,
                      )
                      return (
                        <tr key={row.clientId} className="h-11 hover:bg-idn-surface-2/60">
                          <td className="px-4 py-2">
                            <Link
                              href={group ? `/applications/${group.id}` : "/applications"}
                              className="font-medium text-idn-ink hover:text-idn-green hover:underline focus-visible:outline-2 focus-visible:outline-idn-green"
                            >
                              {row.name}
                            </Link>
                            <span className="ml-2 align-middle">
                              <EnvTag env={row.env} />
                            </span>
                            <span className="block font-mono text-xs text-idn-muted">{row.clientId}</span>
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.tokens)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.activeConsents)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.deliveriesSucceeded)}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{formatNumber(row.deliveriesFailed)}</td>
                          <td className="px-4 py-2 text-right text-idn-ink-2">
                            {row.lastActivityAt ? formatRelative(row.lastActivityAt) : <span className="text-idn-muted">Aucune</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Notice tone="info" title="Ce qui est mesuré">
              Une connexion correspond à un jeton OAuth émis pour l&apos;application. Identité Numérique ne
              journalise pas encore chaque appel d&apos;API (UserInfo, iBoîte) : il n&apos;y a donc ni compteur de
              requêtes ni quota affiché. Les erreurs comptées sont les livraisons de webhooks en échec.
            </Notice>
          </div>
        )}
      </PageBody>
    </>
  )
}
