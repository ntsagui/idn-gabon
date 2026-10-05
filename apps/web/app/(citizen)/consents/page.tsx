"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import type { IconName } from "@/app/_components/idn/icons"
import { Card, Note, Row } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { scopeLabel } from "@/lib/citizen/consent-scopes"

import { useNotice } from "../_components/account/notice"

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" })

/** Applications autorisées : transposition de apps/mobile/src/app/consents.tsx. */
export default function ConsentsPage() {
  const list = useQuery(api.oauthConsents.listMine)
  const user = useQuery(api.profile.getCurrentUser)
  const revoke = useMutation(api.oauthConsents.revokeForClient)
  const [target, setTarget] = React.useState<{ clientId: string; appName: string } | null>(null)
  const { notice, show } = useNotice()

  return (
    <Screen header={<AppBar title="Applications autorisées" back="/profile" />}>
      {list === undefined ? (
        <div className="flex justify-center py-12">
          <IdnLottie name="loader" size={72} loop label="Chargement des applications" />
        </div>
      ) : list.length === 0 ? (
        <div className="mt-6 flex flex-col items-center text-center">
          <IdnLottie name="partage" size={120} label="Illustration : partage" />
          <h2 className="mt-2 text-[17px] font-semibold text-idn-ink">Aucune application autorisée</h2>
          <p className="mt-1 text-sm leading-5 text-idn-muted">
            Quand tu te connectes à un service avec ton compte IDN, il apparaît ici avec les informations que tu lui partages.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm leading-5 text-idn-muted">
            {list.length} application{list.length > 1 ? "s ont" : " a"} accès à une partie de tes informations. Tu peux retirer cet accès à tout moment.
          </p>
          {list.map((consent) => (
            <section key={consent.id} className="mt-4" aria-label={consent.appName}>
              <Card>
                <Row icon="building" tone="blue" title={consent.appName} sub={`Autorisée depuis le ${DATE.format(consent.grantedAt)}`} />
                {consent.scopes.map((scope) => {
                  const meta = scopeLabel(scope, user?.email)
                  return <Row key={scope} icon={meta.icon as IconName} title={meta.title} sub={meta.sub} />
                })}
              </Card>
              <IdnButton
                variant="dangerGhost"
                full
                className="mt-2"
                aria-label={`Retirer l’accès à ${consent.appName}`}
                onClick={() => setTarget({ clientId: consent.clientId, appName: consent.appName })}
              >
                Retirer l’accès
              </IdnButton>
            </section>
          ))}
          <Note center>Retirer l’accès n’efface pas les données que l’application a déjà reçues : adresse-toi à elle pour cela.</Note>
        </>
      )}
      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={target ? `Retirer l’accès à ${target.appName} ?` : ""}
        description="L’application ne pourra plus accéder à tes informations. Elle te redemandera ton autorisation à ta prochaine connexion."
        confirmLabel="Retirer"
        destructive
        onConfirm={async () => {
          if (!target) return
          await revoke({ clientId: target.clientId })
          show("Accès retiré", "L’autorisation et les jetons actifs de cette application ont été révoqués.")
        }}
      />
      {notice}
    </Screen>
  )
}
