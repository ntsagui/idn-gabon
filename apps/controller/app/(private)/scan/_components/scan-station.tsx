"use client"

import * as React from "react"
import type { FunctionReturnType } from "convex/server"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { AlertTriangleIcon, CheckCircle2Icon, QrCodeIcon, ShieldAlertIcon, UserRoundIcon } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { pages } from "../../../_content/fr"
import { PageHeader } from "../../../_components/page-header"
import { EmptyState, Field, Panel, Skeleton } from "../../../_components/panel"
import { QrReader } from "../../../_components/qr-reader"
import { ageFromIso, formatCivilDate, formatTime, formatTimeSeconds, startOfDay } from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"

type Identity = FunctionReturnType<typeof api.presentation.verifyToken>
type Failure = { tone: "red" | "yellow"; title: string; text: string }

const PROFILE_TYPES: Record<string, string> = {
  citizen: "Citoyen gabonais",
  resident: "Résident",
  visitor: "Visiteur",
  developer: "Compte développeur",
}
const LOCATION_KEY = "idn-controle-lieu"

function failureFrom(error: unknown): Failure {
  const data = error instanceof ConvexError ? (error.data as { code?: string; kind?: string } | undefined) : undefined
  switch (data?.kind === "RateLimited" ? "RATE_LIMITED" : data?.code) {
    case "TOKEN_EXPIRED":
      return {
        tone: "yellow",
        title: "QR expiré",
        text: "Le QR se renouvelle toutes les 30 secondes : demandez au titulaire de garder l'écran ouvert, puis lisez-le à nouveau.",
      }
    case "INVALID_SIGNATURE":
      return {
        tone: "red",
        title: "QR non émis par IDN",
        text: "La signature ne correspond pas : ce QR a été modifié ou fabriqué. N'acceptez pas cette présentation.",
      }
    case "INVALID_TOKEN_FORMAT":
    case "INVALID_PAYLOAD":
      return {
        tone: "red",
        title: "Ce n'est pas un QR de présentation IDN",
        text: "Le code lu ne provient pas de l'écran « Présenter mon identité » de l'app IDN.",
      }
    case "RATE_LIMITED":
      return { tone: "yellow", title: "Trop de lectures rapprochées", text: "Patientez quelques secondes avant de relire un QR." }
    default:
      return { tone: "red", title: "Vérification impossible", text: "La vérification n'a pas abouti. Vérifiez la connexion et réessayez." }
  }
}

export function ScanStation() {
  const verifyToken = useMutation(api.presentation.verifyToken)
  const now = useNow()
  const [code, setCode] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [verifying, setVerifying] = React.useState(false)
  const [result, setResult] = React.useState<{ identity: Identity; checkedAt: number } | null>(null)
  const [failure, setFailure] = React.useState<Failure | null>(null)
  const inFlight = React.useRef(false)
  const codeRef = React.useRef<HTMLInputElement>(null)
  const resultRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setLocation(window.localStorage.getItem(LOCATION_KEY) ?? "")
  }, [])

  const verify = React.useCallback(
    async (raw: string) => {
      const token = raw.trim()
      if (!token || inFlight.current) return
      inFlight.current = true
      setVerifying(true)
      setFailure(null)
      try {
        const identity = await verifyToken({ token, ...(location.trim() ? { location: location.trim() } : {}) })
        setResult({ identity, checkedAt: Date.now() })
        setCode("")
      } catch (error) {
        setResult(null)
        setFailure(failureFrom(error))
      } finally {
        inFlight.current = false
        setVerifying(false)
        requestAnimationFrame(() => resultRef.current?.focus())
      }
    },
    [verifyToken, location],
  )

  const reset = () => {
    setResult(null)
    setFailure(null)
    setCode("")
    codeRef.current?.focus()
  }

  return (
    <>
      <PageHeader kicker={pages.scan.kicker} title={pages.scan.title} description={pages.scan.description} />
      <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4">
          <QrReader onDetected={(value) => void verify(value)} paused={verifying || result !== null} />

          <Panel title="Saisie du code" description="Douchette, lecteur externe ou copie du code affiché sous le QR.">
            <form
              className="space-y-3 px-5 py-4"
              onSubmit={(event) => {
                event.preventDefault()
                void verify(code)
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="scan-code">Code de présentation IDN</Label>
                <div className="flex gap-2">
                  <Input
                    id="scan-code"
                    ref={codeRef}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="idn:p1:…"
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono text-[13px]"
                  />
                  <Button type="submit" disabled={verifying || !code.trim()}>
                    {verifying ? "Vérification…" : "Vérifier"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scan-location">Lieu du contrôle</Label>
                <Input
                  id="scan-location"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value)
                    window.localStorage.setItem(LOCATION_KEY, e.target.value)
                  }}
                  placeholder="Ex. : Aéroport Léon-Mba, poste 2"
                  aria-describedby="scan-location-help"
                />
                <p id="scan-location-help" className="text-xs text-idn-muted">
                  Facultatif. Inscrit à votre historique et cité dans la notification envoyée au titulaire.
                </p>
              </div>
            </form>
          </Panel>
        </div>

        <div className="min-w-0 space-y-4">
          <div ref={resultRef} tabIndex={-1} aria-live="polite" className="focus:outline-none">
            {verifying ? (
              <Skeleton className="h-[360px] rounded-xl" />
            ) : result ? (
              <IdentityResult identity={result.identity} checkedAt={result.checkedAt} now={now} onReset={reset} />
            ) : failure ? (
              <div
                role="alert"
                className={cn(
                  "rounded-xl border px-5 py-5",
                  failure.tone === "red"
                    ? "border-[#B3261E]/30 bg-[#FBE9E7] text-[#8C1D18] dark:bg-[#3A1E1E] dark:text-[#FF8A80]"
                    : "border-[#9A7400]/30 bg-idn-yellow-soft text-[#4D3C00] dark:bg-[#3A2E14] dark:text-[#F2C94C]",
                )}
              >
                <div className="flex gap-3">
                  {failure.tone === "red" ? (
                    <ShieldAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
                  ) : (
                    <AlertTriangleIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
                  )}
                  <div>
                    <p className="text-base font-semibold">{failure.title}</p>
                    <p className="mt-1 text-sm">{failure.text}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
                      Nouvelle lecture
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Panel>
                <EmptyState icon={QrCodeIcon} title="En attente d'une présentation">
                  Le titulaire ouvre « Présenter mon identité » dans l&apos;app IDN. Lisez le QR avec la caméra ou saisissez le
                  code : l&apos;identité, la photo et le niveau de garantie s&apos;affichent ici.
                </EmptyState>
              </Panel>
            )}
          </div>
          <TodayChecks />
        </div>
      </div>
    </>
  )
}

function IdentityResult({
  identity,
  checkedAt,
  now,
  onReset,
}: {
  identity: Identity
  checkedAt: number
  now: number
  onReset: () => void
}) {
  const holder = useQuery(api.controller.scan.holder, { idnId: identity.idnId })
  const age = ageFromIso(identity.dateOfBirth, now)
  const fullName = `${identity.firstName} ${identity.lastName}`.trim()
  const deleted = holder?.accountState === "deleted"
  const loaChanged = holder && holder.currentLoa !== identity.loa

  return (
    <section aria-label={`Identité vérifiée : ${fullName}`} className="overflow-hidden rounded-xl border border-idn-border bg-idn-surface">
      <div
        className={cn(
          "flex items-center gap-3 px-5 py-3",
          deleted
            ? "bg-[#FBE9E7] text-[#8C1D18] dark:bg-[#3A1E1E] dark:text-[#FF8A80]"
            : "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
        )}
      >
        {deleted ? <ShieldAlertIcon aria-hidden className="size-5" /> : <CheckCircle2Icon aria-hidden className="size-5" />}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{deleted ? "Compte supprimé : présentation à refuser" : "Identité vérifiée"}</p>
          <p className="text-[13px]">Signature IDN valide · contrôlé à {formatTimeSeconds(checkedAt)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row">
        <div className="h-[168px] w-[132px] shrink-0 overflow-hidden rounded-lg border border-idn-border bg-idn-surface-2">
          {holder === undefined ? (
            <Skeleton className="size-full rounded-none" />
          ) : holder?.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={holder.photoUrl} alt={`Photo d'identité de ${fullName}`} className="size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1 px-2 text-center text-xs text-idn-muted">
              <UserRoundIcon aria-hidden className="size-6" />
              Aucune photo enregistrée
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold leading-tight text-idn-ink">{fullName}</p>
          <p className="mt-1 text-sm text-idn-ink-2">
            Date de naissance : {formatCivilDate(identity.dateOfBirth)}
            {age !== null ? ` · ${age} ans` : ""}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LoABadge level={holder?.currentLoa ?? identity.loa} />
            <span className="rounded-full bg-idn-surface-2 px-2.5 py-1 font-mono text-xs text-idn-ink-2">{identity.idnId}</span>
            <span className="text-[13px] text-idn-muted">{PROFILE_TYPES[identity.profileType] ?? identity.profileType}</span>
          </div>
          {loaChanged && (
            <p className="mt-2 text-xs text-[#6B5400] dark:text-[#F2C94C]">
              Le QR annonçait le Niveau {identity.loa} ; le niveau actuel du compte est affiché.
            </p>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-4 border-t border-idn-border-soft px-5 py-4 sm:grid-cols-3">
        <Field label="QR émis à" mono>{formatTimeSeconds(identity.issuedAt)}</Field>
        <Field label="Validité du QR" mono>
          jusqu&apos;à {formatTimeSeconds(identity.expiresAt)}
        </Field>
        <Field label="État du compte">
          {holder === undefined
            ? "…"
            : holder === null
              ? "Non vérifiable"
              : holder.accountState === "active"
                ? "Actif"
                : holder.accountState === "deletion_pending"
                  ? "Suppression demandée"
                  : "Supprimé"}
        </Field>
      </dl>
      <div className="flex flex-wrap items-center gap-3 border-t border-idn-border-soft px-5 py-3">
        <p className="mr-auto text-xs text-idn-muted">Le titulaire est notifié de ce contrôle (transparence).</p>
        <Button onClick={onReset}>Nouveau contrôle</Button>
      </div>
    </section>
  )
}

function TodayChecks() {
  const [from] = React.useState(() => startOfDay(Date.now()))
  const checks = useQuery(api.controller.activity.list, { type: "scan", from })
  return (
    <Panel title="Contrôles du jour" description={checks ? `${checks.rows.length} présentation${checks.rows.length > 1 ? "s" : ""} vérifiée${checks.rows.length > 1 ? "s" : ""} aujourd'hui.` : undefined}>
      {checks === undefined ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-8" />
        </div>
      ) : checks.rows.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-idn-muted">Aucun contrôle aujourd&apos;hui.</p>
      ) : (
        <ul>
          {checks.rows.slice(0, 8).map((row) => (
            <li key={row._id} className="flex min-h-11 items-center gap-3 border-b border-idn-border-soft px-5 py-2 last:border-b-0">
              <span className="w-12 shrink-0 font-mono text-[13px] tabular-nums text-idn-muted">{formatTime(row.at)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-idn-ink">{row.subject || "Titulaire"}</span>
              <span className="hidden truncate text-xs text-idn-muted sm:inline">{row.location ?? row.subjectId}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
