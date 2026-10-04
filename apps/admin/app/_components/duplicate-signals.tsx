"use client"

/**
 * File des signalements de doublon (même visage, même NIP, même pièce, même
 * identité déclarée), détectés à l'écriture. Comme l'inventaire, elle expose
 * et n'exécute rien : fermer un signalement archive un dossier, supprimer un
 * compte reste une action distincte avec sa propre confirmation.
 */
import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { LoABadge } from "@repo/ui/components/loa-badge"

import { fr } from "../_content/fr"
import { relativeTime } from "../_lib/format"
import { EmptyState } from "./empty-state"
import { PersonCell } from "./person"
import { TableSkeleton } from "./skeleton"

const t = fr.duplicates.signals

type FlagAccount = {
  userId: string
  email: string
  idnId?: string
  loa?: number
  exists: boolean
}

function AccountCell({ account }: { account: FlagAccount }) {
  if (!account.exists && !account.email) {
    return <span className="text-[13px] text-idn-muted">{t.deletedAccount}</span>
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <PersonCell
        person={{
          userId: account.userId,
          email: account.email || undefined,
          idnId: account.idnId,
          exists: account.exists,
        }}
      />
      {account.loa ? <LoABadge level={account.loa as 1 | 2 | 3} compact /> : null}
    </div>
  )
}

export function DuplicateSignals() {
  const data = useQuery(api.duplicates.queries.listOpenFlags, {})
  const resolve = useMutation(api.duplicates.mutations.resolveFlag)
  const [pending, setPending] = React.useState<string | null>(null)

  const onResolve = async (flagId: string, resolution: "confirmed" | "dismissed") => {
    setPending(flagId)
    try {
      await resolve({
        flagId: flagId as Parameters<typeof resolve>[0]["flagId"],
        resolution,
      })
      toast.success(
        resolution === "confirmed"
          ? "Doublon confirmé. Aucun compte n'a été modifié."
          : "Signalement écarté.",
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Arbitrage impossible.")
    } finally {
      setPending(null)
    }
  }

  return (
    <section aria-labelledby="dup-signals-title" className="adm-panel">
      <div className="border-b border-idn-border-soft px-5 py-4">
        <h2 id="dup-signals-title" className="text-[15px] font-semibold text-idn-ink">
          {t.title}
        </h2>
        <p className="mt-0.5 text-[13px] text-idn-muted">{t.sub}</p>
      </div>
      {data === undefined ? (
        <TableSkeleton rows={2} />
      ) : data.flags.length === 0 ? (
        <EmptyState title={t.empty} description="Les rapprochements détectés à l'inscription ou pendant la vérification apparaîtront ici." />
      ) : (
        <>
          <ul className="divide-y divide-idn-border-soft">
            {data.flags.map((f) => (
              <li key={f._id} className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
                <div className="min-w-[180px] flex-1">
                  <p className="text-[13px] font-medium text-idn-ink">
                    {t.source[f.signal]}
                    {f.score !== undefined ? (
                      <span className="font-normal text-idn-muted"> · {t.similarity(f.score)}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-idn-muted">Détecté {relativeTime(f.detectedAt)}</p>
                </div>
                <div className="grid min-w-[320px] flex-[2] grid-cols-2 gap-4">
                  <AccountCell account={f.account} />
                  <AccountCell account={f.matched} />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending === f._id}
                    onClick={() => void onResolve(f._id, "dismissed")}
                  >
                    {t.dismiss}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pending === f._id}
                    onClick={() => void onResolve(f._id, "confirmed")}
                  >
                    {t.confirm}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-idn-border-soft px-5 py-2.5 text-xs text-idn-muted">
            {t.resolveHint}
          </p>
        </>
      )}
    </section>
  )
}
