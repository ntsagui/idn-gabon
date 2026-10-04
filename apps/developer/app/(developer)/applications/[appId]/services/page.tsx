"use client"

import { useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
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
import { Textarea } from "@repo/ui/components/textarea"

import type { DeveloperApplication } from "../../../../_components/application-groups"
import { ConfirmDialog } from "../../../../_components/confirm-dialog"
import { errorMessage } from "../../../../_components/format"
import { Icon } from "../../../../_components/icons"
import { EmptyState, Notice, PageBody, Panel } from "../../../../_components/ui"
import { useAppWorkspace } from "../_components/app-context"

type Service = DeveloperApplication["services"][number]

const CATEGORIES: Record<Service["category"], string> = {
  administrative: "Administratif",
  civilStatus: "État civil",
  fiscal: "Fiscalité",
  education: "Éducation",
  health: "Santé",
  transport: "Transport",
  social: "Social",
  other: "Autre",
}

const EMPTY: Service = { id: "", label: "", description: "", category: "administrative", link: "" }

export default function ApplicationServicesPage() {
  const { app } = useAppWorkspace()
  const setServices = useMutation(api.developer.apps.setServices)
  const [editing, setEditing] = useState<{ index: number | null; value: Service } | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const persist = async (next: Service[], success: string): Promise<boolean> => {
    try {
      await setServices({ clientId: app.clientId, services: next })
      toast.success(success)
      return true
    } catch (err) {
      const message = errorMessage(err, "Enregistrement impossible.")
      setError(message)
      toast.error(message)
      return false
    }
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing) return
    const value = {
      ...editing.value,
      id: editing.value.id.trim(),
      label: editing.value.label.trim(),
      description: editing.value.description.trim(),
      link: editing.value.link.trim(),
    }
    if (!value.id || !value.label || !value.link) {
      setError("Identifiant, intitulé et lien sont obligatoires.")
      return
    }
    const next =
      editing.index === null
        ? [...app.services, value]
        : app.services.map((s, i) => (i === editing.index ? value : s))
    setBusy(true)
    setError(null)
    const ok = await persist(next, editing.index === null ? "Service ajouté." : "Service modifié.")
    setBusy(false)
    if (ok) setEditing(null)
  }

  return (
    <PageBody>
      <div className="space-y-5">
        <Notice tone="info">
          Les services publiés apparaissent dans le catalogue de l&apos;application mobile Identité Numérique, pour
          les usagers qui ont autorisé votre application.
        </Notice>
        <Panel
          title="Services publiés"
          description={`${app.services.length} / 50 services.`}
          actions={
            <Button
              type="button"
              size="sm"
              disabled={app.services.length >= 50}
              onClick={() => {
                setError(null)
                setEditing({ index: null, value: EMPTY })
              }}
            >
              <Icon name="plus" size={15} /> Ajouter un service
            </Button>
          }
          bodyClassName={app.services.length ? "p-0" : undefined}
        >
          {app.services.length === 0 ? (
            <EmptyState
              icon="layers"
              title="Aucun service publié"
              description="Décrivez les démarches accessibles depuis votre service (intitulé, catégorie, lien https) pour qu'elles soient proposées aux usagers."
              className="border-0 py-6"
            />
          ) : (
            <ul className="divide-y divide-idn-border-soft">
              {app.services.map((service, index) => (
                <li key={service.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-idn-ink">{service.label}</p>
                    <p className="text-xs text-idn-muted">
                      {CATEGORIES[service.category]} · <span className="font-mono">{service.id}</span>
                    </p>
                    {service.description ? (
                      <p className="mt-0.5 text-[13px] text-idn-ink-2">{service.description}</p>
                    ) : null}
                    <a
                      href={service.link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 break-all font-mono text-xs text-idn-green underline-offset-2 hover:underline dark:text-idn-green-on-dark"
                    >
                      {service.link} <Icon name="external" size={12} />
                      <span className="sr-only">(nouvel onglet)</span>
                    </a>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null)
                        setEditing({ index, value: service })
                      }}
                    >
                      Modifier
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoving(index)}
                      className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2857E]"
                    >
                      Retirer
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && !busy && setEditing(null)}>
        <DialogContent className="rounded-[14px] border-idn-border bg-idn-surface shadow-none sm:max-w-lg">
          {editing ? (
            <form onSubmit={save} className="grid gap-4">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-idn-ink">
                  {editing.index === null ? "Ajouter un service" : "Modifier le service"}
                </DialogTitle>
                <DialogDescription className="text-sm text-idn-muted">
                  Visible des usagers dans le catalogue des services.
                </DialogDescription>
              </DialogHeader>
              {error ? (
                <p role="alert" className="rounded-[10px] border border-[#B3261E]/30 bg-[#FBE9E7] px-3 py-2 text-[13px] text-[#B3261E] dark:bg-[#3A1614] dark:text-[#F2857E]">
                  {error}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="svc-id">Identifiant</Label>
                  <Input
                    id="svc-id"
                    value={editing.value.id}
                    maxLength={64}
                    onChange={(e) => setEditing({ ...editing, value: { ...editing.value, id: e.target.value } })}
                    placeholder="acte-naissance"
                    className="h-10 font-mono text-[13px]"
                    aria-describedby="svc-id-hint"
                  />
                  <p id="svc-id-hint" className="text-xs text-idn-muted">a-z, 0-9, tiret, souligné.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="svc-category">Catégorie</Label>
                  <select
                    id="svc-category"
                    value={editing.value.category}
                    onChange={(e) =>
                      setEditing({ ...editing, value: { ...editing.value, category: e.target.value as Service["category"] } })
                    }
                    className="h-10 w-full rounded-md border border-idn-border bg-idn-surface px-3 text-sm text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
                  >
                    {Object.entries(CATEGORIES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-label">Intitulé</Label>
                <Input
                  id="svc-label"
                  value={editing.value.label}
                  onChange={(e) => setEditing({ ...editing, value: { ...editing.value, label: e.target.value } })}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-description">Description</Label>
                <Textarea
                  id="svc-description"
                  rows={2}
                  value={editing.value.description}
                  onChange={(e) => setEditing({ ...editing, value: { ...editing.value, description: e.target.value } })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="svc-link">Lien</Label>
                <Input
                  id="svc-link"
                  type="url"
                  value={editing.value.link}
                  onChange={(e) => setEditing({ ...editing, value: { ...editing.value, link: e.target.value } })}
                  placeholder="https://votre-service.ga/demarche"
                  className="h-10 font-mono text-[13px]"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Retirer « ${removing !== null ? (app.services[removing]?.label ?? "") : ""} » ?`}
        description="Le service disparaît du catalogue des usagers dès l'enregistrement."
        confirmLabel="Retirer"
        onConfirm={async () => {
          if (removing === null) return
          const ok = await persist(app.services.filter((_, i) => i !== removing), "Service retiré.")
          if (!ok) return true
        }}
      />
    </PageBody>
  )
}
