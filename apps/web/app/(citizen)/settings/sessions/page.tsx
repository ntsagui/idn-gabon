"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Card, Row, RowAction } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { deviceLabel } from "@/lib/citizen/device-label"

function relative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 0) return "Active maintenant"
  if (diff < 60_000) return "Il y a un instant"
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)} h`
  return `Il y a ${Math.floor(diff / 86_400_000)} j`
}

const icon = (d: string) => (/iphone|android/i.test(d) ? "smartphone" : /ipad/i.test(d) ? "tablet" : "laptop") as "smartphone" | "tablet" | "laptop"

/** Appareils et sessions : transposition de apps/mobile/src/app/settings/sessions.tsx. */
export default function SessionsPage() {
  const sessions = useQuery(api.sessions.listMine)
  const revoke = useMutation(api.sessions.revoke)
  const revokeAllOthers = useMutation(api.sessions.revokeAllOthers)
  const [target, setTarget] = React.useState<{ id: string; device: string } | null>(null)
  const [allOpen, setAllOpen] = React.useState(false)

  const named = (sessions ?? []).map((s) => ({ ...s, device: deviceLabel(s.device, s.userAgent ?? null) }))
  const others = named.filter((s) => !s.isCurrent)

  return (
    <Screen
      header={<AppBar title="Appareils et sessions" back="/profile" />}
      footer={
        others.length > 0 ? (
          <IdnButton variant="dangerGhost" full onClick={() => setAllOpen(true)}>
            Déconnecter tous les autres appareils
          </IdnButton>
        ) : undefined
      }
    >
      <p className="mt-4 text-sm leading-5 text-idn-muted" aria-live="polite">
        {sessions === undefined
          ? "Chargement…"
          : `${named.length} session${named.length > 1 ? "s" : ""} active${named.length > 1 ? "s" : ""}. Déconnecte un appareil que tu ne reconnais pas.`}
      </p>
      {named.length > 0 ? (
        <Card className="mt-4">
          {named.map((s) => (
            <Row
              key={s.id}
              icon={icon(s.device)}
              tone={s.isCurrent ? "green" : "neutral"}
              title={s.device}
              sub={[s.isCurrent ? "Cet appareil" : relative(s.createdAt), s.ipAddress].filter(Boolean).join(" · ")}
              right={
                s.isCurrent ? (
                  <Badge tone="green">Actif</Badge>
                ) : (
                  <RowAction danger ariaLabel={`Déconnecter ${s.device}`} onClick={() => setTarget({ id: s.id, device: s.device })}>
                    Déconnecter
                  </RowAction>
                )
              }
            />
          ))}
        </Card>
      ) : null}

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Déconnecter cet appareil ?"
        description={target ? `${target.device} devra se reconnecter avec ton code PIN.` : undefined}
        confirmLabel="Déconnecter"
        destructive
        onConfirm={async () => {
          if (target) await revoke({ sessionId: target.id })
        }}
      />
      <ConfirmDialog
        open={allOpen}
        onOpenChange={setAllOpen}
        title="Déconnecter tous les autres appareils ?"
        description="Toutes les autres sessions sont fermées immédiatement. Tu restes connecté sur cet appareil."
        confirmLabel="Déconnecter tout"
        destructive
        onConfirm={async () => {
          await revokeAllOthers({})
        }}
      />
    </Screen>
  )
}
