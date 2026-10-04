import type { ReactNode } from "react"

import { cn } from "@repo/ui/lib/utils"

/** Bloc de contenu : bordure 1px, en-tête optionnel (titre, aide, actions). */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  id?: string
}) {
  return (
    <section
      aria-labelledby={id && title ? `${id}-title` : undefined}
      className={cn("adm-panel", className)}
    >
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-idn-border-soft px-5 py-4">
          <div className="min-w-0">
            <h2
              id={id ? `${id}-title` : undefined}
              className="text-[15px] font-semibold text-idn-ink"
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-[13px] text-idn-muted">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  )
}

/** Ligne libellé / valeur d'une fiche. */
export function Field({
  label,
  children,
  mono = false,
}: {
  label: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(120px,40%)_1fr] gap-4 border-b border-idn-border-soft py-2.5 text-[13px] first:pt-0 last:border-0 last:pb-0">
      <dt className="text-idn-muted">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-idn-ink",
          mono && "font-mono text-xs leading-5",
        )}
      >
        {children === undefined || children === null || children === "" ? (
          <span className="font-sans text-[13px] text-idn-muted">Non renseigné</span>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}
