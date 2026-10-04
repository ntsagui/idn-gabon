"use client"

import { useMutation } from "convex/react"
import type { FunctionReturnType } from "convex/server"
import { useMemo, useState } from "react"
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

import type { ApplicationGroup } from "./application-groups"
import { ConfirmDialog } from "./confirm-dialog"
import { useScopeCatalog } from "./data"
import { errorMessage, formatDate, formatRelative } from "./format"
import { Icon } from "./icons"
import { M2M_SCOPE_INFO } from "./scopes"
import { SecretDialog, type RevealedSecret } from "./secret-dialog"
import { StatusPill } from "./ui"

export type ApiKey = FunctionReturnType<typeof api.developer.apiKeys.listKeys>[number]

const STATUS: Record<ApiKey["status"], { label: string; tone: "success" | "neutral" | "danger" }> = {
  active: { label: "Active", tone: "success" },
  expired: { label: "Expirée", tone: "neutral" },
  revoked: { label: "Révoquée", tone: "danger" },
}

export function KeyStatus({ status }: { status: ApiKey["status"] }) {
  return <StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill>
}

const EXPIRY_OPTIONS = [
  { value: "", label: "Sans expiration" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "365", label: "1 an" },
]

/**
 * Création d'une clé API serveur. La clé est toujours rattachée à une
 * application active (une clé orpheline n'a plus de propriétaire lisible).
 */
export function CreateKeyDialog({
  open,
  onOpenChange,
  applications,
  fixedClientId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  applications: Array<{ clientId: string; label: string; disabled: boolean }>
  fixedClientId?: string
}) {
  const catalog = useScopeCatalog()
  const createKey = useMutation(api.developer.apiKeys.createKey)
  const selectable = applications.filter((a) => !a.disabled)
  const [name, setName] = useState("")
  const [clientId, setClientId] = useState(fixedClientId ?? "")
  const [scopes, setScopes] = useState<string[]>([])
  const [expiry, setExpiry] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secret, setSecret] = useState<RevealedSecret | null>(null)
  const effectiveClientId = fixedClientId ?? (clientId || selectable[0]?.clientId || "")

  const reset = () => {
    setName("")
    setScopes([])
    setExpiry("")
    setError(null)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError("Donnez un nom à la clé (son usage, par exemple « Serveur de production »).")
      return
    }
    if (!effectiveClientId) {
      setError("Choisissez l'application à laquelle rattacher la clé.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await createKey({
        name: name.trim(),
        appClientId: effectiveClientId,
        scopes,
        expiresInDays: expiry ? Number(expiry) : undefined,
      })
      onOpenChange(false)
      reset()
      setSecret({
        title: "Clé API créée",
        description: `« ${name.trim()} » — à transmettre dans l'en-tête Authorization: Bearer.`,
        label: "Clé API",
        value: result.token,
      })
      toast.success("Clé API créée.")
    } catch (err) {
      setError(errorMessage(err, "Création impossible."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!busy) {
            onOpenChange(next)
            if (!next) reset()
          }
        }}
      >
        <DialogContent className="rounded-[14px] border-idn-border bg-idn-surface shadow-none sm:max-w-lg">
          <form onSubmit={submit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-idn-ink">Nouvelle clé API</DialogTitle>
              <DialogDescription className="text-sm text-idn-muted">
                Pour les appels serveur à serveur, hors session d&apos;usager. Ne l&apos;embarquez jamais
                dans une application web ou mobile.
              </DialogDescription>
            </DialogHeader>
            {error ? (
              <p role="alert" className="rounded-[10px] border border-[#B3261E]/30 bg-[#FBE9E7] px-3 py-2 text-[13px] text-[#B3261E] dark:bg-[#3A1614] dark:text-[#F2857E]">
                {error}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="key-name">Nom</Label>
              <Input id="key-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
            {fixedClientId ? null : (
              <div className="space-y-1.5">
                <Label htmlFor="key-app">Application</Label>
                <select
                  id="key-app"
                  value={effectiveClientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 w-full rounded-md border border-idn-border bg-idn-surface px-3 text-sm text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
                >
                  {selectable.length === 0 ? <option value="">Aucune application active</option> : null}
                  {selectable.map((app) => (
                    <option key={app.clientId} value={app.clientId}>
                      {app.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <fieldset>
              <legend className="text-sm font-medium text-idn-ink">Scopes</legend>
              <p className="text-xs text-idn-muted">Accordez le strict nécessaire. Certains scopes sont soumis à habilitation.</p>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-[10px] border border-idn-border p-2">
                {(catalog?.m2mScopes ?? []).map((scope) => (
                  <label key={scope} className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-idn-surface-2">
                    <input
                      type="checkbox"
                      checked={scopes.includes(scope)}
                      onChange={(e) =>
                        setScopes((list) => (e.target.checked ? [...list, scope] : list.filter((s) => s !== scope)))
                      }
                      className="mt-0.5 size-4 accent-[#0E7C3A]"
                    />
                    <span className="min-w-0">
                      <span className="block font-mono text-[13px] text-idn-ink">{scope}</span>
                      <span className="block text-xs text-idn-muted">{M2M_SCOPE_INFO[scope] ?? ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="key-expiry">Expiration</Label>
              <select
                id="key-expiry"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="h-10 w-full rounded-md border border-idn-border bg-idn-surface px-3 text-sm text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={busy || (!fixedClientId && selectable.length === 0)}>
                {busy ? "Création…" : "Créer la clé"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </>
  )
}

const PAGE_SIZE = 10
type SortKey = "createdAt" | "name" | "lastUsedAt"

/** Tableau des clés : tri, filtre de statut, recherche et pagination réels. */
export function KeysTable({
  keys,
  groups,
  showApplication = true,
}: {
  keys: ApiKey[]
  groups?: ApplicationGroup[]
  showApplication?: boolean
}) {
  const revokeKey = useMutation(api.developer.apiKeys.revokeKey)
  const attachKeyToApp = useMutation(api.developer.apiKeys.attachKeyToApp)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | ApiKey["status"]>("active")
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" })
  const [page, setPage] = useState(0)
  const [revoking, setRevoking] = useState<ApiKey | null>(null)
  const [attaching, setAttaching] = useState<ApiKey | null>(null)
  const [attachTarget, setAttachTarget] = useState("")

  const appName = useMemo(() => {
    const map = new Map<string, string>()
    for (const group of groups ?? []) {
      if (group.sandbox) map.set(group.sandbox.clientId, `${group.name} · Sandbox`)
      if (group.production) map.set(group.production.clientId, `${group.name} · Production`)
    }
    return map
  }, [groups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = keys.filter((key) => {
      if (status !== "all" && key.status !== status) return false
      if (!q) return true
      return [key.name, key.tokenPrefix, key.appClientId ?? "", appName.get(key.appClientId ?? "") ?? ""]
        .some((value) => value.toLowerCase().includes(q))
    })
    const factor = sort.dir === "asc" ? 1 : -1
    rows.sort((a, b) => {
      if (sort.key === "name") return a.name.localeCompare(b.name, "fr") * factor
      return ((a[sort.key] ?? 0) - (b[sort.key] ?? 0)) * factor
    })
    return rows
  }, [keys, search, status, sort, appName])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))
  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === "asc" ? "ascending" : "descending") : "none"

  const SortHeader = ({ label, sortKey }: { label: string; sortKey: SortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className="inline-flex items-center gap-1 rounded-sm hover:text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
    >
      {label}
      <Icon
        name={sort.key === sortKey && sort.dir === "asc" ? "chevronUp" : "chevronDown"}
        size={13}
        className={sort.key === sortKey ? "text-idn-ink" : "opacity-40"}
      />
    </button>
  )

  const attachOptions = (groups ?? []).flatMap((group) =>
    [group.sandbox, group.production]
      .filter((app): app is NonNullable<typeof app> => Boolean(app))
      .map((app) => ({ clientId: app.clientId, label: appName.get(app.clientId) ?? app.clientId })),
  )

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-idn-muted" />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(0)
            }}
            placeholder="Nom, préfixe ou application"
            aria-label="Rechercher une clé"
            className="h-9 pl-9"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-idn-muted">
          Statut
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status)
              setPage(0)
            }}
            className="h-9 rounded-[10px] border border-idn-border bg-idn-surface px-2 text-[13px] text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
          >
            <option value="active">Actives</option>
            <option value="expired">Expirées</option>
            <option value="revoked">Révoquées</option>
            <option value="all">Toutes</option>
          </select>
        </label>
        <p className="text-[13px] text-idn-muted sm:ml-auto" aria-live="polite">
          {filtered.length} clé{filtered.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="overflow-x-auto rounded-[14px] border border-idn-border bg-idn-surface">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="sticky top-0 bg-idn-surface-2 text-xs text-idn-muted">
            <tr className="h-10">
              <th scope="col" aria-sort={ariaSort("name")} className="px-4 font-medium">
                <SortHeader label="Nom" sortKey="name" />
              </th>
              {showApplication ? (
                <th scope="col" className="px-4 font-medium">Application</th>
              ) : null}
              <th scope="col" className="px-4 font-medium">Scopes</th>
              <th scope="col" className="px-4 font-medium">Statut</th>
              <th scope="col" aria-sort={ariaSort("createdAt")} className="px-4 font-medium">
                <SortHeader label="Créée" sortKey="createdAt" />
              </th>
              <th scope="col" aria-sort={ariaSort("lastUsedAt")} className="px-4 font-medium">
                <SortHeader label="Dernier usage" sortKey="lastUsedAt" />
              </th>
              <th scope="col" className="px-4 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-idn-border-soft">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={showApplication ? 7 : 6} className="px-4 py-8 text-center text-idn-muted">
                  {keys.length === 0
                    ? "Aucune clé pour l'instant."
                    : "Aucune clé ne correspond à ces filtres."}
                </td>
              </tr>
            ) : (
              rows.map((key) => (
                <tr key={key.id} className="h-11 hover:bg-idn-surface-2/60">
                  <td className="px-4 py-2">
                    <span className="block font-medium text-idn-ink">{key.name}</span>
                    <span className="block font-mono text-xs text-idn-muted">{key.tokenPrefix}…</span>
                  </td>
                  {showApplication ? (
                    <td className="px-4 py-2">
                      {key.appClientId ? (
                        <>
                          <span className="block text-idn-ink">{appName.get(key.appClientId) ?? "Application supprimée"}</span>
                          <span className="block font-mono text-xs text-idn-muted">{key.appClientId}</span>
                        </>
                      ) : (
                        <span className="text-[#6B5400] dark:text-[#F2D35B]">Non rattachée</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-2">
                    {key.scopes.length === 0 ? (
                      <span className="text-idn-muted">Aucun</span>
                    ) : (
                      <span className="font-mono text-xs text-idn-ink-2">{key.scopes.join(", ")}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <KeyStatus status={key.status} />
                    {key.status === "active" && key.expiresAt ? (
                      <span className="mt-0.5 block text-xs text-idn-muted">expire {formatRelative(key.expiresAt)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 text-idn-ink-2" title={formatDate(key.createdAt)}>
                    {formatRelative(key.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-idn-ink-2">
                    {key.lastUsedAt ? formatRelative(key.lastUsedAt) : <span className="text-idn-muted">Jamais</span>}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      {!key.appClientId && key.status === "active" && groups ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAttaching(key)
                            setAttachTarget(attachOptions[0]?.clientId ?? "")
                          }}
                        >
                          Rattacher
                        </Button>
                      ) : null}
                      {key.status === "active" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRevoking(key)}
                          className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2857E]"
                          aria-label={`Révoquer la clé ${key.name}`}
                        >
                          Révoquer
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pageCount > 1 ? (
        <nav aria-label="Pagination des clés" className="mt-3 flex items-center justify-end gap-2 text-[13px]">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <Icon name="chevronLeft" size={14} /> Précédent
          </Button>
          <span className="text-idn-muted">
            Page {currentPage + 1} sur {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Suivant <Icon name="chevronRight" size={14} />
          </Button>
        </nav>
      ) : null}

      <ConfirmDialog
        open={revoking !== null}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={`Révoquer la clé « ${revoking?.name ?? ""} » ?`}
        description="Tout appel qui présente cette clé sera refusé immédiatement. La révocation est irréversible : il faudra créer une nouvelle clé."
        confirmLabel="Révoquer la clé"
        onConfirm={async () => {
          if (!revoking) return
          try {
            await revokeKey({ keyId: revoking.id as Id<"developerApiKey"> })
            toast.success(`Clé « ${revoking.name} » révoquée.`)
          } catch (error) {
            toast.error(errorMessage(error, "Révocation impossible."))
            return true
          }
        }}
      />
      <ConfirmDialog
        open={attaching !== null}
        onOpenChange={(open) => !open && setAttaching(null)}
        destructive={false}
        title="Rattacher la clé à une application"
        description="Une clé rattachée est révoquée automatiquement si son application est supprimée. Le rattachement est définitif."
        confirmLabel="Rattacher"
        onConfirm={async () => {
          if (!attaching || !attachTarget) return true
          try {
            await attachKeyToApp({ keyId: attaching.id as Id<"developerApiKey">, appClientId: attachTarget })
            toast.success("Clé rattachée.")
          } catch (error) {
            toast.error(errorMessage(error, "Rattachement impossible."))
            return true
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="attach-app">Application</Label>
          <select
            id="attach-app"
            value={attachTarget}
            onChange={(e) => setAttachTarget(e.target.value)}
            className={cn(
              "h-10 w-full rounded-md border border-idn-border bg-idn-surface px-3 text-sm text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green",
            )}
          >
            {attachOptions.map((option) => (
              <option key={option.clientId} value={option.clientId}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </ConfirmDialog>
    </div>
  )
}
