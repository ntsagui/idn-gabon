import { LevelBadge } from "@/app/_components/idn/badge"
import { Icon } from "@/app/_components/idn/icons"
import { Card, IconTile, Overline } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"

import { LEVEL3_UNLOCKS } from "./level3-intro"

/** Résultat de l'entretien (prototype « l3-result »). */
export function Level3Result({ approved, controllerName, reason }: { approved: boolean; controllerName?: string; reason?: string }) {
  if (!approved) {
    return (
      <div className="mt-8 flex flex-col items-center text-center">
        <span className="flex size-[72px] items-center justify-center rounded-full bg-c-red-badge text-c-red-text">
          <Icon name="close" size={32} strokeWidth={2.5} />
        </span>
        <h2 className="mt-4 text-[22px] font-semibold text-idn-ink">Niveau 3 non accordé</h2>
        <p className="mt-1.5 text-sm leading-5 text-idn-muted">
          {reason ?? "Le contrôleur n’a pas pu confirmer ton identité lors de l’entretien."} Tu peux refaire une demande.
        </p>
      </div>
    )
  }
  return (
    <>
      <div className="mt-4 flex flex-col items-center text-center">
        <IdnLottie name="shield" size={128} label="Niveau 3 atteint" />
        <h2 className="mt-2 text-[22px] font-semibold text-idn-ink">Niveau 3 atteint</h2>
        <LevelBadge level={3} className="mt-2" />
        <p className="mt-2.5 text-sm leading-5 text-idn-muted">
          {controllerName ? `${controllerName} a confirmé ton identité.` : "Un contrôleur a confirmé ton identité."} Ta carte et ton profil sont à jour.
        </p>
      </div>
      <Overline className="mb-2.5 mt-6">Désormais disponible</Overline>
      <Card as="ul">
        {LEVEL3_UNLOCKS.map((u) => (
          <li key={u.title} className="flex min-h-[52px] items-center gap-3">
            <IconTile icon={u.icon} tone="green" />
            <span className="flex-1 text-sm font-medium text-idn-ink">{u.title}</span>
            <Icon name="check" size={18} className="text-c-green-text" />
          </li>
        ))}
      </Card>
    </>
  )
}
