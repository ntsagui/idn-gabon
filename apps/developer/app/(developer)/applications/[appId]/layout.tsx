"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useQuery } from "convex/react"
import { useMemo, useState, type ReactNode } from "react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { AppLogo } from "../../../_components/app-logo"
import { applicationStatus } from "../../../_components/application-groups"
import { CopyButton } from "../../../_components/copy"
import { useApplications } from "../../../_components/data"
import { EmptyState, LoadingBlock, PageBody, PageHeader, StatusPill } from "../../../_components/ui"
import { AppWorkspaceContext } from "./_components/app-context"

const TABS = [
  { href: "", label: "Vue d'ensemble" },
  { href: "/keys", label: "Identifiants et clés" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/services", label: "Services" },
]

export default function ApplicationLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ appId: string }>()
  const appId = decodeURIComponent(params.appId)
  const pathname = usePathname() ?? ""
  const { groups } = useApplications()
  const branding = useQuery(api.developer.appProfile.listBranding, {})
  const [env, setEnv] = useState<"sandbox" | "production" | null>(null)

  const group = useMemo(
    () =>
      groups?.find(
        (g) => g.id === appId || g.sandbox?.clientId === appId || g.production?.clientId === appId,
      ),
    [groups, appId],
  )

  if (groups === undefined) {
    return (
      <PageBody>
        <LoadingBlock rows={4} label="Chargement de l'application…" />
      </PageBody>
    )
  }

  if (!group) {
    return (
      <PageBody>
        <EmptyState
          icon="apps"
          title="Application introuvable"
          description="Elle a peut-être été supprimée, ou elle n'appartient pas à votre compte."
          action={
            <Button asChild variant="outline">
              <Link href="/applications">Retour aux applications</Link>
            </Button>
          }
        />
      </PageBody>
    )
  }

  const defaultEnv =
    group.production && (appId === group.production.clientId || !group.sandbox) ? "production" : "sandbox"
  const selectedEnv = env ?? defaultEnv
  const app = (selectedEnv === "production" ? group.production : group.sandbox) ?? (group.sandbox ?? group.production)!
  const status = applicationStatus(group)
  const base = `/applications/${encodeURIComponent(group.id)}`
  const icon =
    branding?.find((b) => b.clientId === app.clientId)?.icon ??
    branding?.find((b) => b.clientId === group.id)?.icon ??
    null

  return (
    <AppWorkspaceContext.Provider value={{ group, app, env: app.env, setEnv, icon }}>
      <PageHeader
        kicker="Application"
        crumbs={[{ label: "Applications", href: "/applications" }, { label: group.name }]}
        title={
          <span className="flex items-center gap-3">
            <AppLogo name={group.name} icon={icon} size={36} />
            <span className="min-w-0 truncate">{group.name}</span>
          </span>
        }
        actions={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
      >
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {group.production && group.sandbox ? (
            <div role="group" aria-label="Environnement affiché" className="flex rounded-[10px] border border-idn-border bg-idn-surface p-0.5">
              {(["sandbox", "production"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={app.env === value}
                  onClick={() => setEnv(value)}
                  className={cn(
                    "h-8 rounded-[8px] px-3 text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-idn-green",
                    app.env === value
                      ? "bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                      : "text-idn-ink-2 hover:text-idn-ink",
                  )}
                >
                  {value === "sandbox" ? "Sandbox" : "Production"}
                </button>
              ))}
            </div>
          ) : (
            <span className="inline-flex h-8 items-center rounded-[10px] border border-idn-border px-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-ink-2">
              {app.env === "production" ? "Production" : "Sandbox"}
            </span>
          )}
          <span className="flex min-w-0 items-center gap-2">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              client_id
            </span>
            <code className="truncate font-mono text-[13px] text-idn-ink">{app.clientId}</code>
            <CopyButton value={app.clientId} label="Copier le client_id" className="size-7" />
          </span>
        </div>
        <nav aria-label="Sections de l'application" className="-mb-5 mt-5 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const href = `${base}${tab.href}`
            const active = tab.href === "" ? pathname === base : pathname.startsWith(href)
            return (
              <Link
                key={tab.label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-idn-green",
                  active
                    ? "border-idn-green text-idn-green dark:text-idn-green-on-dark"
                    : "border-transparent text-idn-muted hover:text-idn-ink",
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </PageHeader>
      {children}
    </AppWorkspaceContext.Provider>
  )
}
