import { cn } from "@repo/ui/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("adm-skeleton h-4", className)} />
}

/** Squelette de tableau : quelques lignes de 44px, annoncé une fois. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="divide-y divide-idn-border-soft">
      <span className="sr-only">Chargement…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-11 items-center gap-4 px-4">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="ml-auto h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}

export function PanelSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" className={cn("adm-panel space-y-3 p-5", className)}>
      <span className="sr-only">Chargement…</span>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  )
}
