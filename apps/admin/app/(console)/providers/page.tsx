"use client"

/**
 * Fournisseurs e-mail et SMS : état effectif des intégrations, lu côté
 * serveur (`admin.integrations.getStatus`). Aucune valeur secrète n'est
 * transmise au navigateur, seulement la présence des variables.
 *
 * La configuration se fait dans les variables d'environnement du déploiement
 * Convex : la page le dit, elle ne propose pas de bascule qui n'aurait aucun
 * effet sur les envois.
 */
import { useQuery } from "convex/react"
import { Check, X } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"

import { PageBody, PageHeader } from "../../_components/page-header"
import { Field, Panel } from "../../_components/panel"
import { PanelSkeleton } from "../../_components/skeleton"
import { StatusPill } from "../../_components/status-pill"
import { fmtDateTime, fmtNumber, relativeTime } from "../../_lib/format"

type EnvEntry = { name: string; present: boolean; required: boolean; purpose: string }
type Delivery = { at: number; detail?: string } | null

function EnvTable({ env }: { env: EnvEntry[] }) {
  return (
    <table className="w-full border-collapse text-left text-[13px]">
      <caption className="sr-only">Variables d&apos;environnement</caption>
      <thead>
        <tr className="border-b border-idn-border">
          <th scope="col" className="h-9 pr-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-muted">Variable</th>
          <th scope="col" className="h-9 pr-3 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-muted">Rôle</th>
          <th scope="col" className="h-9 text-right font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-muted">État</th>
        </tr>
      </thead>
      <tbody>
        {env.map((e) => (
          <tr key={e.name} className="border-b border-idn-border-soft last:border-0">
            <td className="py-2.5 pr-3 align-top font-mono text-xs text-idn-ink">
              {e.name}
              {!e.required ? <span className="block font-sans text-[11px] text-idn-muted">Facultative</span> : null}
            </td>
            <td className="py-2.5 pr-3 align-top text-idn-ink-2">{e.purpose}</td>
            <td className="py-2.5 text-right align-top">
              {e.present ? (
                <span className="inline-flex items-center gap-1 text-idn-green-dark dark:text-idn-green-on-dark">
                  <Check aria-hidden className="size-3.5" /> Définie
                </span>
              ) : (
                <span className={e.required ? "inline-flex items-center gap-1 text-[#B3261E] dark:text-[#F2A49E]" : "inline-flex items-center gap-1 text-idn-muted"}>
                  <X aria-hidden className="size-3.5" /> Absente
                </span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function DeliveryValue({ value, empty }: { value: Delivery; empty: string }) {
  if (!value) return <span className="text-idn-muted">{empty}</span>
  return (
    <span>
      {relativeTime(value.at)}
      <span className="block text-xs text-idn-muted">
        {fmtDateTime(value.at)}
        {value.detail ? ` · ${value.detail}` : ""}
      </span>
    </span>
  )
}

export default function ProvidersPage() {
  const status = useQuery(api.admin.integrations.getStatus, {})

  return (
    <>
      <PageHeader
        kicker="Configuration"
        title="Fournisseurs e-mail et SMS"
        description="État réel des intégrations d'envoi, lu sur le déploiement. Les valeurs secrètes ne sont jamais affichées."
      />
      <PageBody>
        {status === undefined ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelSkeleton className="h-72" />
            <PanelSkeleton className="h-72" />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel
              id="email"
              title="E-mail"
              description={status.email.provider}
              actions={
                <StatusPill tone={status.email.configured ? "green" : "red"}>
                  {status.email.configured ? "Configuré" : "Configuration incomplète"}
                </StatusPill>
              }
              bodyClassName="space-y-5"
            >
              <dl>
                <Field label="Passerelle" mono>{status.email.bridgeHost}</Field>
                <Field label="Adresse d'expédition">
                  <span className="font-mono text-xs">{status.email.fromAddress}</span>
                  {status.email.fromIsDefault ? (
                    <span className="block text-xs text-idn-muted">Valeur par défaut</span>
                  ) : null}
                </Field>
                <Field label="Dernier envoi réussi">
                  <DeliveryValue value={status.email.lastSuccess} empty="Aucun envoi tracé" />
                </Field>
                <Field label="Dernier échec">
                  <DeliveryValue value={status.email.lastFailure} empty="Aucun échec tracé" />
                </Field>
              </dl>
              <EnvTable env={status.email.env} />
              <p className="text-xs text-idn-muted">
                Envois concernés : codes de vérification, décisions KYC, messages
                iBoîte sortants. Seuls les messages iBoîte gardent une trace
                d&apos;envoi en base ; les e-mails transactionnels n&apos;en
                laissent pas.
              </p>
            </Panel>

            <Panel
              id="sms"
              title="SMS"
              description={status.sms.provider}
              actions={
                <StatusPill tone={status.sms.configured ? "green" : "red"}>
                  {status.sms.configured ? "Configuré" : "Configuration incomplète"}
                </StatusPill>
              }
              bodyClassName="space-y-5"
            >
              <dl>
                <Field label="Région Bird" mono>{status.sms.region}</Field>
                <Field label="Dernier envoi accepté">
                  <DeliveryValue value={status.sms.lastSuccess} empty="Aucun envoi tracé" />
                </Field>
                <Field label="Codes envoyés · 7 jours">
                  <span className="font-mono">{fmtNumber(status.sms.sentLast7Days)}</span>
                </Field>
              </dl>
              <EnvTable env={status.sms.env} />
              <p className="text-xs text-idn-muted">
                Envois concernés : récupération du PIN et changement de numéro.
                Les envois refusés par Bird ne sont pas tracés en base.
              </p>
            </Panel>
          </div>
        )}
        <p className="mt-4 text-[13px] text-idn-muted">
          Pour modifier une intégration, mettez à jour la variable dans les
          paramètres du déploiement Convex, puis rechargez cette page.
        </p>
      </PageBody>
    </>
  )
}
