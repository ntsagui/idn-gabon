"use client"

import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { Textarea } from "@repo/ui/components/textarea"
import { cn } from "@repo/ui/lib/utils"

import { AppLogo } from "../../../_components/app-logo"
import { ConfirmDialog } from "../../../_components/confirm-dialog"
import { useScopeCatalog } from "../../../_components/data"
import { errorMessage, formatDate } from "../../../_components/format"
import { Icon } from "../../../_components/icons"
import { LOA_INFO, OAUTH_SCOPE_INFO } from "../../../_components/scopes"
import { SecretDialog, type RevealedSecret } from "../../../_components/secret-dialog"
import { Notice, PageBody, Panel, StatusPill } from "../../../_components/ui"
import { useAppWorkspace } from "./_components/app-context"

export default function ApplicationOverviewPage() {
  const { app, group } = useAppWorkspace()
  return (
    <PageBody>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <ProfilePanel key={`profile-${app.clientId}`} />
          <RedirectsPanel key={`redirects-${app.clientId}`} />
          <ScopesPanel key={`scopes-${app.clientId}`} />
          {app.env === "sandbox" ? <TestUsersPanel /> : null}
        </div>
        <div className="space-y-5">
          <Panel title="Résumé">
            <dl className="space-y-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-idn-muted">Environnement</dt>
                <dd className="text-idn-ink">{app.env === "production" ? "Production" : "Sandbox"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-idn-muted">Niveau exigé</dt>
                <dd>
                  <LoABadge level={app.loa} compact />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-idn-muted">Scopes</dt>
                <dd className="text-idn-ink">{app.scopes.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-idn-muted">Services publiés</dt>
                <dd className="text-idn-ink">{app.services.length}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-idn-muted">Créée le</dt>
                <dd className="text-idn-ink">{formatDate(app.createdAt)}</dd>
              </div>
            </dl>
          </Panel>
          {group.sandbox ? <ProductionPanel /> : null}
          <DangerPanel />
        </div>
      </div>
    </PageBody>
  )
}

function ProfilePanel() {
  const { app, icon } = useAppWorkspace()
  const updateProfile = useMutation(api.developer.appProfile.updateProfile)
  const generateUploadUrl = useMutation(api.developer.appProfile.generateLogoUploadUrl)
  const setLogo = useMutation(api.developer.appProfile.setLogo)
  const [name, setName] = useState(app.name)
  const [description, setDescription] = useState(app.description)
  const [loa, setLoa] = useState<1 | 2 | 3>(app.loa)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const dirty = name.trim() !== app.name || description.trim() !== app.description || loa !== app.loa
  const loaLocked = app.env === "production"

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile({ clientId: app.clientId, name: name.trim(), description: description.trim(), loa })
      toast.success("Informations enregistrées.")
    } catch (error) {
      toast.error(errorMessage(error, "Enregistrement impossible."))
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Format accepté : PNG, JPEG ou WebP.")
      return
    }
    if (file.size > 512 * 1024) {
      toast.error("Le logo ne doit pas dépasser 512 Ko.")
      return
    }
    setUploading(true)
    try {
      const url = await generateUploadUrl({})
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": file.type }, body: file })
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> }
      const result = await setLogo({ clientId: app.clientId, storageId })
      if (result.ok) toast.success("Logo mis à jour.")
      else toast.error(result.message)
    } catch (error) {
      toast.error(errorMessage(error, "Envoi du logo impossible."))
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = async () => {
    try {
      await setLogo({ clientId: app.clientId })
      toast.success("Logo retiré.")
    } catch (error) {
      toast.error(errorMessage(error, "Suppression du logo impossible."))
    }
  }

  return (
    <Panel
      id="profile"
      title="Informations"
      description="Le nom et le logo sont présentés aux usagers sur l'écran de consentement."
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-4">
          <AppLogo name={app.name} icon={icon} size={56} />
          <div className="flex flex-wrap gap-2">
            <label
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-idn-border bg-idn-surface px-3 text-[13px] font-medium text-idn-ink hover:bg-idn-surface-2 focus-within:outline-2 focus-within:outline-idn-green",
                uploading && "pointer-events-none opacity-60",
              )}
            >
              <Icon name="upload" size={15} />
              {uploading ? "Envoi…" : icon ? "Changer le logo" : "Ajouter un logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  void uploadLogo(e.target.files?.[0])
                  e.target.value = ""
                }}
              />
            </label>
            {icon ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void removeLogo()}>
                Retirer
              </Button>
            ) : null}
          </div>
          <p className="w-full text-xs text-idn-muted">PNG, JPEG ou WebP, 512 Ko maximum.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-name">Nom</Label>
            <Input id="profile-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="profile-description">Description</Label>
            <Textarea
              id="profile-description"
              value={description}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <fieldset>
          <legend className="text-sm font-medium text-idn-ink">Niveau de garantie exigé</legend>
          {loaLocked ? (
            <p className="mt-0.5 text-[13px] text-idn-muted">
              Fixé lors de la validation de la production ; une modification exige une nouvelle revue.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {([1, 2, 3] as const).map((level) => (
              <label
                key={level}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] border px-3 py-2",
                  loa === level ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                  loaLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                )}
              >
                <input
                  type="radio"
                  name={`loa-${app.clientId}`}
                  checked={loa === level}
                  disabled={loaLocked}
                  onChange={() => setLoa(level)}
                  className="size-4 accent-[#0E7C3A]"
                />
                <LoABadge level={level} compact />
                <span className="font-mono text-xs text-idn-muted">{LOA_INFO[level].acr}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end">
          <Button type="button" disabled={!dirty || saving || !name.trim()} onClick={() => void save()}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function RedirectsPanel() {
  const { app } = useAppWorkspace()
  const setRedirectUris = useMutation(api.developer.apps.setRedirectUris)
  const [uris, setUris] = useState<string[]>(app.redirectUris.length ? app.redirectUris : [""])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setUris(app.redirectUris.length ? app.redirectUris : [""])
  }, [app.redirectUris])
  const clean = uris.map((u) => u.trim()).filter(Boolean)
  const dirty = clean.join("\n") !== app.redirectUris.join("\n")

  const save = async () => {
    setSaving(true)
    try {
      await setRedirectUris({ clientId: app.clientId, redirectUris: clean })
      toast.success("URL de redirection enregistrées.")
    } catch (error) {
      toast.error(errorMessage(error, "Enregistrement impossible."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel
      id="redirects"
      title="URL de redirection"
      description={
        app.env === "production"
          ? "Correspondance exacte avec redirect_uri. https obligatoire en production."
          : "Correspondance exacte avec redirect_uri. http://localhost est accepté en sandbox."
      }
    >
      <ul className="space-y-2">
        {uris.map((uri, index) => (
          <li key={index} className="flex gap-2">
            <Input
              value={uri}
              onChange={(e) => setUris((list) => list.map((u, i) => (i === index ? e.target.value : u)))}
              aria-label={`URL de redirection ${index + 1}`}
              placeholder="https://votre-service.ga/callback"
              className="h-9 font-mono text-[13px]"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              disabled={uris.length === 1}
              onClick={() => setUris((list) => list.filter((_, i) => i !== index))}
              aria-label={`Retirer l'URL ${index + 1}`}
            >
              <Icon name="x" size={15} />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setUris((list) => [...list, ""])}>
          <Icon name="plus" size={15} /> Ajouter une URL
        </Button>
        <Button type="button" size="sm" disabled={!dirty || saving || clean.length === 0} onClick={() => void save()}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Panel>
  )
}

function ScopesPanel() {
  const { app } = useAppWorkspace()
  const catalog = useScopeCatalog()
  const setScopes = useMutation(api.developer.apps.setScopes)
  const [selected, setSelected] = useState<string[]>(app.scopes)
  const [saving, setSaving] = useState(false)
  const dirty = [...selected].sort().join(" ") !== [...app.scopes].sort().join(" ")

  const save = async () => {
    setSaving(true)
    try {
      await setScopes({ clientId: app.clientId, scopes: selected })
      toast.success("Scopes enregistrés.")
    } catch (error) {
      toast.error(errorMessage(error, "Enregistrement impossible."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel id="scopes" title="Scopes" description="Données demandées à l'usager lors du consentement.">
      {catalog === undefined ? (
        <p className="text-sm text-idn-muted">Chargement…</p>
      ) : (
        <fieldset>
          <legend className="sr-only">Scopes demandés</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {catalog.oauthScopes.map((scope) => {
              const info = OAUTH_SCOPE_INFO[scope]
              const checked = selected.includes(scope)
              return (
                <label
                  key={scope}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-[10px] border p-3",
                    checked ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={info?.required}
                    onChange={(e) =>
                      setSelected((list) => (e.target.checked ? [...list, scope] : list.filter((s) => s !== scope)))
                    }
                    className="mt-0.5 size-4 accent-[#0E7C3A]"
                  />
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] text-idn-ink">{scope}</span>
                    <span className="block text-xs leading-5 text-idn-muted">{info?.description ?? ""}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </Panel>
  )
}

function TestUsersPanel() {
  const { app } = useAppWorkspace()
  const addTestUser = useMutation(api.developer.apps.addTestUser)
  const removeTestUser = useMutation(api.developer.apps.removeTestUser)
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      await addTestUser({ clientId: app.clientId, email: email.trim() })
      toast.success("Compte de test ajouté.")
      setEmail("")
    } catch (error) {
      toast.error(errorMessage(error, "Ajout impossible."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel
      id="test-users"
      title="Comptes de test"
      description={`En sandbox, seuls vous et ces comptes peuvent se connecter (${app.testUsers.length} / 25).`}
    >
      <form onSubmit={add} className="flex gap-2">
        <Label htmlFor="test-user" className="sr-only">
          Adresse e-mail du compte de test
        </Label>
        <Input
          id="test-user"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="testeur@exemple.ga"
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={busy || !email.trim()} className="h-9">
          Ajouter
        </Button>
      </form>
      {app.testUsers.length === 0 ? (
        <p className="mt-3 text-[13px] text-idn-muted">
          Aucun compte de test. Ajoutez l&apos;adresse du compte Identité Numérique de chaque testeur.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-idn-border-soft rounded-[10px] border border-idn-border">
          {app.testUsers.map((user) => (
            <li key={user} className="flex h-11 items-center justify-between gap-3 px-3">
              <span className="truncate text-sm text-idn-ink">{user}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await removeTestUser({ clientId: app.clientId, email: user })
                    toast.success("Compte de test retiré.")
                  } catch (error) {
                    toast.error(errorMessage(error, "Retrait impossible."))
                  }
                }}
                aria-label={`Retirer ${user}`}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function ProductionPanel() {
  const { group } = useAppWorkspace()
  const sandbox = group.sandbox!
  const account = useQuery(api.developer.catalog.accountStatus, {})
  const requestProduction = useMutation(api.developer.apps.requestProduction)
  const [confirming, setConfirming] = useState(false)
  const [secret, setSecret] = useState<RevealedSecret | null>(null)
  const status = sandbox.productionStatus
  const production = group.production

  const label =
    production && !production.disabled
      ? { tone: "success" as const, text: "Approuvée" }
      : status === "pending"
        ? { tone: "info" as const, text: "En revue" }
        : status === "rejected"
          ? { tone: "danger" as const, text: "Refusée" }
          : { tone: "neutral" as const, text: "Non demandée" }

  const insecure = sandbox.redirectUris.filter((u) => !u.startsWith("https://"))
  const canRequest = (status === "none" || status === "rejected") && !production

  return (
    <Panel title="Mise en production" actions={<StatusPill tone={label.tone}>{label.text}</StatusPill>}>
      <div className="space-y-3 text-[13px] leading-5 text-idn-muted">
        {production && !production.disabled ? (
          <p>La production est ouverte. Basculez sur l&apos;environnement Production pour ses identifiants.</p>
        ) : status === "pending" ? (
          <p>
            Demande transmise à l&apos;administration. Le client_id de production reste inactif jusqu&apos;à sa
            validation.
          </p>
        ) : (
          <>
            <p>
              La demande crée un client_id de production, inactif jusqu&apos;à la validation par
              l&apos;administration. Les URL de redirection doivent être en https.
            </p>
            {account && !account.verified ? (
              <Notice tone="info">
                Votre compte développeur doit d&apos;abord être validé par un super-administrateur.
              </Notice>
            ) : null}
            {insecure.length > 0 ? (
              <Notice tone="attention">
                URL non https à corriger : <span className="font-mono">{insecure.join(", ")}</span>
              </Notice>
            ) : null}
          </>
        )}
        {canRequest ? (
          <Button
            type="button"
            className="w-full"
            disabled={!account?.verified || insecure.length > 0}
            onClick={() => setConfirming(true)}
          >
            Demander la mise en production
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        destructive={false}
        title="Demander la mise en production ?"
        description="Un client_id et un secret de production sont créés immédiatement, puis examinés par l'administration. Le secret ne sera affiché qu'une fois."
        confirmLabel="Envoyer la demande"
        onConfirm={async () => {
          try {
            const result = await requestProduction({ clientId: sandbox.clientId })
            setSecret({
              title: "Identifiants de production",
              description: "Inactifs jusqu'à la validation par l'administration.",
              label: "client_secret",
              value: result.clientSecret,
              extra: [{ label: "client_id", value: result.clientId }],
            })
            toast.success("Demande de mise en production envoyée.")
          } catch (error) {
            toast.error(errorMessage(error, "La demande n'a pas abouti."))
          }
        }}
      />
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </Panel>
  )
}

function DangerPanel() {
  const { group } = useAppWorkspace()
  const router = useRouter()
  const remove = useMutation(api.developer.apps.remove)
  const [open, setOpen] = useState(false)
  const target = group.sandbox ?? group.production!
  return (
    <Panel title="Zone sensible">
      <p className="text-[13px] leading-5 text-idn-muted">
        La suppression est définitive{group.production && group.sandbox ? " et concerne les deux environnements" : ""}.
      </p>
      <Button type="button" variant="outline" className="mt-3 w-full border-[#B3261E]/40 text-[#B3261E] hover:bg-[#FBE9E7] dark:text-[#F2857E]" onClick={() => setOpen(true)}>
        <Icon name="trash" size={15} /> Supprimer l&apos;application
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Supprimer « ${group.name} » ?`}
        description={
          <ul className="list-disc space-y-1 pl-5">
            <li>Les connexions en cours sont révoquées et les consentements des usagers retirés.</li>
            <li>Les clés API liées sont révoquées et les webhooks désactivés.</li>
            <li>Le client_id ne pourra plus jamais être utilisé.</li>
          </ul>
        }
        confirmLabel="Supprimer définitivement"
        onConfirm={async () => {
          try {
            await remove({ clientId: target.clientId })
            toast.success(`Application « ${group.name} » supprimée.`)
            router.replace("/applications")
          } catch (error) {
            toast.error(errorMessage(error, "Suppression impossible."))
            return true
          }
        }}
      />
    </Panel>
  )
}
