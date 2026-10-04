"use client"

import { useMutation } from "convex/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"

import { CreateKeyDialog, KeysTable } from "../../../../_components/api-keys"
import { ConfirmDialog } from "../../../../_components/confirm-dialog"
import { CopyField } from "../../../../_components/copy"
import { useApiKeys } from "../../../../_components/data"
import { errorMessage } from "../../../../_components/format"
import { Icon } from "../../../../_components/icons"
import { SecretDialog, type RevealedSecret } from "../../../../_components/secret-dialog"
import { LoadingBlock, Notice, PageBody, Panel } from "../../../../_components/ui"
import { useAppWorkspace } from "../_components/app-context"

const ISSUER = (process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "https://site.identite.ga").replace(/\/$/, "")
const DISCOVERY_URL = `${ISSUER}/api/auth/convex/.well-known/openid-configuration`

type Discovery = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
}

/** Points de terminaison lus dans le document de découverte réel. */
function useDiscovery(): Discovery | null | "error" {
  const [doc, setDoc] = useState<Discovery | null | "error">(null)
  useEffect(() => {
    let cancelled = false
    fetch(DISCOVERY_URL)
      .then((r) => (r.ok ? (r.json() as Promise<Discovery>) : Promise.reject(new Error(String(r.status)))))
      .then((value) => !cancelled && setDoc(value))
      .catch(() => !cancelled && setDoc("error"))
    return () => {
      cancelled = true
    }
  }, [])
  return doc
}

export default function ApplicationKeysPage() {
  const { app, group } = useAppWorkspace()
  const keys = useApiKeys(app.clientId)
  const rotateSecret = useMutation(api.developer.apps.rotateSecret)
  const [rotating, setRotating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [secret, setSecret] = useState<RevealedSecret | null>(null)
  const envLabel = app.env === "production" ? "Production" : "Sandbox"
  const discovery = useDiscovery()

  return (
    <PageBody>
      <div className="space-y-5">
        {app.disabled ? (
          <Notice tone="info" title="Environnement inactif">
            Ce client_id de production est inactif jusqu&apos;à la validation par l&apos;administration.
          </Notice>
        ) : null}
        <Panel
          title={`Identifiants OAuth · ${envLabel}`}
          description="À configurer côté serveur. Le secret ne doit jamais apparaître dans du code exécuté par le navigateur."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <CopyField id="cid" label="client_id" value={app.clientId} />
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-idn-ink">client_secret</p>
              <div className="flex items-center gap-2">
                <span className="block flex-1 rounded-[10px] border border-idn-border bg-idn-surface-2 px-3 py-2 font-mono text-[13px] tracking-widest text-idn-muted">
                  ••••••••••••••••
                </span>
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => setRotating(true)}>
                  <Icon name="refresh" size={15} /> Nouveau secret
                </Button>
              </div>
              <p className="text-xs text-idn-muted">Seule une empreinte est conservée : le secret n&apos;est pas réaffichable.</p>
            </div>
          </div>
        </Panel>

        <Panel title="Points de terminaison OpenID Connect" description="Découverte automatique recommandée : les SDK lisent le document de configuration.">
          <div className="grid gap-4 md:grid-cols-2">
            <CopyField id="discovery" label="Document de découverte" value={DISCOVERY_URL} />
            {discovery === null ? (
              <LoadingBlock rows={1} label="Lecture du document de découverte…" />
            ) : discovery === "error" ? (
              <p className="text-[13px] text-idn-muted">
                Document de découverte injoignable pour l&apos;instant : les autres points de terminaison y sont listés.
              </p>
            ) : (
              <>
                <CopyField id="issuer" label="Issuer (claim iss)" value={discovery.issuer} />
                <CopyField id="authorize" label="Autorisation" value={discovery.authorization_endpoint} />
                <CopyField id="token" label="Jetons" value={discovery.token_endpoint} />
                <CopyField id="userinfo" label="UserInfo" value={discovery.userinfo_endpoint} />
                <CopyField id="jwks" label="Clés publiques (JWKS)" value={discovery.jwks_uri} />
              </>
            )}
          </div>
        </Panel>

        <Panel
          title="Clés API de l'application"
          description={`Clés serveur à serveur rattachées à ${group.name} (${envLabel}).`}
          actions={
            <Button type="button" size="sm" disabled={app.disabled} onClick={() => setCreating(true)}>
              <Icon name="plus" size={15} /> Nouvelle clé
            </Button>
          }
        >
          {keys === undefined ? <LoadingBlock rows={2} /> : <KeysTable keys={keys} showApplication={false} />}
        </Panel>
      </div>

      <ConfirmDialog
        open={rotating}
        onOpenChange={setRotating}
        title="Générer un nouveau secret ?"
        description={`L'ancien secret ${envLabel.toLowerCase()} cesse de fonctionner immédiatement : tant que vos serveurs n'utilisent pas le nouveau, les échanges de code échoueront (invalid_client).`}
        confirmLabel="Remplacer le secret"
        onConfirm={async () => {
          try {
            const result = await rotateSecret({ clientId: app.clientId })
            setSecret({
              title: "Nouveau client_secret",
              description: `Application ${group.name} · ${envLabel}. L'ancien secret est révoqué.`,
              label: "client_secret",
              value: result.clientSecret,
              extra: [{ label: "client_id", value: app.clientId }],
            })
            toast.success("Secret remplacé.")
          } catch (error) {
            toast.error(errorMessage(error, "Remplacement impossible."))
            return true
          }
        }}
      />
      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
      <CreateKeyDialog
        open={creating}
        onOpenChange={setCreating}
        fixedClientId={app.clientId}
        applications={[{ clientId: app.clientId, label: group.name, disabled: app.disabled }]}
      />
    </PageBody>
  )
}
