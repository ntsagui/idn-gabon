"use client"

import { useState } from "react"

import { cn } from "@repo/ui/lib/utils"

import { fmtNumber } from "../_lib/format"

type Bucket = { day: number; count: number }

/** Graduation « ronde » : 1, 2, 5 × 10ⁿ, au moins 4. */
function niceMax(max: number): { top: number; step: number } {
  if (max <= 4) return { top: 4, step: 1 }
  const raw = max / 4
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw
  return { top: step * Math.ceil(max / step), step }
}

const dayLabel = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
const dayLong = (ts: number) =>
  new Date(ts).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

/**
 * Connexions réussies par jour : une seule série, donc pas de légende (le
 * titre la nomme). Axe des valeurs gradué, dates lisibles, valeur au survol
 * et au clavier (chaque barre est focalisable), tableau des données
 * dépliable pour les lecteurs d'écran et la vérification.
 */
export function LoginChart({ buckets }: { buckets: Bucket[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(0, ...buckets.map((b) => b.count))
  const { top, step } = niceMax(max)
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  const labelEvery = buckets.length > 14 ? Math.ceil(buckets.length / 7) : buckets.length > 7 ? 2 : 1
  const shown = active !== null ? buckets[active] : undefined

  return (
    <div>
      <div className="flex gap-3">
        {/* Axe des valeurs */}
        <div aria-hidden className="relative h-48 w-8 shrink-0">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 font-mono text-[11px] text-idn-muted tabular-nums"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {fmtNumber(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Grille */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48">
            {ticks.map((t) => (
              <span
                key={t}
                className={cn(
                  "absolute inset-x-0 border-t",
                  t === 0 ? "border-idn-border" : "border-dashed border-idn-border-soft",
                )}
                style={{ bottom: `${(t / top) * 100}%` }}
              />
            ))}
          </div>

          {/* Barres */}
          <ul
            className="relative flex h-48 items-end gap-[2px]"
            aria-label="Connexions réussies par jour"
            onMouseLeave={() => setActive(null)}
          >
            {buckets.map((b, i) => (
              <li key={b.day} className="flex h-full min-w-0 flex-1 items-end">
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${dayLong(b.day)} : ${fmtNumber(b.count)} connexion${b.count > 1 ? "s" : ""}`}
                  className="group flex h-full w-full items-end rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-idn-green"
                >
                  <span
                    className={cn(
                      "block w-full rounded-t-[4px] transition-colors duration-150",
                      active === i ? "bg-idn-green-dark" : "bg-idn-green",
                      b.count === 0 && "bg-transparent",
                    )}
                    style={{ height: b.count === 0 ? 0 : `max(2px, ${(b.count / top) * 100}%)` }}
                  />
                </button>
              </li>
            ))}
          </ul>

          {/* Valeur au survol */}
          {shown ? (
            <div
              role="status"
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md border border-idn-border bg-idn-surface px-2.5 py-1.5 text-xs"
              style={{
                left: `${((active! + 0.5) / buckets.length) * 100}%`,
              }}
            >
              <span className="block whitespace-nowrap text-idn-muted">{dayLong(shown.day)}</span>
              <span className="block font-mono font-semibold text-idn-ink tabular-nums">
                {fmtNumber(shown.count)} connexion{shown.count > 1 ? "s" : ""}
              </span>
            </div>
          ) : null}

          {/* Axe des dates */}
          <div aria-hidden className="mt-2 flex gap-[2px]">
            {buckets.map((b, i) => (
              <span
                key={b.day}
                className="min-w-0 flex-1 whitespace-nowrap text-center font-mono text-[11px] text-idn-muted"
              >
                {(buckets.length - 1 - i) % labelEvery === 0 ? dayLabel(b.day) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-[13px]">
        <summary className="cursor-pointer rounded-sm text-idn-muted outline-none hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-idn-green">
          Afficher les données
        </summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <caption className="sr-only">Connexions réussies par jour</caption>
          <thead>
            <tr className="border-b border-idn-border">
              <th scope="col" className="py-1.5 font-mono text-[11px] font-medium uppercase text-idn-muted">
                Jour
              </th>
              <th scope="col" className="py-1.5 text-right font-mono text-[11px] font-medium uppercase text-idn-muted">
                Connexions
              </th>
            </tr>
          </thead>
          <tbody>
            {buckets.map((b) => (
              <tr key={b.day} className="border-b border-idn-border-soft last:border-0">
                <td className="py-1 text-idn-ink">{dayLabel(b.day)}</td>
                <td className="py-1 text-right font-mono tabular-nums text-idn-ink">
                  {fmtNumber(b.count)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
