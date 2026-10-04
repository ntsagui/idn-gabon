"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { useEffect, useRef, useState } from "react"
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
import { CopyButton } from "../../../_components/copy"
import { useScopeCatalog } from "../../../_components/data"
import { errorMessage } from "../../../_components/format"
import { Icon } from "../../../_components/icons"
import { LOA_INFO, OAUTH_SCOPE_INFO } from "../../../_components/scopes"
import { Kicker, Notice, PageBody, PageHeader, Panel } from "../../../_components/ui"

const STEPS = ["Identité", "Redirections", "Accès", "Environnement"] as const
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_LOGO_BYTES = 512 * 1024

type Created = {
  name: string
  sandbox: { clientId: string; clientSecret: string }
  production?: { clientId: string; clientSecret: string }
  productionError?: string
}

function validateUri(uri: string): string | null {
  try {
    const url = new URL(uri)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Utilisez une URL http(s)."
    }
    if (url.hash) return "Une URL de redirection ne contient pas de fragment (#)."
    return null
  } catch {
    return "URL invalide."
  }
}

export default function NewApplicationPage() {
  const router = useRouter()
  const catalog = useScopeCatalog()
  const account = useQuery(api.developer.catalog.accountStatus, {})
  const create = useMutation(api.developer.apps.create)
  const generateUploadUrl = useMutation(api.developer.appProfile.generateLogoUploadUrl)
  const setLogo = useMutation(api.developer.appProfile.setLogo)
  const requestProduction = useMutation(api.developer.apps.requestProduction)

  const [step, setStep] = useState(0)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [logo, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uris, setUris] = useState<string[]>([""])
  const [scopes, setScopes] = useState<string[]>(["openid", "profile", "email"])
  const [loa, setLoa] = useState<1 | 2 | 3>(1)
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [created, setCreated] = useState<Created | null>(null)
  const [saved, setSaved] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  useEffect(() => {
    if (!logo) {
      setLogoPreview(null)
      return
    }
    const url = URL.createObjectURL(logo)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logo])

  const cleanUris = uris.map((u) => u.trim()).filter(Boolean)

  const validateStep = (index: number): boolean => {
    const next: Record<string, string> = {}
    if (index === 0) {
      if (!name.trim()) next.name = "Le nom est obligatoire."
      else if (name.trim().length > 80) next.name = "80 caractères maximum."
      if (description.length > 500) next.description = "500 caractères maximum."
    }
    if (index === 1) {
      if (cleanUris.length === 0) next.uris = "Ajoutez au moins une URL de redirection."
      uris.forEach((uri, i) => {
        if (!uri.trim()) return
        const problem = validateUri(uri.trim())
        if (problem) next[`uri-${i}`] = problem
      })
    }
    if (index === 3 && environment === "production") {
      const insecure = cleanUris.find((u) => !u.startsWith("https://"))
      if (insecure) next.environment = `La production exige des URL en https : ${insecure}`
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onLogo = (file: File | null) => {
    setErrors((e) => ({ ...e, logo: "" }))
    if (!file) {
      setLogoFile(null)
      return
    }
    if (!LOGO_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, logo: "Format accepté : PNG, JPEG ou WebP." }))
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setErrors((e) => ({ ...e, logo: "Le logo ne doit pas dépasser 512 Ko." }))
      return
    }
    setLogoFile(file)
  }

  const submit = async () => {
    if (![0, 1, 3].every((i) => validateStep(i))) return
    setSubmitting(true)
    try {
      const sandbox = await create({
        name: name.trim(),
        description: description.trim(),
        redirectUris: cleanUris,
        scopes,
        loa,
      })
      if (logo) {
        try {
          const uploadUrl = await generateUploadUrl({})
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": logo.type },
            body: logo,
          })
          const { storageId } = (await response.json()) as { storageId: Id<"_storage"> }
          const result = await setLogo({ clientId: sandbox.clientId, storageId })
          if (!result.ok) toast.error(`Logo non enregistré : ${result.message}`)
        } catch {
          toast.error("Application créée, mais le logo n'a pas pu être envoyé. Réessayez depuis sa fiche.")
        }
      }
      const result: Created = {
        name: name.trim(),
        sandbox: { clientId: sandbox.clientId, clientSecret: sandbox.clientSecret },
      }
      if (environment === "production") {
        try {
          const production = await requestProduction({ clientId: sandbox.clientId })
          result.production = {
            clientId: production.clientId,
            clientSecret: production.clientSecret,
          }
        } catch (error) {
          result.productionError = errorMessage(error, "La demande de production n'a pas abouti.")
        }
      }
      setCreated(result)
      toast.success("Application créée.")
    } catch (error) {
      toast.error(errorMessage(error, "Création impossible."))
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <>
        <PageHeader
          kicker="Application créée"
          title={created.name}
          description="Voici vos identifiants. Les secrets ne seront plus jamais affichés."
          crumbs={[{ label: "Applications", href: "/applications" }, { label: created.name }]}
        />
        <PageBody className="max-w-[820px]">
          <div className="space-y-4">
            <CredentialsBlock title="Sandbox" credentials={created.sandbox} />
            {created.production ? (
              <CredentialsBlock
                title="Production (en revue)"
                credentials={created.production}
                note="Ce client_id restera inactif jusqu'à la validation par l'administration."
              />
            ) : null}
            {created.productionError ? (
              <Notice tone="attention" title="Demande de production non envoyée">
                {created.productionError} Vous pourrez la renouveler depuis la fiche de l&apos;application.
              </Notice>
            ) : null}
            <Notice tone="attention" title="Affichés une seule fois">
              Identité Numérique ne conserve qu&apos;une empreinte des secrets. Enregistrez-les maintenant
              dans votre gestionnaire de secrets.
            </Notice>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-idn-ink">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
                className="size-4 accent-[#0E7C3A]"
              />
              J&apos;ai enregistré les secrets en lieu sûr.
            </label>
            <div className="flex gap-3">
              <Button
                disabled={!saved}
                onClick={() => router.push(`/applications/${created.sandbox.clientId}`)}
              >
                Ouvrir l&apos;application
              </Button>
            </div>
          </div>
        </PageBody>
      </>
    )
  }

  const oauthScopes = catalog?.oauthScopes ?? []

  return (
    <>
      <PageHeader
        kicker="Nouvelle application"
        title="Enregistrer une application"
        description="Quatre étapes. L'application naît en sandbox : seuls vous et vos comptes de test pourront s'y connecter."
        crumbs={[{ label: "Applications", href: "/applications" }, { label: "Nouvelle application" }]}
      />
      <PageBody className="max-w-[880px]">
        <ol aria-label="Étapes" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((label, index) => (
            <li key={label}>
              <div
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[13px]",
                  index === step
                    ? "border-idn-green bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                    : index < step
                      ? "border-idn-border bg-idn-surface text-idn-ink"
                      : "border-idn-border bg-idn-surface text-idn-muted",
                )}
              >
                <span className="font-mono text-[11px] font-medium">
                  {index < step ? <Icon name="check" size={14} /> : `0${index + 1}`}
                </span>
                <span className="font-medium">{label}</span>
              </div>
            </li>
          ))}
        </ol>

        <Panel bodyClassName="px-6 py-6">
          <Kicker>
            Étape {step + 1} sur {STEPS.length}
          </Kicker>
          <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-lg font-semibold text-idn-ink outline-none">
            {STEPS[step]}
          </h2>

          {step === 0 ? (
            <div className="mt-5 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="app-name">Nom de l&apos;application</Label>
                <Input
                  id="app-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby="app-name-hint"
                  className="h-10"
                />
                <p id="app-name-hint" className={cn("text-xs", errors.name ? "text-destructive" : "text-idn-muted")}>
                  {errors.name || "Affiché aux usagers sur l'écran de consentement."}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-description">Description (facultative)</Label>
                <Textarea
                  id="app-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  aria-describedby="app-description-hint"
                />
                <p id="app-description-hint" className="text-xs text-idn-muted">
                  {errors.description || `${description.length} / 500 caractères.`}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="app-logo">Logo (facultatif)</Label>
                <div className="flex items-center gap-4">
                  <AppLogo name={name || "Application"} icon={logoPreview} size={56} />
                  <div className="space-y-1">
                    <input
                      id="app-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => onLogo(e.target.files?.[0] ?? null)}
                      aria-describedby="app-logo-hint"
                      className="block text-sm text-idn-ink file:mr-3 file:h-9 file:rounded-[10px] file:border file:border-idn-border file:bg-idn-surface file:px-3 file:text-sm file:font-medium file:text-idn-ink hover:file:bg-idn-surface-2"
                    />
                    <p id="app-logo-hint" className={cn("text-xs", errors.logo ? "text-destructive" : "text-idn-muted")}>
                      {errors.logo || "PNG, JPEG ou WebP, 512 Ko maximum, carré de préférence."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-idn-muted">
                Adresses vers lesquelles IDN renvoie l&apos;usager après connexion. Elles doivent
                correspondre exactement au paramètre <code className="font-mono">redirect_uri</code>.
                En sandbox, <code className="font-mono">http://localhost</code> est accepté ; la
                production exige https.
              </p>
              <ul className="space-y-2">
                {uris.map((uri, index) => (
                  <li key={index} className="space-y-1">
                    <div className="flex gap-2">
                      <Input
                        value={uri}
                        onChange={(e) =>
                          setUris((list) => list.map((u, i) => (i === index ? e.target.value : u)))
                        }
                        placeholder="https://votre-service.ga/callback"
                        aria-label={`URL de redirection ${index + 1}`}
                        aria-invalid={Boolean(errors[`uri-${index}`])}
                        className="h-10 font-mono text-[13px]"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={uris.length === 1}
                        onClick={() => setUris((list) => list.filter((_, i) => i !== index))}
                        aria-label={`Retirer l'URL ${index + 1}`}
                      >
                        <Icon name="x" size={16} />
                      </Button>
                    </div>
                    {errors[`uri-${index}`] ? (
                      <p role="alert" className="text-xs text-destructive">
                        {errors[`uri-${index}`]}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {errors.uris ? (
                <p role="alert" className="text-xs text-destructive">
                  {errors.uris}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uris.length >= 10}
                onClick={() => setUris((list) => [...list, ""])}
              >
                <Icon name="plus" size={15} /> Ajouter une URL
              </Button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="mt-5 space-y-6">
              <fieldset>
                <legend className="text-sm font-medium text-idn-ink">Scopes demandés</legend>
                <p className="mt-0.5 text-[13px] text-idn-muted">
                  Ne demandez que ce dont votre service a besoin : l&apos;usager voit chaque scope sur
                  l&apos;écran de consentement.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {oauthScopes.map((scope) => {
                    const info = OAUTH_SCOPE_INFO[scope]
                    const checked = scopes.includes(scope)
                    const locked = info?.required === true
                    return (
                      <label
                        key={scope}
                        className={cn(
                          "flex cursor-pointer gap-3 rounded-[10px] border p-3",
                          checked ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                          locked && "cursor-default",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={(e) =>
                            setScopes((list) =>
                              e.target.checked ? [...list, scope] : list.filter((s) => s !== scope),
                            )
                          }
                          className="mt-0.5 size-4 accent-[#0E7C3A]"
                        />
                        <span className="min-w-0">
                          <span className="block font-mono text-[13px] text-idn-ink">{scope}</span>
                          <span className="block text-xs leading-5 text-idn-muted">
                            {info?.description ?? "Scope accepté par le serveur."}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium text-idn-ink">Niveau de garantie exigé</legend>
                <p className="mt-0.5 text-[13px] text-idn-muted">
                  Un usager sous ce niveau sera invité à vérifier son identité avant de consentir.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {([1, 2, 3] as const).map((level) => (
                    <label
                      key={level}
                      className={cn(
                        "flex cursor-pointer flex-col gap-2 rounded-[10px] border p-3",
                        loa === level ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="loa"
                          checked={loa === level}
                          onChange={() => setLoa(level)}
                          className="size-4 accent-[#0E7C3A]"
                        />
                        <LoABadge level={level} compact />
                      </span>
                      <span className="font-mono text-xs text-idn-ink-2">acr = {LOA_INFO[level].acr}</span>
                      <span className="text-xs leading-5 text-idn-muted">{LOA_INFO[level].description}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-5 space-y-5">
              <fieldset>
                <legend className="text-sm font-medium text-idn-ink">Environnement</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-[10px] border p-3",
                      environment === "sandbox" ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                    )}
                  >
                    <input
                      type="radio"
                      name="env"
                      checked={environment === "sandbox"}
                      onChange={() => setEnvironment("sandbox")}
                      className="mt-0.5 size-4 accent-[#0E7C3A]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-idn-ink">Sandbox</span>
                      <span className="block text-xs leading-5 text-idn-muted">
                        Active immédiatement. Connexion réservée à vous et à vos comptes de test.
                      </span>
                    </span>
                  </label>
                  <label
                    className={cn(
                      "flex gap-3 rounded-[10px] border p-3",
                      account?.verified ? "cursor-pointer" : "cursor-not-allowed opacity-70",
                      environment === "production" ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                    )}
                  >
                    <input
                      type="radio"
                      name="env"
                      disabled={!account?.verified}
                      checked={environment === "production"}
                      onChange={() => setEnvironment("production")}
                      aria-describedby="env-prod-hint"
                      className="mt-0.5 size-4 accent-[#0E7C3A]"
                    />
                    <span>
                      <span className="block text-sm font-medium text-idn-ink">Sandbox et demande de production</span>
                      <span id="env-prod-hint" className="block text-xs leading-5 text-idn-muted">
                        {account?.verified
                          ? "Un client_id de production est créé, inactif jusqu'à la validation par l'administration."
                          : "Réservé aux comptes développeur validés par l'administration. Vous pourrez la demander plus tard."}
                      </span>
                    </span>
                  </label>
                </div>
                {errors.environment ? (
                  <p role="alert" className="mt-2 text-xs text-destructive">
                    {errors.environment}
                  </p>
                ) : null}
              </fieldset>

              <div className="rounded-[10px] border border-idn-border">
                <p className="border-b border-idn-border-soft px-4 py-2.5 text-sm font-semibold text-idn-ink">
                  Récapitulatif
                </p>
                <dl className="divide-y divide-idn-border-soft text-[13px]">
                  <Row label="Nom">
                    <span className="flex items-center gap-2">
                      <AppLogo name={name} icon={logoPreview} size={24} />
                      {name}
                    </span>
                  </Row>
                  {description ? <Row label="Description">{description}</Row> : null}
                  <Row label="Redirections">
                    <ul className="space-y-0.5 font-mono">
                      {cleanUris.map((u) => (
                        <li key={u} className="break-all">{u}</li>
                      ))}
                    </ul>
                  </Row>
                  <Row label="Scopes">
                    <span className="font-mono">{scopes.join(" ")}</span>
                  </Row>
                  <Row label="Niveau exigé">
                    <LoABadge level={loa} compact />
                  </Row>
                </dl>
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-idn-border-soft pt-5">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                <Icon name="arrowLeft" size={16} /> Précédent
              </Button>
            ) : (
              <Button asChild variant="ghost">
                <Link href="/applications">Annuler</Link>
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Suivant <Icon name="arrowRight" size={16} />
              </Button>
            ) : (
              <Button type="button" onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Création…" : "Créer l'application"}
              </Button>
            )}
          </div>
        </Panel>
      </PageBody>
    </>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-2.5 sm:grid-cols-[140px_1fr]">
      <dt className="text-idn-muted">{label}</dt>
      <dd className="min-w-0 text-idn-ink">{children}</dd>
    </div>
  )
}

function CredentialsBlock({
  title,
  credentials,
  note,
}: {
  title: string
  credentials: { clientId: string; clientSecret: string }
  note?: string
}) {
  return (
    <Panel title={title} description={note}>
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-idn-ink">client_id</p>
          <div className="flex items-center gap-2">
            <code className="block min-w-0 flex-1 break-all rounded-[10px] border border-idn-border bg-idn-surface-2 px-3 py-2 font-mono text-[13px] text-idn-ink">
              {credentials.clientId}
            </code>
            <CopyButton value={credentials.clientId} label="Copier le client_id" />
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[13px] font-medium text-idn-ink">client_secret</p>
          <div className="flex items-center gap-2">
            <code
              data-testid="revealed-secret"
              className="block min-w-0 flex-1 break-all rounded-[10px] border border-idn-green/40 bg-idn-green-soft px-3 py-2 font-mono text-[13px] text-idn-ink dark:bg-[#0F2A18]"
            >
              {credentials.clientSecret}
            </code>
            <CopyButton value={credentials.clientSecret} label="Copier le client_secret" />
          </div>
        </div>
      </div>
    </Panel>
  )
}
