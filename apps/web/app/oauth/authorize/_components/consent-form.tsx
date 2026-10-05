"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { IdnMark } from "@repo/ui/components/idn-mark"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Card, ErrorNote, Note, Overline, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { scopeLabel } from "@/lib/citizen/consent-scopes"
import {
  appReturnUrl,
  consentFailureMessage,
  denyFallbackUrl,
  signInAgainUrl,
  submitConsentDecision,
  type ConsentFailure,
} from "@/lib/consent-flow"
import { authClient } from "@/lib/auth-client"
import { buildKycPath } from "@/lib/kyc-flow"

type Phase = "ask" | "sending" | "granted" | "denied"

interface ConsentFormProps {
  app: {
    clientId: string
    name: string
    icon: string | null
    requiredLoA: 1 | 2 | 3
    env: "sandbox" | "production"
    redirectUris: string[]
    userAllowed: boolean
  }
  email: string
  userLoa: 1 | 2 | 3
  requiredLoa: 1 | 2 | 3
  /** Niveau insuffisant et aucune vérification en cours : proposer de vérifier son identité. */
  tooLow: boolean
  continueUrl: string
  requestedScopes: string[]
  oauthParams: Record<string, string>
}

/**
 * Consentement « Se connecter avec IDN » (apps/mobile/src/app/consent.tsx).
 * La décision part vers `/oauth2/consent` par le client Better Auth (contrat
 * `{ accept, consent_code }`), qui renvoie l'URL de retour de l'application.
 */
export function ConsentForm({ app, email, userLoa, requiredLoa, tooLow, continueUrl, requestedScopes, oauthParams }: ConsentFormProps) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<Phase>("ask")
  const [failure, setFailure] = React.useState<ConsentFailure | null>(null)

  const host = (() => {
    try {
      return app.redirectUris[0] ? new URL(app.redirectUris[0]).host : null
    } catch {
      return null
    }
  })()
  const returnUrl = appReturnUrl(app.redirectUris)

  async function decide(accept: boolean) {
    setPhase("sending")
    setFailure(null)
    const outcome = await submitConsentDecision({ accept, consentCode: oauthParams.consent_code ?? null }, authClient)
    let target = outcome.kind === "redirect" ? outcome.url : null
    // Refus alors que le fournisseur n'a plus la demande : on rend quand même la
    // main à l'application, mais seulement vers une adresse qu'elle a déclarée
    // (sinon `redirect_uri=https://evil…` ferait du refus une redirection ouverte).
    const declared = !!oauthParams.redirect_uri && app.redirectUris.includes(oauthParams.redirect_uri)
    if (!target && !accept && declared) target = denyFallbackUrl(oauthParams)
    if (!target) {
      setPhase("ask")
      setFailure(outcome.kind === "error" ? outcome.reason : "provider_error")
      return
    }
    setPhase(accept ? "granted" : "denied")
    const url = target
    window.setTimeout(() => window.location.assign(url), 1200)
  }

  if (phase !== "ask") {
    return (
      <Screen header={<AppBar title="Autorisation" />}>
        <div className="flex flex-1 flex-col items-center justify-center pt-16 text-center" aria-live="polite">
          {phase === "sending" ? (
            <IdnLottie name="loader" size={100} loop label="Envoi de ta décision" />
          ) : phase === "granted" ? (
            <IdnLottie name="success" size={128} label="Accès autorisé" />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-full bg-c-red-badge text-c-red-text">
              <Icon name="close" size={36} strokeWidth={2.5} />
            </span>
          )}
          <h2 className="mt-4 text-xl font-semibold text-idn-ink">
            {phase === "sending" ? "Transmission…" : phase === "granted" ? "Accès autorisé" : "Accès refusé"}
          </h2>
          {phase !== "sending" ? <p className="mt-1.5 text-sm text-idn-muted">{`Retour vers ${app.name}…`}</p> : null}
        </div>
      </Screen>
    )
  }

  return (
    <Screen
      header={<AppBar title="Autorisation" back="/dashboard" backIcon="close" />}
      footer={
        tooLow ? (
          <>
            <IdnButton
              full
              onClick={() =>
                router.push(buildKycPath({ returnTo: `${window.location.origin}${continueUrl}`, targetLoa: requiredLoa === 3 ? 3 : 2 }))
              }
            >
              Vérifier mon identité
            </IdnButton>
            <IdnButton variant="ghost" full onClick={() => void decide(false)}>
              Refuser
            </IdnButton>
          </>
        ) : (
          <>
            <IdnButton full onClick={() => void decide(true)} disabled={!app.userAllowed}>
              Autoriser
            </IdnButton>
            <IdnButton variant="ghost" full onClick={() => void decide(false)}>
              Refuser
            </IdnButton>
          </>
        )
      }
    >
      <div className="mt-6 flex items-center justify-center gap-2.5" aria-hidden>
        <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-idn-blue text-[17px] font-semibold text-white">
          {app.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={app.icon} alt="" className="size-full object-cover" />
          ) : (
            app.name.slice(0, 2).toUpperCase()
          )}
        </span>
        <span className="w-9 border-t-2 border-dashed border-idn-border" />
        <IdnMark size={48} />
      </div>
      <h2 className="mt-4 text-center text-xl font-semibold leading-[26px] text-idn-ink">
        {app.name} demande l’accès à ton identité IDN
      </h2>
      <p className={`mt-1.5 flex items-center justify-center gap-1.5 text-[13px] ${app.env === "production" ? "text-c-green-text" : "text-idn-muted"}`}>
        <Icon name="shield" size={14} />
        {[host, app.env === "production" ? "Partenaire vérifié par l’État" : "Application en test"].filter(Boolean).join(" · ")}
      </p>

      {!app.userAllowed ? <ErrorNote>Cette application de test n’est pas ouverte à ton compte.</ErrorNote> : null}
      {tooLow ? <ErrorNote>{`Cette application exige le Niveau ${requiredLoa}. Ton compte est au Niveau ${userLoa}.`}</ErrorNote> : null}

      <Overline className="mb-2.5 mt-6">Données demandées</Overline>
      <Card>
        {requestedScopes.map((s) => {
          const meta = scopeLabel(s, email)
          return <Row key={s} icon={meta.icon as IconName} tone="green" title={meta.title} sub={meta.sub} />
        })}
      </Card>
      <Note>{`Connecté en tant que ${email || "…"}. Tu pourras révoquer cet accès dans Profil, rubrique Applications autorisées.`}</Note>

      {failure ? (
        <div role="alert" className="mt-3.5 rounded-[10px] bg-c-red-badge p-3 text-[13px] leading-[19px] text-c-red-text">
          <p>{consentFailureMessage(failure)}</p>
          {failure === "session_missing" ? (
            <a href={signInAgainUrl(oauthParams)} className="mt-1.5 inline-block font-semibold underline underline-offset-2">
              Me reconnecter
            </a>
          ) : failure === "request_expired" && returnUrl ? (
            <a href={returnUrl} className="mt-1.5 inline-block font-semibold underline underline-offset-2">
              Retour à l’application
            </a>
          ) : null}
        </div>
      ) : null}
    </Screen>
  )
}
