"use client"

import { IconButton } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { Card, Row } from "@/app/_components/idn/list"

/**
 * Sélecteur de CV (apps/mobile/src/components/cv/cv-selector.tsx) : carte du
 * CV actif (ouvre « Mes CV », qui sert de sélecteur) et bouton « Créer un CV ».
 */
export function CvSelector({ active }: { active: { name: string; isDefault: boolean } | null }) {
  if (!active) return null
  return (
    <Card className="mt-4">
      <Row
        icon="fileUser"
        tone="green"
        title={
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate">{active.name}</span>
            {active.isDefault ? <Badge tone="green">Principal</Badge> : null}
          </span>
        }
        sub="Changer de CV"
        ariaLabel={`CV actif : ${active.name}${active.isDefault ? ", principal" : ""}. Changer de CV`}
        href="/icv/list"
        right={<IconButton icon="plus" label="Créer un CV" href="/icv/create" size={36} />}
      />
    </Card>
  )
}
