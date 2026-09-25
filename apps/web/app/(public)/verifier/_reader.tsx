"use client"

/**
 * Lecteur PUBLIC d'un acte officiel de l'administration gabonaise, sans
 * session : lit la fiche d'authenticité sur la route publique
 * d'administration.ga, puis montre le PDF A4 tel qu'il a été émis, pour que
 * le lecteur le compare au document qu'il a en main. Règles dans
 * `lib/official-act-verification.ts`.
 */
import * as React from "react"
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  ExternalLink,
  FileWarning,
  Hourglass,
  type LucideIcon,
  RotateCw,
  ShieldOff,
  ShieldQuestion,
} from "lucide-react"

import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import {
  type FoundVerifyResult,
  formatActDate,
  isFoundVerifyResult,
  parseVerifyResponse,
  type VerifyEndpoints,
  verifyEndpoints,
  type VerifyResult,
  verifyResultTitle,
} from "../../../lib/official-act-verification"
import { verifier as content } from "../_content/fr"

type Tone = "success" | "warning" | "destructive" | "muted"

/** Mêmes couples clair/sombre que les autres écrans d'identite.ga. */
const TONE_BOX: Record<Tone, string> = {
  success: "border-idn-green/40 bg-idn-green-soft dark:bg-[#0F2A18]",
  warning: "border-idn-yellow/40 bg-idn-yellow-soft dark:border-[#3A3F1F] dark:bg-[#1F2316]",
  destructive: "border-destructive/30 bg-destructive/10",
  muted: "border-border bg-muted",
}

const TONE_TITLE: Record<Tone, string> = {
  success: "text-idn-green-dark dark:text-idn-green-on-dark",
  warning: "text-[#8a6a0a] dark:text-[#E4C254]",
  destructive: "text-destructive",
  muted: "text-foreground",
}

function toneFor(result: VerifyResult): Tone {
  switch (result.kind) {
    case "valid":
      return "success"
    case "revoked":
      return "destructive"
    case "superseded":
    case "rate_limited":
    case "unavailable":
    case "error":
      return "warning"
    case "unknown":
      return "muted"
  }
}

function iconFor(result: VerifyResult): LucideIcon {
  switch (result.kind) {
    case "valid":
      return BadgeCheck
    case "revoked":
      return ShieldOff
    case "superseded":
      return FileWarning
    case "unknown":
      return ShieldQuestion
    case "unavailable":
      return Hourglass
    case "rate_limited":
      return Clock3
    case "error":
      return AlertTriangle
  }
}

function Notice({
  result,
  live = true,
  children,
}: {
  result: VerifyResult
  /** Vrai pour un avis court. Une fiche complète s'annonce par une ligne à
   *  part, jamais en entier. */
  live?: boolean
  children?: React.ReactNode
}) {
  const tone = toneFor(result)
  const Icon = iconFor(result)
  return (
    <div
      role={live ? "status" : undefined}
      className={cn("rounded-[14px] border p-4 text-sm text-foreground md:p-5", TONE_BOX[tone])}
    >
      <h2 className={cn("flex items-center gap-2 text-base font-semibold", TONE_TITLE[tone])}>
        <Icon className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{verifyResultTitle(result)}</span>
      </h2>
      {children ? <div className="mt-2 space-y-2">{children}</div> : null}
    </div>
  )
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  )
}

function FoundAct({ endpoints, result }: { endpoints: VerifyEndpoints; result: FoundVerifyResult }) {
  const labels = content.reader.fields
  return (
    <div className="space-y-5">
      <p role="status" className="sr-only">
        {verifyResultTitle(result)}
      </p>
      <Notice result={result} live={false}>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
          <Field label={labels.number}>
            <span className="font-mono tabular-nums" translate="no">
              {result.documentNumber}
            </span>
          </Field>
          <Field label={labels.type}>{result.typeLabel}</Field>
          <Field label={labels.issuer} wide>
            {result.issuerName}
          </Field>
          <Field label={labels.issuedAt}>{formatActDate(result.issuedAt)}</Field>
          <Field label={labels.signature}>
            {result.signed
              ? `${labels.signedPrefix}${result.signedAt ? ` le ${formatActDate(result.signedAt)}` : ""}`
              : labels.notSigned}
          </Field>
          <Field label={labels.fingerprint} wide>
            <span className="break-all font-mono text-xs" translate="no">
              {result.contentSha256Prefix}…
            </span>
          </Field>
          {result.kind === "revoked" && result.revokedReason ? (
            <Field label={labels.revokedReason} wide>
              {result.revokedReason}
            </Field>
          ) : null}
          {result.kind === "superseded" && result.supersededByDocumentNumber ? (
            <Field label={labels.supersededBy} wide>
              <span className="font-mono tabular-nums" translate="no">
                {result.supersededByDocumentNumber}
              </span>
            </Field>
          ) : null}
        </dl>
        <p>{content.reader.compare}</p>
      </Notice>

      <div className="w-full max-w-[900px] space-y-2">
        <div className="aspect-[210/297] w-full overflow-hidden rounded-[14px] border border-border bg-card">
          <iframe
            src={endpoints.pdfUrl}
            title={`${content.reader.frameTitle} ${result.documentNumber}`}
            loading="lazy"
            className="size-full"
          />
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={endpoints.pdfUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink aria-hidden="true" />
            {content.reader.openPdf}
          </a>
        </Button>
      </div>
    </div>
  )
}

export function OfficialActReader({ apiBaseUrl, code }: { apiBaseUrl: string; code: string }) {
  const endpoints = React.useMemo(() => verifyEndpoints(apiBaseUrl, code), [apiBaseUrl, code])
  // `undefined` = vérification en cours ; toute autre valeur est définitive.
  const [result, setResult] = React.useState<VerifyResult | undefined>(undefined)
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!endpoints) return
    let cancelled = false
    setResult(undefined)
    const controller = new AbortController()
    fetch(endpoints.statusUrl, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null)
        if (!cancelled) setResult(parseVerifyResponse(response.status, body))
      })
      .catch(() => {
        if (!cancelled) setResult({ kind: "error" })
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [endpoints, attempt])

  // Code mal formé : aucune requête n'est partie.
  if (!endpoints) {
    return (
      <Notice result={{ kind: "unknown" }}>
        <p>{content.reader.unknownHelp}</p>
      </Notice>
    )
  }

  if (result === undefined) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <span className="sr-only">{content.reader.loading}</span>
        <div className="h-32 w-full animate-pulse rounded-[14px] bg-muted motion-reduce:animate-none" />
        <div className="aspect-[210/297] w-full max-w-[900px] animate-pulse rounded-[14px] bg-muted motion-reduce:animate-none" />
      </div>
    )
  }

  if (isFoundVerifyResult(result)) {
    return <FoundAct endpoints={endpoints} result={result} />
  }

  if (result.kind === "unknown") {
    return (
      <Notice result={result}>
        <p>{content.reader.unknownHelp}</p>
      </Notice>
    )
  }

  if (result.kind === "unavailable") {
    return (
      <Notice result={result}>
        <p>{content.reader.unavailableHelp}</p>
      </Notice>
    )
  }

  if (result.kind === "rate_limited") {
    return <Notice result={result} />
  }

  return (
    <Notice result={result}>
      <p>{content.reader.errorHelp}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
        <RotateCw aria-hidden="true" />
        {content.reader.retry}
      </Button>
    </Notice>
  )
}
