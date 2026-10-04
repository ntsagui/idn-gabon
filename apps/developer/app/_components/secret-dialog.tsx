"use client"

import { useState } from "react"

import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"

import { CopyButton } from "./copy"
import { Notice } from "./ui"

export type RevealedSecret = {
  title: string
  description: string
  label: string
  value: string
  /** Valeurs complémentaires non secrètes (ex. client_id). */
  extra?: Array<{ label: string; value: string }>
}

/**
 * Affiche un secret une seule fois. La fermeture exige d'avoir confirmé la
 * sauvegarde : le serveur n'en garde qu'une empreinte, il est irrécupérable.
 */
export function SecretDialog({
  secret,
  onClose,
}: {
  secret: RevealedSecret | null
  onClose: () => void
}) {
  const [saved, setSaved] = useState(false)
  const close = () => {
    setSaved(false)
    onClose()
  }
  return (
    <Dialog
      open={secret !== null}
      onOpenChange={(open) => {
        if (!open && saved) close()
      }}
    >
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (!saved) event.preventDefault()
        }}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="rounded-[14px] border-idn-border bg-idn-surface shadow-none sm:max-w-xl"
      >
        {secret ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-idn-ink">{secret.title}</DialogTitle>
              <DialogDescription className="text-sm text-idn-muted">
                {secret.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {secret.extra?.map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-[13px] font-medium text-idn-ink">{item.label}</p>
                  <div className="flex items-center gap-2">
                    <code className="block min-w-0 flex-1 break-all rounded-[10px] border border-idn-border bg-idn-surface-2 px-3 py-2 font-mono text-[13px] text-idn-ink">
                      {item.value}
                    </code>
                    <CopyButton value={item.value} label={`Copier ${item.label}`} />
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-idn-ink">{secret.label}</p>
                <div className="flex items-center gap-2">
                  <code
                    data-testid="revealed-secret"
                    className="block min-w-0 flex-1 break-all rounded-[10px] border border-idn-green/40 bg-idn-green-soft px-3 py-2 font-mono text-[13px] text-idn-ink dark:bg-[#0F2A18]"
                  >
                    {secret.value}
                  </code>
                  <CopyButton value={secret.value} label={`Copier ${secret.label}`} />
                </div>
              </div>
              <Notice tone="attention" title="Affiché une seule fois">
                Conservez cette valeur dans un gestionnaire de secrets. Identité Numérique n&apos;en garde
                qu&apos;une empreinte : en cas de perte, il faudra en générer une nouvelle.
              </Notice>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-idn-ink">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(event) => setSaved(event.target.checked)}
                  className="size-4 accent-[#0E7C3A]"
                />
                J&apos;ai enregistré cette valeur en lieu sûr.
              </label>
            </div>
            <DialogFooter>
              <Button type="button" disabled={!saved} onClick={close}>
                Terminé
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
