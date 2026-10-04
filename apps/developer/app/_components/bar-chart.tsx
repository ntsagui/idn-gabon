"use client"

import { useId, useState } from "react"

import { cn } from "@repo/ui/lib/utils"

import { formatDayKey, formatNumber } from "./format"

/**
 * Histogramme d'une seule série par jour (pas de légende : le titre la
 * nomme). Barres fines, 2 px d'écart, extrémité arrondie ancrée sur la ligne
 * de base, grille discrète. Survol et flèches du clavier affichent la valeur ;
 * le tableau équivalent est fourni à côté par la page.
 */
export function BarChart({
  title,
  data,
  tone,
  unit,
}: {
  title: string
  data: Array<{ date: string; value: number }>
  tone: "green" | "red"
  unit: (value: number) => string
}) {
  const id = useId()
  const [active, setActive] = useState<number | null>(null)
  const width = 640
  const height = 160
  const top = 8
  const bottom = 22
  const left = 0
  const plotHeight = height - top - bottom
  const max = Math.max(1, ...data.map((d) => d.value))
  const niceMax = max <= 4 ? max : Math.ceil(max / 4) * 4
  const slot = (width - left) / Math.max(1, data.length)
  const gap = 2
  const barWidth = Math.max(2, slot - gap)
  const radius = Math.min(4, barWidth / 2)
  const fill =
    tone === "green" ? "fill-idn-green dark:fill-[#5BC57F]" : "fill-[#B3261E] dark:fill-[#F2857E]"
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const labelIdx = data.length <= 7 ? data.map((_, i) => i) : [0, Math.floor((data.length - 1) / 2), data.length - 1]
  const current = active !== null ? data[active] : null

  return (
    <figure className="relative">
      <figcaption id={`${id}-title`} className="sr-only">
        {title} : {unit(total)} sur {data.length} jours.
      </figcaption>
      <div className="mb-1 flex h-5 items-baseline justify-between text-xs text-idn-muted">
        <span className="tabular-nums">max. {formatNumber(niceMax)}</span>
        <span aria-live="polite" className="tabular-nums text-idn-ink">
          {current ? `${formatDayKey(current.date)} · ${unit(current.value)}` : ""}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${id}-title`}
        tabIndex={0}
        className="block h-auto w-full rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
        onMouseLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1))
          else if (event.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1))
          else return
          event.preventDefault()
        }}
      >
        <line x1={0} x2={width} y1={top} y2={top} className="stroke-idn-border-soft" strokeWidth={1} />
        <line x1={0} x2={width} y1={top + plotHeight / 2} y2={top + plotHeight / 2} className="stroke-idn-border-soft" strokeWidth={1} />
        <line x1={0} x2={width} y1={top + plotHeight} y2={top + plotHeight} className="stroke-idn-border" strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.value / niceMax) * plotHeight
          const x = left + i * slot + gap / 2
          const y = top + plotHeight - h
          const r = Math.min(radius, h)
          const path =
            h <= 0
              ? ""
              : `M${x},${top + plotHeight} V${y + r} Q${x},${y} ${x + r},${y} H${x + barWidth - r} Q${x + barWidth},${y} ${x + barWidth},${y + r} V${top + plotHeight} Z`
          return (
            <g key={d.date} onMouseEnter={() => setActive(i)}>
              <rect x={left + i * slot} y={top} width={slot} height={plotHeight} fill="transparent" />
              {path ? <path d={path} className={cn(fill, active !== null && active !== i && "opacity-40")} /> : null}
              {active === i ? (
                <line
                  x1={x + barWidth / 2}
                  x2={x + barWidth / 2}
                  y1={top}
                  y2={top + plotHeight}
                  className="stroke-idn-muted-soft"
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
              ) : null}
            </g>
          )
        })}
        {labelIdx.map((i) => (
          <text
            key={data[i]!.date}
            x={left + i * slot + slot / 2}
            y={height - 6}
            textAnchor={i === 0 && data.length > 7 ? "start" : i === data.length - 1 && data.length > 7 ? "end" : "middle"}
            className="fill-idn-muted text-[11px]"
          >
            {formatDayKey(data[i]!.date)}
          </text>
        ))}
      </svg>
    </figure>
  )
}
