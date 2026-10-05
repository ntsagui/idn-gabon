import * as React from "react"

import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"
import { cardNumberLabel } from "@/lib/citizen/wallet-display"

import { CARD_COLORS, cardColor, formatLabel, type GradKey, type UiCard } from "../_content/cards"

/**
 * Face d’une carte dans la pile ou la grille (`CardFace` de l’iCarte mobile) :
 * aplat de couleur, icône, nom, mention, numéro masqué. La carte « officielle »
 * (fond blanc) garde un texte vert.
 */
export function CardFace({
  card,
  data,
  selected,
  className,
}: {
  card: UiCard
  data?: Record<string, string>
  selected?: boolean
  className?: string
}) {
  const official = card.grad === "white"
  const number = cardNumberLabel(data)
  return (
    <span
      className={cn(
        "flex h-[200px] w-full flex-col justify-between rounded-[20px] p-[18px] text-left",
        official ? "bg-idn-surface text-c-green-text" : "text-white",
        selected ? "border-2 border-idn-ink" : official ? "border border-idn-border" : "border-0",
        className
      )}
      style={official ? undefined : { background: CARD_COLORS[card.grad as GradKey] }}
    >
      <span className="flex items-center gap-2.5">
        <Icon name={card.icon} size={20} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{card.name}</span>
      </span>
      <span className="block min-w-0">
        {card.sub ? (
          <span className={cn("block truncate text-[13px]", official ? "text-idn-ink-2" : "text-white/85")}>{card.sub}</span>
        ) : null}
        {number ? <span className="mt-1 block font-mono text-base tracking-[1.5px]">{number}</span> : null}
      </span>
    </span>
  )
}

/** Pastille de couleur d’une carte (liste « Organiser »). */
export function CardSwatch({ grad }: { grad: GradKey | "white" }) {
  return (
    <span
      aria-hidden
      className={cn("h-[26px] w-10 shrink-0 rounded-md", grad === "white" && "border border-idn-border bg-idn-surface")}
      style={grad === "white" ? undefined : { background: CARD_COLORS[grad] }}
    />
  )
}

/** Aperçu réduit (création personnalisée, modification). */
export function CardPreview({ grad, icon, name, sub }: { grad: GradKey | "white"; icon: IconName; name: string; sub?: string }) {
  return (
    <div
      aria-hidden
      className="mx-auto mb-6 aspect-[85/55] w-full max-w-[220px] overflow-hidden rounded-[14px] p-4 text-white"
      style={{ background: cardColor(grad) }}
    >
      <Icon name={icon} size={18} />
      <p className="mt-[22px] truncate text-[13px] font-bold">{name}</p>
      {sub ? <p className="mt-0.5 truncate text-[11px] text-white/80">{sub}</p> : null}
    </div>
  )
}

/** Grand visuel de la carte (écran de la carte) : recto ou verso, champs renseignés. */
export function CardVisual({
  card,
  entries,
  showSide,
  verso,
}: {
  card: UiCard
  entries: [string, string][]
  showSide: boolean
  verso: boolean
}) {
  const hasContent = entries.some(([, v]) => v && v.length > 0)
  return (
    <div className="relative aspect-[85/55] w-full overflow-hidden rounded-[18px] p-5 text-white" style={{ background: cardColor(card.grad) }}>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/[0.08]" />
      <span aria-hidden className="absolute bottom-3.5 right-3.5">
        <IdnFlagBars width={32} height={3} />
      </span>
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <Icon name={card.icon} size={28} />
          {showSide ? (
            <span className="rounded-full bg-white/[0.16] px-2 py-[3px] font-mono text-[10px] font-semibold tracking-[0.04em]">
              {verso ? "VERSO" : "RECTO"}
            </span>
          ) : null}
        </div>
        <div className="mt-[18px] flex min-h-0 flex-1 flex-col">
          {!hasContent ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-white/85">
              <Icon name="edit" size={18} />
              <p className="text-xs font-medium">Renseigne tes informations</p>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3">
              {entries.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="truncate text-[10px] font-semibold tracking-[0.1em] text-white/75">{formatLabel(k).toUpperCase()}</dt>
                  <dd className="mt-0.5 truncate font-mono text-[13px]">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  )
}
