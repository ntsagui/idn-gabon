"use client"

import type { ReactNode } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

/**
 * Tableau de travail : en-tête collant, lignes de 44px, survol en surface-2.
 * Une ligne « cliquable » garde un vrai lien dans sa première cellule pour la
 * navigation clavier ; le clic sur le reste de la ligne y mène aussi.
 */
export function DataTable({
  label,
  head,
  children,
  className,
  minWidth = 720,
}: {
  label: string
  head: ReactNode
  children: ReactNode
  className?: string
  minWidth?: number
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table
        style={{ minWidth }}
        className="w-full border-collapse text-left text-[13px]"
      >
        <caption className="sr-only">{label}</caption>
        <thead className="sticky top-0 z-10 bg-idn-surface-2">
          <tr className="border-b border-idn-border">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Th({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode
  className?: string
  align?: "left" | "right"
}) {
  return (
    <th
      scope="col"
      className={cn(
        "h-10 whitespace-nowrap px-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-muted",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </th>
  )
}

export function SortTh<K extends string>({
  label,
  sortKey,
  current,
  direction,
  onSort,
  className,
}: {
  label: string
  sortKey: K
  current: K
  direction: "asc" | "desc"
  onSort: (key: K) => void
  className?: string
}) {
  const active = current === sortKey
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("h-10 px-4", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm font-mono text-[11px] font-medium uppercase tracking-[0.06em] outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
          active ? "text-idn-ink" : "text-idn-muted hover:text-idn-ink",
        )}
      >
        {label}
        <Icon aria-hidden className="size-3" />
      </button>
    </th>
  )
}

export function Tr({
  children,
  onActivate,
  className,
}: {
  children: ReactNode
  onActivate?: () => void
  className?: string
}) {
  return (
    <tr
      onClick={
        onActivate
          ? (e) => {
              // Les contrôles internes (liens, boutons) gardent leur propre clic.
              if ((e.target as HTMLElement).closest("a,button,input,select,label"))
                return
              onActivate()
            }
          : undefined
      }
      className={cn(
        "h-11 border-b border-idn-border-soft transition-colors duration-150 last:border-0 hover:bg-idn-surface-2",
        onActivate && "cursor-pointer",
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  className,
  align = "left",
}: {
  children?: ReactNode
  className?: string
  align?: "left" | "right"
}) {
  return (
    <td
      className={cn(
        "px-4 py-1.5 align-middle text-idn-ink",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  )
}
