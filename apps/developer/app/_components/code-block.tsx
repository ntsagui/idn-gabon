import { cn } from "@repo/ui/lib/utils"

import { CopyButton } from "./copy"

/** Bloc de code sobre : Plex Mono, fond surface 2, bordure 1 px, copie. */
export function CodeBlock({
  code,
  title,
  className,
}: {
  code: string
  title?: string
  className?: string
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-[10px] border border-idn-border bg-idn-surface-2",
        className,
      )}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-idn-border px-3 py-1.5">
        <span className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
          {title ?? "Code"}
        </span>
        <CopyButton value={code} label={title ? `Copier ${title}` : "Copier le code"} className="size-7" />
      </figcaption>
      <pre
        tabIndex={0}
        className="overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-[1.65] text-idn-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-idn-green"
      >
        <code>{code}</code>
      </pre>
    </figure>
  )
}
