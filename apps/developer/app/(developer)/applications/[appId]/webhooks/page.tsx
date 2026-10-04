"use client"

import Link from "next/link"
import { useAction, useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useState } from "react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { cn } from "@repo/ui/lib/utils"

import { ConfirmDialog } from "../../../../_components/confirm-dialog"
import { errorMessage, formatDateTime, formatRelative } from "../../../../_components/format"
import { Icon } from "../../../../_components/icons"
import { SecretDialog, type RevealedSecret } from "../../../../_components/secret-dialog"
import {
  EmptyState,
  LoadingBlock,
  Notice,
  PageBody,
  Panel,
  StatusPill,
  type PillTone,
} from "../../../../_components/ui"
import { useAppWorkspace } from "../_components/app-context"

type EndpointRow = FunctionReturnType<typeof api.webhooks.endpoints.list>[number]
type EventType = EndpointRow["subscriptions"][number]
type TestResult = FunctionReturnType<typeof api.developer.webhookTest.sendTestEvent>

const ENDPOINT_STATUS: Record<EndpointRow["endpoint"]["status"], { label: string; tone: PillTone }> = {
  pending: { label: "À vérifier", tone: "attention" },
  active: { label: "Actif", tone: "success" },
  paused: { label: "En pause", tone: "attention" },
  disabled: { label: "Désactivé", tone: "neutral" },
}

const DELIVERY_STATUS: Record<string, { label: string; tone: PillTone }> = {
  pending: { label: "En attente", tone: "info" },
  delivering: { label: "En cours", tone: "info" },
  retrying: { label: "Nouvel essai prévu", tone: "attention" },
  succeeded: { label: "Livré", tone: "success" },
  failed: { label: "Échec", tone: "danger" },
  canceled: { label: "Annulé", tone: "neutral" },
}

const REASONS: Record<string, string> = {
  HTTP_410: "L'endpoint a répondu 410 (Gone) : modifiez son URL.",
  TOO_MANY_FAILURES: "20 échecs consécutifs : endpoint mis en pause. Corrigez-le puis réactivez-le.",
  MANUALLY_DISABLED: "Désactivé manuellement.",
  CHALLENGE_MISMATCH: "La réponse au challenge ne contenait pas la valeur attendue.",
  APP_INACTIVE: "L'application n'est pas active.",
  TIMEOUT: "Délai de 10 s dépassé.",
  SSRF_ADDRESS_FORBIDDEN: "L'URL pointe vers une adresse interdite (réseau privé).",
  DNS_NO_ADDRESS: "Le nom de domaine ne résout vers aucune adresse.",
}

const describeReason = (reason: string | null) =>
  reason ? (REASONS[reason] ?? (reason.startsWith("HTTP_") ? `Réponse HTTP ${reason.slice(5)}.` : reason)) : null

export default function ApplicationWebhooksPage() {
  const { app } = useAppWorkspace()
  if (app.disabled) {
    return (
      <PageBody>
        <Notice tone="info" title="Environnement inactif">
          Les webhooks de production se configurent une fois l&apos;application validée par l&apos;administration.
        </Notice>
      </PageBody>
    )
  }
  return <WebhooksWorkspace key={app.clientId} />
}

function WebhooksWorkspace() {
  const { app } = useAppWorkspace()
  const endpoints = useQuery(api.webhooks.endpoints.list, { clientId: app.clientId })
  const catalog = useQuery(api.webhooks.endpoints.catalog, {})
  const [editing, setEditing] = useState<EndpointRow | "new" | null>(null)
  const [selected, setSelected] = useState<Id<"webhookEndpoints"> | null>(null)
  const [secret, setSecret] = useState<RevealedSecret | null>(null)
  const limit = app.env === "production" ? 10 : 3
  const selectedRow = endpoints?.find((row) => row.endpoint.id === selected) ?? endpoints?.[0] ?? null

  return (
    <PageBody>
      <div className="space-y-5">
        <Panel
          title="Endpoints"
          description={`Chaque événement est signé (HMAC SHA-256) et réessayé jusqu'à 8 fois. ${endpoints?.length ?? 0} / ${limit} endpoints.`}
          actions={
            <Button
              type="button"
              size="sm"
              disabled={endpoints === undefined || endpoints.length >= limit}
              onClick={() => setEditing("new")}
            >
              <Icon name="plus" size={15} /> Ajouter un endpoint
            </Button>
          }
        >
          {endpoints === undefined ? (
            <LoadingBlock rows={2} />
          ) : endpoints.length === 0 ? (
            <EmptyState
              icon="webhook"
              title="Aucun endpoint"
              description="Déclarez l'URL https de votre serveur qui recevra les événements, puis vérifiez-la : IDN y envoie un challenge signé que votre serveur doit renvoyer."
              className="border-0 py-6"
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/docs/webhooks">Lire le guide des webhooks</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {endpoints.map((row) => (
                <EndpointCard
                  key={row.endpoint.id}
                  row={row}
                  catalog={catalog ?? []}
                  selected={selectedRow?.endpoint.id === row.endpoint.id}
                  onSelect={() => setSelected(row.endpoint.id)}
                  onEdit={() => setEditing(row)}
                  onSecret={setSecret}
                />
              ))}
            </ul>
          )}
        </Panel>

        {selectedRow ? <DeliveriesPanel row={selectedRow} /> : null}

        <Panel title="Vérifier la signature">
          <p className="text-[13px] leading-5 text-idn-muted">
            Chaque requête porte <code className="font-mono">X-IDN-Timestamp</code> et{" "}
            <code className="font-mono">X-IDN-Signature: v1=…</code>, HMAC SHA-256 de{" "}
            <code className="font-mono">{"`${timestamp}.${corps brut}`"}</code> avec le secret de l&apos;endpoint.
            Pendant 24 h après une rotation, deux signatures sont envoyées, séparées par une virgule.{" "}
            <Link href="/docs/webhooks" className="font-medium text-idn-green underline-offset-2 hover:underline dark:text-idn-green-on-dark">
              Exemple de vérification
            </Link>
          </p>
        </Panel>
      </div>

      <EndpointDialog
        open={editing !== null}
        row={editing === "new" ? null : editing}
        catalog={catalog ?? []}
        onClose={() => setEditing(null)}
        onCreated={(value) =>
          setSecret({
            title: "Secret de signature",
            description: "Utilisez-le pour vérifier la signature X-IDN-Signature. Étape suivante : vérifier l'endpoint.",
            label: "Secret (whsec_…)",
            value,
          })
        }
      />
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </PageBody>
  )
}

function EndpointCard({
  row,
  catalog,
  selected,
  onSelect,
  onEdit,
  onSecret,
}: {
  row: EndpointRow
  catalog: FunctionReturnType<typeof api.webhooks.endpoints.catalog>
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onSecret: (secret: RevealedSecret) => void
}) {
  const { endpoint } = row
  const requestChallenge = useMutation(api.webhooks.endpoints.requestChallenge)
  const rotateSecret = useMutation(api.webhooks.endpoints.rotateSecret)
  const disable = useMutation(api.webhooks.endpoints.disable)
  const resume = useMutation(api.webhooks.endpoints.resume)
  const remove = useMutation(api.webhooks.endpoints.remove)
  const sendTest = useAction(api.developer.webhookTest.sendTestEvent)
  const [confirm, setConfirm] = useState<"rotate" | "disable" | "remove" | null>(null)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestResult | null>(null)
  const status = ENDPOINT_STATUS[endpoint.status]
  const reason = describeReason(endpoint.pausedReason)
  const labels = new Map(catalog.map((c) => [c.type, c.label]))

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action()
      toast.success(success)
    } catch (error) {
      toast.error(errorMessage(error, "Action impossible."))
    }
  }

  const runTest = async () => {
    setTesting(true)
    setTest(null)
    try {
      const result = await sendTest({ endpointId: endpoint.id })
      setTest(result)
      if (result.ok) toast.success(`Événement de test livré (HTTP ${result.httpStatus}).`)
      else toast.error("L'événement de test n'a pas été accepté par votre serveur.")
    } catch (error) {
      toast.error(errorMessage(error, "Envoi impossible."))
    } finally {
      setTesting(false)
    }
  }

  return (
    <li
      className={cn(
        "rounded-[10px] border p-4",
        selected ? "border-idn-green/60" : "border-idn-border",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onSelect} className="min-w-0 text-left focus-visible:outline-2 focus-visible:outline-idn-green" aria-pressed={selected}>
          <span className="block text-sm font-semibold text-idn-ink">{endpoint.name}</span>
          <span className="block break-all font-mono text-xs text-idn-muted">{endpoint.url}</span>
        </button>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {row.subscriptions.map((type) => (
          <span key={type} className="inline-flex h-6 items-center rounded-md bg-idn-surface-2 px-2 font-mono text-[11px] text-idn-ink-2" title={labels.get(type)}>
            {type}
          </span>
        ))}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-idn-muted sm:grid-cols-3">
        <div>
          <dt className="inline">Dernier succès : </dt>
          <dd className="inline text-idn-ink-2">{endpoint.lastSuccessAt ? formatRelative(endpoint.lastSuccessAt) : "aucun"}</dd>
        </div>
        <div>
          <dt className="inline">Dernier échec : </dt>
          <dd className="inline text-idn-ink-2">{endpoint.lastFailureAt ? formatRelative(endpoint.lastFailureAt) : "aucun"}</dd>
        </div>
        <div>
          <dt className="inline">Vérifié : </dt>
          <dd className="inline text-idn-ink-2">{endpoint.verifiedAt ? formatRelative(endpoint.verifiedAt) : "non"}</dd>
        </div>
      </dl>
      {reason ? <p className="mt-2 text-xs text-[#6B5400] dark:text-[#F2D35B]">{reason}</p> : null}
      {test ? (
        <p
          role="status"
          className={cn(
            "mt-3 rounded-md px-3 py-2 font-mono text-xs",
            test.ok
              ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
              : "bg-[#FBE9E7] text-[#B3261E] dark:bg-[#3A1614] dark:text-[#F2857E]",
          )}
        >
          webhook.test · {test.eventId} · {test.httpStatus ? `HTTP ${test.httpStatus}` : (test.errorCode ?? "erreur")} ·{" "}
          {test.durationMs} ms
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {endpoint.status === "pending" ? (
          <Button type="button" size="sm" onClick={() => void run(() => requestChallenge({ endpointId: endpoint.id }), "Challenge envoyé : le statut se met à jour dès la réponse de votre serveur.")}>
            <Icon name="shield" size={15} /> Vérifier l&apos;endpoint
          </Button>
        ) : null}
        {endpoint.status === "active" ? (
          <Button type="button" size="sm" variant="outline" disabled={testing} onClick={() => void runTest()}>
            <Icon name="send" size={15} /> {testing ? "Envoi…" : "Envoyer un événement de test"}
          </Button>
        ) : null}
        {endpoint.status === "paused" || endpoint.status === "disabled" ? (
          <Button type="button" size="sm" variant="outline" onClick={() => void run(() => resume({ endpointId: endpoint.id }), "Endpoint réactivé.")}>
            <Icon name="play" size={15} /> Réactiver
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          Modifier
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setConfirm("rotate")}>
          <Icon name="refresh" size={15} /> Nouveau secret
        </Button>
        {endpoint.status === "active" || endpoint.status === "pending" ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm("disable")}>
            <Icon name="pause" size={15} /> Désactiver
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setConfirm("remove")}
          className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2857E]"
        >
          <Icon name="trash" size={15} /> Supprimer
        </Button>
      </div>

      <ConfirmDialog
        open={confirm === "rotate"}
        onOpenChange={(open) => !open && setConfirm(null)}
        destructive={false}
        title="Générer un nouveau secret de signature ?"
        description="Pendant 24 heures, chaque événement portera deux signatures (ancien et nouveau secret) : déployez le nouveau secret dans ce délai."
        confirmLabel="Générer"
        onConfirm={async () => {
          try {
            const result = await rotateSecret({ endpointId: endpoint.id })
            onSecret({
              title: "Nouveau secret de signature",
              description: `L'ancien reste accepté jusqu'au ${formatDateTime(result.previousValidUntil)}.`,
              label: "Secret (whsec_…)",
              value: result.secret,
            })
          } catch (error) {
            toast.error(errorMessage(error, "Rotation impossible."))
            return true
          }
        }}
      />
      <ConfirmDialog
        open={confirm === "disable"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Désactiver « ${endpoint.name} » ?`}
        description="Plus aucun événement ne lui sera livré tant qu'il n'est pas réactivé. Les événements émis entre-temps ne sont pas rattrapés."
        confirmLabel="Désactiver"
        onConfirm={async () => {
          await run(() => disable({ endpointId: endpoint.id }), "Endpoint désactivé.")
        }}
      />
      <ConfirmDialog
        open={confirm === "remove"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Supprimer « ${endpoint.name} » ?`}
        description="L'endpoint et son secret sont détruits ; l'historique des livraisons reste consultable par l'audit. Action irréversible."
        confirmLabel="Supprimer"
        onConfirm={async () => {
          await run(() => remove({ endpointId: endpoint.id }), "Endpoint supprimé.")
        }}
      />
    </li>
  )
}

function EndpointDialog({
  open,
  row,
  catalog,
  onClose,
  onCreated,
}: {
  open: boolean
  row: EndpointRow | null
  catalog: FunctionReturnType<typeof api.webhooks.endpoints.catalog>
  onClose: () => void
  onCreated: (secret: string) => void
}) {
  const { app } = useAppWorkspace()
  const create = useMutation(api.webhooks.endpoints.create)
  const update = useMutation(api.webhooks.endpoints.update)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [events, setEvents] = useState<EventType[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [initialized, setInitialized] = useState<string | null>(null)

  const key = open ? (row?.endpoint.id ?? "new") : null
  if (key !== initialized) {
    setInitialized(key)
    setName(row?.endpoint.name ?? "")
    setUrl(row?.endpoint.url ?? "")
    setEvents(row?.subscriptions ?? [])
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (row) {
        await update({ endpointId: row.endpoint.id, name: name.trim(), url: url.trim(), eventTypes: events })
        toast.success(url.trim() !== row.endpoint.url ? "Endpoint modifié : vérifiez la nouvelle URL." : "Endpoint modifié.")
      } else {
        const result = await create({ clientId: app.clientId, name: name.trim(), url: url.trim(), eventTypes: events })
        onCreated(result.secret)
        toast.success("Endpoint ajouté.")
      }
      onClose()
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="rounded-[14px] border-idn-border bg-idn-surface shadow-none sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-idn-ink">
              {row ? "Modifier l'endpoint" : "Ajouter un endpoint"}
            </DialogTitle>
            <DialogDescription className="text-sm text-idn-muted">
              URL https publique. Les adresses de réseaux privés sont refusées.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="rounded-[10px] border border-[#B3261E]/30 bg-[#FBE9E7] px-3 py-2 text-[13px] text-[#B3261E] dark:bg-[#3A1614] dark:text-[#F2857E]">
              {error}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="wh-name">Nom</Label>
            <Input id="wh-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wh-url">URL</Label>
            <Input
              id="wh-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://votre-service.ga/webhooks/idn"
              className="h-10 font-mono text-[13px]"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium text-idn-ink">Événements</legend>
            <div className="mt-2 space-y-1.5">
              {catalog.map((entry) => {
                const missingScope = entry.authorization === "oauth_user" && !app.scopes.includes(entry.requiredScope)
                return (
                  <label
                    key={entry.type}
                    className={cn(
                      "flex items-start gap-2.5 rounded-[10px] border border-idn-border px-3 py-2",
                      missingScope ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-idn-surface-2",
                    )}
                  >
                    <input
                      type="checkbox"
                      disabled={missingScope}
                      checked={events.includes(entry.type)}
                      onChange={(e) =>
                        setEvents((list) => (e.target.checked ? [...list, entry.type] : list.filter((t) => t !== entry.type)))
                      }
                      className="mt-0.5 size-4 accent-[#0E7C3A]"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[13px] text-idn-ink">{entry.type}</span>
                      <span className="block text-xs text-idn-muted">
                        {entry.label} ·{" "}
                        {entry.authorization === "oauth_user"
                          ? missingScope
                            ? `déclarez le scope ${entry.requiredScope} pour l'activer`
                            : `usagers ayant consenti à ${entry.requiredScope}`
                          : `livré si une clé API active porte ${entry.requiredScope}`}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy || !name.trim() || !url.trim() || events.length === 0}>
              {busy ? "Enregistrement…" : row ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeliveriesPanel({ row }: { row: EndpointRow }) {
  const deliveries = useQuery(api.webhooks.endpoints.listDeliveries, { endpointId: row.endpoint.id })
  const replay = useMutation(api.webhooks.endpoints.replay)
  const [filter, setFilter] = useState<"all" | "failed">("all")
  const rows = (deliveries ?? []).filter((d) => filter === "all" || d.status === "failed" || d.status === "canceled")

  return (
    <Panel
      title={`Livraisons · ${row.endpoint.name}`}
      description="100 dernières livraisons d'événements réels (les événements de test n'y figurent pas)."
      actions={
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          aria-label="Filtrer les livraisons"
          className="h-8 rounded-[10px] border border-idn-border bg-idn-surface px-2 text-[13px] text-idn-ink"
        >
          <option value="all">Toutes</option>
          <option value="failed">Échecs</option>
        </select>
      }
      bodyClassName="p-0"
    >
      {deliveries === undefined ? (
        <div className="p-4">
          <LoadingBlock rows={2} />
        </div>
      ) : rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-idn-muted">
          {deliveries.length === 0
            ? "Aucun événement livré pour l'instant. Les livraisons apparaîtront dès qu'un événement souscrit sera émis."
            : "Aucun échec."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-[13px]">
            <thead className="bg-idn-surface-2 text-xs text-idn-muted">
              <tr className="h-10">
                <th scope="col" className="px-4 font-medium">Événement</th>
                <th scope="col" className="px-4 font-medium">Statut</th>
                <th scope="col" className="px-4 font-medium">Tentatives</th>
                <th scope="col" className="px-4 font-medium">Dernière réponse</th>
                <th scope="col" className="px-4 font-medium">Émis</th>
                <th scope="col" className="px-4 font-medium"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-idn-border-soft">
              {rows.map((delivery) => {
                const status = DELIVERY_STATUS[delivery.status] ?? { label: delivery.status, tone: "neutral" as const }
                return (
                  <tr key={delivery.id} className="h-11 hover:bg-idn-surface-2/60">
                    <td className="px-4 py-2">
                      <span className="block font-mono text-xs text-idn-ink">{delivery.eventType}</span>
                      <span className="block font-mono text-[11px] text-idn-muted">{delivery.eventId}</span>
                    </td>
                    <td className="px-4 py-2"><StatusPill tone={status.tone}>{status.label}</StatusPill></td>
                    <td className="px-4 py-2 tabular-nums text-idn-ink-2">{delivery.attempts}</td>
                    <td className="px-4 py-2 font-mono text-xs text-idn-ink-2">
                      {delivery.lastHttpStatus ? `HTTP ${delivery.lastHttpStatus}` : (delivery.lastErrorCode ?? "Aucune")}
                    </td>
                    <td className="px-4 py-2 text-idn-ink-2" title={formatDateTime(delivery.createdAt)}>
                      {formatRelative(delivery.createdAt)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {delivery.status === "failed" || delivery.status === "canceled" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={row.endpoint.status !== "active"}
                          onClick={async () => {
                            try {
                              await replay({ deliveryId: delivery.id })
                              toast.success("Livraison relancée.")
                            } catch (error) {
                              toast.error(errorMessage(error, "Rejeu impossible."))
                            }
                          }}
                        >
                          Rejouer
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}
