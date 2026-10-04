"use client"

import * as React from "react"
import type { FunctionReturnType } from "convex/server"
import { useAction, useQuery } from "convex/react"
import { AlertTriangleIcon, CheckCircle2Icon, ExternalLinkIcon, FileSearchIcon, ShieldAlertIcon } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { cn } from "@repo/ui/lib/utils"

import { pages } from "../../../_content/fr"
import { PageHeader } from "../../../_components/page-header"
import { EmptyState, Field, Panel, Skeleton } from "../../../_components/panel"
import { QrReader } from "../../../_components/qr-reader"
import { StatusPill } from "../../../_components/status-pill"
import { describeError } from "../../../_lib/errors"
import { formatDateTime, formatTimeSeconds, relativeTime, startOfDay } from "../../../_lib/format"
import { useNow } from "../../../_lib/use-now"

type Verification = FunctionReturnType<typeof api.controller.officialActs.verify>

/** 12 caractères Crockford (sans I, L, O, U), avec ou sans tirets, ou l'URL du QR. */
function looksLikeCode(value: string): boolean {
  const trimmed = value.trim()
  if (/\/verifier\/[^/?#\s]+/i.test(trimmed)) return true
  return /^[0-9A-Za-z]{12}$/.test(trimmed.replace(/[\s-]+/g, ""))
}

const BANNER = {
  valid: { tone: "green", title: "Document authentique", icon: CheckCircle2Icon },
  revoked: { tone: "red", title: "Document révoqué", icon: ShieldAlertIcon },
  superseded: { tone: "yellow", title: "Document remplacé par un acte plus récent", icon: AlertTriangleIcon },
  unknown: { tone: "red", title: "Code inconnu : aucun acte officiel ne porte ce code", icon: ShieldAlertIcon },
  unavailable: { tone: "yellow", title: "Vérification momentanément indisponible", icon: AlertTriangleIcon },
  rate_limited: { tone: "yellow", title: "Trop de vérifications rapprochées", icon: AlertTriangleIcon },
  error: { tone: "yellow", title: "Réponse illisible de l'émetteur", icon: AlertTriangleIcon },
} as const

const TONE = {
  green: "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark",
  red: "bg-[#FBE9E7] text-[#8C1D18] dark:bg-[#3A1E1E] dark:text-[#FF8A80]",
  yellow: "bg-idn-yellow-soft text-[#4D3C00] dark:bg-[#3A2E14] dark:text-[#F2C94C]",
}

export function ActVerifier() {
  const verify = useAction(api.controller.officialActs.verify)
  const [input, setInput] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [result, setResult] = React.useState<Verification | null>(null)
  const [inputError, setInputError] = React.useState<string | null>(null)
  const inFlight = React.useRef(false)
  const resultRef = React.useRef<HTMLDivElement>(null)

  const run = React.useCallback(
    async (raw: string) => {
      if (inFlight.current) return
      if (!looksLikeCode(raw)) {
        setInputError("Saisissez les 12 caractères imprimés sous le QR de l'acte (ex. ABCD-EFGH-JKMN), ou lisez le QR.")
        return
      }
      inFlight.current = true
      setPending(true)
      setInputError(null)
      try {
        setResult(await verify({ input: raw }))
      } catch (error) {
        setResult(null)
        setInputError(describeError(error, "Vérification impossible. Vérifiez la connexion et réessayez."))
      } finally {
        inFlight.current = false
        setPending(false)
        requestAnimationFrame(() => resultRef.current?.focus())
      }
    },
    [verify],
  )

  return (
    <>
      <PageHeader kicker={pages.verify.kicker} title={pages.verify.title} description={pages.verify.description} />
      <div className="grid gap-6 px-5 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4">
          <Panel title="Code de vérification" description="Imprimé sous le QR code de l'acte, en 12 caractères.">
            <form
              className="space-y-2 px-5 py-4"
              noValidate
              onSubmit={(event) => {
                event.preventDefault()
                void run(input)
              }}
            >
              <Label htmlFor="act-code">Code ou adresse du QR</Label>
              <div className="flex gap-2">
                <Input
                  id="act-code"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="ABCD-EFGH-JKMN"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(inputError)}
                  aria-describedby={inputError ? "act-code-error" : "act-code-help"}
                  className="font-mono uppercase"
                />
                <Button type="submit" disabled={pending || !input.trim()}>
                  {pending ? "Vérification…" : "Vérifier"}
                </Button>
              </div>
              {inputError ? (
                <p id="act-code-error" role="alert" className="text-[13px] text-destructive">
                  {inputError}
                </p>
              ) : (
                <p id="act-code-help" className="text-xs text-idn-muted">
                  Les confusions I/1 et O/0 sont corrigées. La réponse vient directement de l&apos;administration émettrice.
                </p>
              )}
            </form>
          </Panel>
          <QrReader
            paused={pending}
            onDetected={(value) => {
              setInput(value)
              void run(value)
            }}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <div ref={resultRef} tabIndex={-1} aria-live="polite" className="focus:outline-none">
            {pending ? (
              <Skeleton className="h-[320px] rounded-xl" />
            ) : result ? (
              <ActResult verification={result} />
            ) : (
              <Panel>
                <EmptyState icon={FileSearchIcon} title="Aucun acte vérifié">
                  Saisissez le code ou lisez le QR d&apos;un acte officiel (lettre, note, arrêté, attestation) : son authenticité,
                  son émetteur et son état s&apos;affichent ici.
                </EmptyState>
              </Panel>
            )}
          </div>
          <RecentVerifications />
        </div>
      </div>
    </>
  )
}

function ActResult({ verification }: { verification: Verification }) {
  const { result } = verification
  const banner = BANNER[result.kind]
  const Icon = banner.icon
  const found = result.kind === "valid" || result.kind === "revoked" || result.kind === "superseded" ? result : null
  return (
    <section aria-label="Résultat de la vérification" className="overflow-hidden rounded-xl border border-idn-border bg-idn-surface">
      <div className={cn("flex items-start gap-3 px-5 py-4", TONE[banner.tone])}>
        <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{banner.title}</p>
          <p className="text-[13px]">
            Code <span className="font-mono">{verification.displayCode}</span> · vérifié à {formatTimeSeconds(verification.checkedAt)}
          </p>
        </div>
      </div>
      {found ? (
        <>
          <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Émetteur" className="sm:col-span-2">
              <span className="text-base font-semibold">{found.issuerName}</span>
            </Field>
            <Field label="Type d'acte">{found.typeLabel}</Field>
            <Field label="Numéro" mono>{found.documentNumber}</Field>
            <Field label="Émis le">{formatDateTime(found.issuedAt)}</Field>
            <Field label="Signature">
              {found.signed ? `Signé${found.signedAt ? ` le ${formatDateTime(found.signedAt)}` : ""}` : "Non signé électroniquement"}
            </Field>
            <Field label="Empreinte du contenu" mono>{found.contentSha256Prefix}…</Field>
            {result.kind === "revoked" && (
              <Field label="Révocation">
                {result.revokedAt ? formatDateTime(result.revokedAt) : "Date non communiquée"}
                {result.revokedReason ? ` · ${result.revokedReason}` : ""}
              </Field>
            )}
            {result.kind === "superseded" && result.supersededByDocumentNumber && (
              <Field label="Remplacé par" mono>{result.supersededByDocumentNumber}</Field>
            )}
          </dl>
          <div className="flex flex-wrap items-center gap-3 border-t border-idn-border-soft px-5 py-3">
            <p className="mr-auto text-xs text-idn-muted">
              Comparez le document présenté avec le PDF authentique, page par page.
            </p>
            {verification.pdfUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={verification.pdfUrl} target="_blank" rel="noopener noreferrer">
                  Ouvrir le PDF authentique
                  <ExternalLinkIcon aria-hidden />
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="px-5 py-4 text-sm text-idn-ink-2">
          {result.kind === "unknown"
            ? "Vérifiez la saisie. Si le code est correct, le document n'a pas été émis par une administration raccordée : ne l'acceptez pas comme acte officiel."
            : result.kind === "rate_limited"
              ? `Réessayez dans ${Math.ceil(result.retryAfterMs / 1000)} secondes.`
              : "Le service de vérification de l'administration ne répond pas. Réessayez dans quelques instants ; rien n'a été inscrit à votre historique."}
        </p>
      )}
    </section>
  )
}

function RecentVerifications() {
  const [from] = React.useState(() => startOfDay(Date.now()) - 6 * 24 * 60 * 60 * 1000)
  const recent = useQuery(api.controller.activity.list, { type: "signature", from })
  const now = useNow()
  return (
    <Panel title="Vos vérifications des 7 derniers jours">
      {recent === undefined ? (
        <div className="p-4">
          <Skeleton className="h-8" />
        </div>
      ) : recent.rows.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-idn-muted">Aucune vérification d&apos;acte sur la période.</p>
      ) : (
        <ul>
          {recent.rows.slice(0, 8).map((row) => (
            <li key={row._id} className="flex min-h-11 flex-wrap items-center gap-3 border-b border-idn-border-soft px-5 py-2 last:border-b-0">
              <span className="font-mono text-[13px] text-idn-ink">{row.reference}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-idn-muted">{row.subjectId ?? row.subject}</span>
              <StatusPill tone={row.outcome === "approved" ? "green" : "red"}>{row.label}</StatusPill>
              <span className="w-[86px] text-right text-xs text-idn-muted">{relativeTime(row.at, now)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
