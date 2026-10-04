"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@repo/ui/components/button"

import { CreateKeyDialog, KeysTable } from "../../_components/api-keys"
import { useApiKeys, useApplications } from "../../_components/data"
import { Icon } from "../../_components/icons"
import { EmptyState, LoadingBlock, Notice, PageBody, PageHeader, StatTile } from "../../_components/ui"

export default function ApiKeysPage() {
  const keys = useApiKeys()
  const { groups } = useApplications()
  const [creating, setCreating] = useState(false)

  const applications = (groups ?? []).flatMap((group) =>
    [group.sandbox, group.production]
      .filter((app): app is NonNullable<typeof app> => Boolean(app))
      .map((app) => ({
        clientId: app.clientId,
        label: `${group.name} · ${app.env === "production" ? "Production" : "Sandbox"}`,
        disabled: app.disabled,
      })),
  )
  const active = keys?.filter((k) => k.status === "active") ?? []
  const unlinked = active.filter((k) => !k.appClientId)
  const neverUsed = active.filter((k) => !k.lastUsedAt)

  return (
    <>
      <PageHeader
        kicker="Intégration"
        title="Clés API"
        description="Clés serveur à serveur (M2M) de toutes vos applications. Les identifiants OAuth (client_id et secret) se gèrent dans chaque application."
        actions={
          groups && groups.length > 0 ? (
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" size={16} /> Nouvelle clé
            </Button>
          ) : null
        }
      />
      <PageBody>
        {keys === undefined || groups === undefined ? (
          <LoadingBlock rows={4} label="Chargement des clés…" />
        ) : groups.length === 0 && keys.length === 0 ? (
          <EmptyState
            icon="key"
            title="Créez d'abord une application"
            description="Une clé API est toujours rattachée à une application. Enregistrez votre application, puis créez ses clés depuis cette page ou depuis sa fiche."
            action={
              <Button asChild>
                <Link href="/applications/new">
                  <Icon name="plus" size={16} /> Créer une application
                </Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile label="Clés actives" value={active.length} context="sur 25 autorisées" />
              <StatTile
                label="Jamais utilisées"
                value={neverUsed.length}
                context={neverUsed.length > 0 ? "à révoquer si elles ne servent plus" : "toutes ont déjà servi"}
              />
              <StatTile label="Non rattachées" value={unlinked.length} context="clés antérieures aux applications" />
            </div>
            {unlinked.length > 0 ? (
              <Notice tone="attention" title="Clés non rattachées">
                Ces clés ont été créées avant le rattachement obligatoire. Rattachez-les à leur application pour
                qu&apos;elles soient révoquées avec elle.
              </Notice>
            ) : null}
            <KeysTable keys={keys} groups={groups} />
          </div>
        )}
      </PageBody>
      <CreateKeyDialog open={creating} onOpenChange={setCreating} applications={applications} />
    </>
  )
}
