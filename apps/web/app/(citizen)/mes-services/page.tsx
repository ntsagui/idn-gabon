"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { cn } from "@repo/ui/lib/utils"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Card, Note, Row, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

type CategoryId = "administrative" | "civilStatus" | "fiscal" | "education" | "health" | "transport" | "social" | "other"

const CATEGORY_ICON: Record<CategoryId, IconName> = {
  administrative: "building",
  civilStatus: "baby",
  fiscal: "doc",
  education: "cap",
  health: "heart",
  transport: "car",
  social: "users",
  other: "folder",
}

/**
 * Services publics (apps/mobile/src/app/services.tsx) : catalogue des
 * services publiés par les applications que tu as autorisées. L'adresse
 * `/services` est la page publique du site ; l'espace connecté utilise
 * `/mes-services`.
 */
export default function Services() {
  const services = useQuery(api.services.listForCurrentUser)
  const categories = useQuery(api.services.listCategories)
  const [search, setSearch] = React.useState("")
  const [selectedCat, setSelectedCat] = React.useState<CategoryId | null>(null)

  const counts = React.useMemo(() => {
    const m = new Map<CategoryId, number>()
    for (const s of services ?? []) m.set(s.category as CategoryId, (m.get(s.category as CategoryId) ?? 0) + 1)
    return m
  }, [services])

  const filtered = React.useMemo(() => {
    if (!services) return []
    const q = search.trim().toLocaleLowerCase("fr")
    return services.filter((s) => {
      if (selectedCat && s.category !== selectedCat) return false
      if (!q) return true
      return (
        s.label.toLocaleLowerCase("fr").includes(q) ||
        s.description.toLocaleLowerCase("fr").includes(q) ||
        s.appName.toLocaleLowerCase("fr").includes(q)
      )
    })
  }, [services, search, selectedCat])

  // Seules les catégories qui contiennent au moins un service sont proposées en filtre.
  const chips: { id: CategoryId | null; label: string; n: number }[] = [
    { id: null, label: "Tout", n: services?.length ?? 0 },
    ...(categories ?? [])
      .map((c) => ({ id: c.id as CategoryId, label: c.label, n: counts.get(c.id as CategoryId) ?? 0 }))
      .filter((c) => c.n > 0),
  ]

  return (
    <Screen header={<AppBar title="Services publics" back="/dashboard" />}>
      {services === undefined ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement des services" />
        </div>
      ) : services.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center">
          <IdnLottie name="partage" size={120} label="Services publics" />
          <h2 className="mt-2 text-[17px] font-semibold text-idn-ink">Aucun service pour l’instant</h2>
          <p className="mt-1 max-w-md text-sm leading-5 text-idn-muted">
            Quand tu te connectes à une application avec ton compte IDN, les démarches qu’elle propose apparaissent ici.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-idn-muted">
            {services.length} service{services.length > 1 ? "s" : ""} accessible{services.length > 1 ? "s" : ""} avec ton compte IDN
          </p>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-[10px] border border-idn-border bg-idn-surface px-3 focus-within:border-2 focus-within:border-idn-green focus-within:px-[11px]">
            <Icon name="search" size={16} className="text-idn-muted" />
            <span className="sr-only">Rechercher un service</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un service"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-idn-ink outline-none placeholder:text-idn-muted"
            />
          </label>
          <div role="tablist" aria-label="Catégories" className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-2.5 md:mx-0 md:flex-wrap md:px-0">
            {chips.map((c) => {
              const sel = c.id === selectedCat
              return (
                <button
                  key={c.id ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={sel}
                  onClick={() => setSelectedCat(c.id)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    sel ? "border-idn-green bg-c-green-badge font-semibold text-c-green-text" : "border-idn-border bg-idn-surface font-medium text-idn-ink-2"
                  )}
                >
                  {c.label}
                  <span className={cn("font-mono", sel ? "text-c-green-text" : "text-idn-muted")}>{c.n}</span>
                </button>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <Note center>Aucun service ne correspond. Essaie un autre mot-clé ou une autre catégorie.</Note>
          ) : (
            <>
              <SectionTitle className="mt-3">
                {selectedCat ? categories?.find((c) => c.id === selectedCat)?.label : "Disponibles pour toi"}
              </SectionTitle>
              <Card>
                {filtered.map((s) => (
                  <Row
                    key={s.id}
                    icon={CATEGORY_ICON[s.category as CategoryId] ?? "folder"}
                    tone="green"
                    title={s.label}
                    sub={s.appName}
                    chevron
                    href={`/service/${encodeURIComponent(s.id)}`}
                  />
                ))}
              </Card>
            </>
          )}
        </>
      )}
    </Screen>
  )
}
