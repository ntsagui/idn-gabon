"use client"

import { useState } from "react"

import { Button } from "@repo/ui/components/button"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { authClient } from "@/lib/auth-client"
import {
  appReturnUrl,
  consentFailureMessage,
  denyFallbackUrl,
  signInAgainUrl,
  submitConsentDecision,
  type ConsentFailure,
} from "@/lib/consent-flow"

interface ConsentFormProps {
  app: {
    clientId: string
    name: string
    icon: string | null
    requiredLoA: 1 | 2 | 3
    env: "sandbox" | "production"
    /** URI de retour enregistrées : seule origine vers laquelle on renvoie. */
    redirectUris?: string[]
  }
  user: {
    fullName: string
    email: string
    loa: 1 | 2 | 3
  }
  requestedScopes: string[]
  acrValues: string
  oauthParams: Record<string, string>
}

const CheckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M5 12l5 5 9-11" />
  </svg>
)

const userInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("") || "?"

const claimsForScopes = (
  scopes: string[],
  user: ConsentFormProps["user"],
  requiredLoA: 1 | 2 | 3,
): { label: string; sub: string }[] => {
  const rows: { label: string; sub: string }[] = []
  const has = (s: string) => scopes.includes(s)

  if (has("profile") || has("openid")) {
    rows.push({
      label: "Identité pivot",
      sub: "nom, prénom, date de naissance, lieu de naissance",
    })
  }
  if (has("email")) {
    rows.push({
      label: "Email vérifié",
      sub: user.email,
    })
  }
  if (requiredLoA > 1 || scopes.some((s) => s.startsWith("loa:"))) {
    const exigence = requiredLoA > 1 ? ` (l'app exige ≥ ${requiredLoA})` : ""
    rows.push({
      label: "Niveau de garantie",
      sub: `Niveau ${user.loa}${exigence}`,
    })
  }
  if (has("idn:civil_status")) {
    rows.push({
      label: "État civil",
      sub: "situation matrimoniale, nationalité",
    })
  }
  if (has("idn:iboite.read")) {
    rows.push({
      label: "Consulter votre iBoîte",
      sub: "courriers, colis, messages et pièces jointes",
    })
  }
  if (has("idn:iboite.manage")) {
    rows.push({
      label: "Organiser votre iBoîte",
      sub: "marquer comme lu, classer et gérer les messages",
    })
  }
  if (has("idn:iboite.send")) {
    rows.push({
      label: "Envoyer depuis votre iBoîte",
      sub: "répondre et envoyer des messages en votre nom",
    })
  }
  if (has("idn:nip")) {
    rows.push({
      label: "NIP",
      sub: "Numéro d'Identification Personnel (RBPP)",
    })
  }
  return rows
}

export function ConsentForm({
  app,
  user,
  requestedScopes,
  acrValues,
  oauthParams,
}: ConsentFormProps) {
  const [submitting, setSubmitting] = useState<"deny" | "allow" | null>(null)
  const [failure, setFailure] = useState<ConsentFailure | null>(null)
  const claims = claimsForScopes(requestedScopes, user, app.requiredLoA)
  void acrValues

  const submitDecision = async (decision: "allow" | "deny") => {
    setSubmitting(decision)
    setFailure(null)
    // Le POST passe par le client Better Auth : c'est lui qui porte la session
    // du portail (en-tête `Better-Auth-Cookie`, plugin crossDomain), comme la
    // reprise de /oauth2/authorize. Un fetch brut partait sans session et le
    // fournisseur répondait 401 sans que l'écran le dise (14/09/2026). Le
    // `consent_code` vient de la query posée par /oauth2/authorize.
    const outcome = await submitConsentDecision(
      {
        accept: decision === "allow",
        consentCode: oauthParams.consent_code ?? null,
      },
      authClient,
    )
    if (outcome.kind === "redirect") {
      window.location.assign(outcome.url)
      return
    }
    if (decision === "deny") {
      // Le fournisseur n'a plus la demande : on rend quand même la main à
      // l'application quand son URI de retour est connue (entrée directe).
      const back = denyFallbackUrl(oauthParams)
      if (back) {
        window.location.assign(back)
        return
      }
    }
    setFailure(outcome.reason)
    setSubmitting(null)
  }

  const returnUrl = appReturnUrl(app.redirectUris ?? [])

  return (
    <main className="flex min-h-svh items-center justify-center bg-idn-bg p-10">
      <div className="w-[480px] rounded-2xl border border-idn-border bg-idn-surface p-9">
        <div className="mb-7 flex items-center gap-2">
          <IdnMark size={26} />
          <div className="text-[13px] font-semibold text-idn-ink">
            Identité Numérique
          </div>
          <div className="flex-1" />
          <IdnFlagBars width={24} height={2} />
        </div>

        <div className="mb-6 flex items-center justify-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0E7C3A] to-[#0A5C2C] text-lg font-semibold text-white">
            {userInitials(user.fullName)}
          </div>
          <div className="flex items-center gap-1 text-idn-muted">
            <span className="block h-1.5 w-1.5 rounded-full bg-current" />
            <span className="block h-1.5 w-1.5 rounded-full bg-current" />
            <span className="block h-1.5 w-1.5 rounded-full bg-current" />
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-idn-border bg-idn-surface-2 text-[22px] font-semibold text-idn-ink">
            {app.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={app.icon}
                alt=""
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              app.name.trim().charAt(0).toUpperCase()
            )}
          </div>
        </div>

        <h1 className="text-center text-[20px] font-semibold leading-[1.35] text-idn-ink">
          Connexion à <span className="text-idn-green">{app.name}</span>
        </h1>
        <p className="mt-2 text-center text-[13px] text-idn-muted">
          connecté en tant qu&apos;{" "}
          <b className="font-medium text-idn-ink">{user.fullName}</b>
        </p>

        {app.env === "sandbox" ? (
          <div
            className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-center text-[12px] text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            <span className="mr-1 inline-block rounded bg-amber-300/80 px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-950">
              Sandbox
            </span>
            Mode test — les données partagées porteront l&apos;attribut{" "}
            <code className="font-mono">env: sandbox</code>.
          </div>
        ) : null}

        <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-idn-muted">
          VOUS PARTAGEREZ
        </div>
        <ul className="mt-2 overflow-hidden rounded-[10px] border border-idn-border">
          {claims.map((c, i) => (
            <li
              key={c.label}
              className={`flex items-center gap-2.5 bg-idn-surface px-3.5 py-3 ${
                i < claims.length - 1 ? "border-b border-idn-border-soft" : ""
              }`}
            >
              <span className="flex text-idn-green">
                <CheckIcon />
              </span>
              <div className="flex-1">
                <div className="text-[13px] font-medium text-idn-ink">
                  {c.label}
                </div>
                <div className="mt-px text-xs text-idn-muted">{c.sub}</div>
              </div>
            </li>
          ))}
        </ul>

        {failure ? (
          <div
            role="alert"
            className="mt-5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"
          >
            <p>{consentFailureMessage(failure)}</p>
            {failure === "session_missing" ? (
              <a
                href={signInAgainUrl(oauthParams)}
                className="mt-2 inline-block font-medium underline underline-offset-2"
              >
                Se reconnecter
              </a>
            ) : failure === "request_expired" && returnUrl ? (
              <a
                href={returnUrl}
                className="mt-2 inline-block font-medium underline underline-offset-2"
              >
                Retour à l&apos;application
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={submitting !== null}
            onClick={() => submitDecision("deny")}
          >
            {submitting === "deny" ? "…" : "Refuser"}
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={submitting !== null}
            onClick={() => submitDecision("allow")}
          >
            {submitting === "allow" ? "…" : "Autoriser"}
          </Button>
        </div>

        <p className="mt-3.5 text-center text-[11px] text-idn-muted">
          Révocable à tout moment dans{" "}
          <a
            href="https://identite.ga/consents"
            className="underline underline-offset-2 hover:text-idn-ink"
          >
            Mes consentements
          </a>
          .
        </p>
      </div>
    </main>
  )
}
