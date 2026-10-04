"use client"

/**
 * Fiche d'une application OAuth : configuration, environnements,
 * propriétaire, délégation d'identité et historique.
 */
import { useState } from "react"
import Link from "next/link"
import { notFound, useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { LoABadge } from "@repo/ui/components/loa-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"
import { cn } from "@repo/ui/lib/utils"

import { fr } from "../../../_content/fr"
import { AppActions } from "../../../_components/app-actions"
import { ConfirmDialog } from "../../../_components/confirm-dialog"
import { EmptyState } from "../../../_components/empty-state"
import { PageBody, PageHeader } from "../../../_components/page-header"
import { Field, Panel } from "../../../_components/panel"
import { PersonCell } from "../../../_components/person"
import { PanelSkeleton, Skeleton } from "../../../_components/skeleton"
import { StatusPill } from "../../../_components/status-pill"
import { DataTable, Td, Th, Tr } from "../../../_components/table"
import { appStatus, scopeList } from "../../../_lib/apps"
import { fmtDate, fmtDateTime, relativeTime } from "../../../_lib/format"
import { eventLabel } from "../../../_lib/labels"

function CopyValue({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <span className="flex items-center gap-2">
      <code className="min-w-0 break-all rounded bg-idn-surface-2 px-2 py-1 font-mono text-xs text-idn-ink">
        {value}
      </code>
      <button
        type="button"
        aria-label={`Copier ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          } catch {
            toast.error("Copie impossible.")
          }
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-idn-muted outline-none hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-idn-green"
      >
        {copied ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
      </button>
    </span>
  )
}

export default function AppDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = decodeURIComponent(params.id)
  const router = useRouter()

  const app = useQuery(api.admin.oauthApps.getApp, { clientId })
  const control = useQuery(api.admin.appControl.getControl, { clientId })
  const clientIds = app
    ? [app.clientId, app.sandboxClientId, app.productionClientId].filter(
        (id): id is string => Boolean(id),
      )
    : null
  const history = useQuery(
    api.admin.auditExplorer.listForApp,
    clientIds ? { clientIds, limit: 30 } : "skip",
  )

  if (app === undefined || control === undefined) {
    return (
      <>
        <PageHeader
          kicker="Application OAuth"
          title={<Skeleton className="h-7 w-56" />}
          breadcrumb={[{ label: "Applications OAuth", href: "/apps" }, { label: "Chargement…" }]}
        />
        <PageBody>
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelSkeleton className="h-64" />
            <PanelSkeleton className="h-64" />
          </div>
        </PageBody>
      </>
    )
  }
  if (app === null) notFound()

  const suspended = Boolean(control?.suspended)
  const status = appStatus(app.status, suspended)
  const scopes = scopeList(app.scopes)
  const redirects = app.redirectUrls
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean)
  const name = app.name || "Application sans nom"

  return (
    <>
      <PageHeader
        kicker="Application OAuth"
        title={name}
        breadcrumb={[{ label: "Applications OAuth", href: "/apps" }, { label: name }]}
        description={<span className="font-mono text-xs">{app.clientId}</span>}
        actions={
          <AppActions
            clientId={app.clientId}
            name={name}
            status={app.status}
            sandboxClientId={app.sandboxClientId}
            productionStatus={app.productionStatus}
            suspended={suspended}
          />
        }
      />
      <PageBody>
        <div className="adm-panel mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-[13px]">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <span className="flex items-center gap-2 text-idn-muted">
            Niveau minimal <LoABadge level={app.loa} compact />
          </span>
          <span className="text-idn-muted">
            {app.createdAt ? `Créée ${relativeTime(app.createdAt)} · le ${fmtDate(app.createdAt)}` : "Date de création inconnue"}
          </span>
          {(app.sandboxClientId && app.productionClientId) ? (
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="env-switch" className="text-idn-muted">
                Environnement affiché
              </label>
              <Select
                value={app.environment}
                onValueChange={(env) => {
                  const target = env === "production" ? app.productionClientId : app.sandboxClientId
                  if (target && target !== app.clientId) router.push(`/apps/${encodeURIComponent(target)}`)
                }}
              >
                <SelectTrigger id="env-switch" className="!h-8 w-36 text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="shadow-none">
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        {suspended && control?.suspended ? (
          <div role="status" className="mb-4 rounded-lg border border-[#B3261E]/30 bg-[#FBE9E7] px-4 py-3 text-[13px] text-[#8C1D17] dark:bg-[#3A1513] dark:text-[#F2A49E]">
            <p className="font-semibold">Application suspendue {relativeTime(control.suspended.at)}</p>
            <p className="mt-0.5">
              {control.suspended.by ? `Par ${control.suspended.by.name ?? control.suspended.by.email ?? "un administrateur"}. ` : ""}
              {control.suspended.reason ? `Motif : ${control.suspended.reason}` : "Aucun motif renseigné."}
            </p>
          </div>
        ) : app.productionStatus === "pending" && app.productionClientId ? (
          <div role="status" className="mb-4 rounded-lg bg-idn-yellow-soft px-4 py-3 text-[13px] text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
            <p className="font-semibold">Demande de passage en production</p>
            <p className="mt-0.5">
              L&apos;environnement Production attend votre validation. Il reste
              désactivé sur l&apos;émetteur OIDC jusqu&apos;à son approbation.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel id="config" title="Configuration OAuth">
              <dl>
                <Field label="client_id">
                  <CopyValue value={app.clientId} label="le client_id" />
                </Field>
                <Field label="URL de redirection">
                  {redirects.length === 0 ? undefined : (
                    <ul className="space-y-1">
                      {redirects.map((u) => (
                        <li key={u} className="break-all font-mono text-xs">{u}</li>
                      ))}
                    </ul>
                  )}
                </Field>
                <Field label="Scopes">
                  {scopes.length === 0 ? undefined : (
                    <span className="flex flex-wrap gap-1">
                      {scopes.map((s) => (
                        <span key={s} className="rounded bg-idn-surface-2 px-1.5 font-mono text-xs leading-5 text-idn-ink-2">
                          {s}
                        </span>
                      ))}
                    </span>
                  )}
                </Field>
                <Field label="Niveau minimal">
                  <LoABadge level={app.loa} />
                </Field>
                <Field label="Consentement">
                  {app.loa >= 2
                    ? "Écran de consentement présenté au citoyen"
                    : "Application de confiance, sans écran de consentement"}
                </Field>
              </dl>
            </Panel>

            <Panel id="envs" title="Environnements">
              <ul className="divide-y divide-idn-border-soft">
                {(
                  [
                    ["Sandbox", app.sandboxClientId],
                    ["Production", app.productionClientId],
                  ] as const
                ).map(([label, id]) => (
                  <li key={label} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span>
                      <span className="block text-[13px] font-medium text-idn-ink">{label}</span>
                      <span className="block font-mono text-[11px] text-idn-muted">
                        {id ?? "Non créé"}
                      </span>
                    </span>
                    {id && id !== app.clientId ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/apps/${encodeURIComponent(id)}`}>Ouvrir</Link>
                      </Button>
                    ) : id ? (
                      <span className="text-xs text-idn-muted">Affiché</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Panel>

            <DelegationPanel clientId={app.clientId} delegation={app.delegation} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel id="owner" title="Propriétaire">
              {control?.owner ? (
                <PersonCell person={control.owner} secondary="email" />
              ) : (
                <p className="text-[13px] text-idn-muted">
                  Créée depuis la console d&apos;administration, sans compte développeur rattaché.
                </p>
              )}
            </Panel>

            <Panel id="app-history" title="Historique" bodyClassName="p-0">
              {history === undefined ? (
                <div className="space-y-3 p-5">
                  <Skeleton className="w-full" />
                  <Skeleton className="w-2/3" />
                </div>
              ) : history.length === 0 ? (
                <EmptyState title="Aucun événement" description="Les approbations, suspensions et modifications apparaîtront ici." />
              ) : (
                <ol className="divide-y divide-idn-border-soft">
                  {history.map((e) => (
                    <li key={e._id} className="px-5 py-3">
                      <p className="text-[13px] font-medium text-idn-ink">{eventLabel(e.action, e.metadata)}</p>
                      <p className="mt-0.5 text-xs text-idn-muted">
                        <time title={fmtDateTime(e.createdAt)}>{relativeTime(e.createdAt)}</time>
                        {" · "}
                        {e.actor ? (e.actor.name ?? e.actor.email ?? "Compte sans nom") : "Système"}
                        {typeof e.metadata?.reason === "string" && e.metadata.reason
                          ? ` · « ${e.metadata.reason} »`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  )
}

function DelegationPanel({
  clientId,
  delegation,
}: {
  clientId: string
  delegation: { enabled: boolean; maxLoa: 1 | 2; grantedAt?: number } | null
}) {
  const t = fr.appDetail.delegation
  const setDelegation = useMutation(api.admin.oauthApps.setDelegation)
  const [maxLoa, setMaxLoa] = useState<1 | 2>(delegation?.maxLoa ?? 1)
  const [confirmOff, setConfirmOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const enabled = Boolean(delegation?.enabled)

  const identities = useQuery(
    api.admin.oauthApps.listDelegatedIdentities,
    enabled ? { clientId } : "skip",
  )

  const save = async (next: { enabled: boolean; maxLoa: 1 | 2 }, success: string) => {
    setBusy(true)
    try {
      await setDelegation({ clientId, ...next })
      toast.success(success)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Modification impossible.")
      throw err
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      id="delegation"
      title={t.title}
      description={t.description}
      actions={<StatusPill tone={enabled ? "green" : "neutral"}>{enabled ? t.enabled : t.disabled}</StatusPill>}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[220px] flex-col gap-1">
          <label htmlFor="delegation-loa" className="adm-kicker">
            {t.maxLoa}
          </label>
          <Select
            value={String(maxLoa)}
            onValueChange={(v) => {
              const loa = Number(v) as 1 | 2
              setMaxLoa(loa)
              if (enabled) void save({ enabled: true, maxLoa: loa }, "Niveau maximal mis à jour.").catch(() => {})
            }}
          >
            <SelectTrigger id="delegation-loa" className="!h-9 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="shadow-none">
              <SelectItem value="1">{t.loa1}</SelectItem>
              <SelectItem value="2">{t.loa2}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {enabled ? (
          <Button variant="outline" size="sm" className="h-9" disabled={busy} onClick={() => setConfirmOff(true)}>
            {t.disable}
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-9"
            disabled={busy}
            onClick={() => void save({ enabled: true, maxLoa }, "Délégation activée.").catch(() => {})}
          >
            {t.enable}
          </Button>
        )}
      </div>

      {enabled ? (
        <div className="mt-5 border-t border-idn-border-soft pt-4">
          <h3 className="mb-2 text-[13px] font-semibold text-idn-ink">{t.historyTitle}</h3>
          {identities === undefined ? (
            <Skeleton className="h-10 w-full" />
          ) : identities.length === 0 ? (
            <p className="text-[13px] text-idn-muted">{t.emptyHistory}</p>
          ) : (
            <DataTable
              label={t.historyTitle}
              minWidth={480}
              head={
                <>
                  <Th>Identité</Th>
                  <Th>Niveau</Th>
                  <Th>Statut</Th>
                  <Th>Création</Th>
                </>
              }
            >
              {identities.map((row) => (
                <Tr key={row._id}>
                  <Td>
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {row.firstName && row.lastName ? `${row.firstName} ${row.lastName}` : "Identité sans nom"}
                      </span>
                      <span className="font-mono text-[11px] text-idn-muted">{row.idnId ?? "ID IDN non attribué"}</span>
                    </span>
                  </Td>
                  <Td>
                    <LoABadge level={row.assignedLoa} compact />
                  </Td>
                  <Td>
                    <StatusPill tone={row.status === "claimed" ? "green" : "blue"}>
                      {row.status === "claimed" ? t.statusClaimed : t.statusCreated}
                    </StatusPill>
                  </Td>
                  <Td className={cn("whitespace-nowrap text-idn-muted")}>{relativeTime(row.createdAt)}</Td>
                </Tr>
              ))}
            </DataTable>
          )}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Désactiver la délégation d'identité"
        consequence="L'application ne pourra plus créer d'identités numériques pour le compte de citoyens. Les identités déjà créées sont conservées."
        confirmLabel="Désactiver"
        destructive
        onConfirm={() => save({ enabled: false, maxLoa }, "Délégation désactivée.")}
      />
    </Panel>
  )
}
