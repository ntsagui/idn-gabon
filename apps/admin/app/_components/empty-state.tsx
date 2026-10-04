import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

/** État vide utile : ce qui se passe, pourquoi, et quoi faire. */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 px-6 py-12 text-center",
        className,
      )}
    >
      <p className="text-sm font-semibold text-idn-ink">{title}</p>
      {description ? (
        <p className="max-w-md text-[13px] text-idn-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}
