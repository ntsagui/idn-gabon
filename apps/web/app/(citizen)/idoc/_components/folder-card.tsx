"use client"

import Link from "next/link"

import { IconTile } from "@/app/_components/idn/list"
import type { DocFolder } from "@/lib/citizen/doc-folders"
import { plural } from "@/lib/citizen/doc-format"

/** Tuile de dossier de la grille iDocument (apps/mobile/src/components/documents/folder-card.tsx). */
export function FolderCard({ f, count, hasExpiring }: { f: DocFolder; count: number; hasExpiring?: boolean }) {
  const sub = plural(count, "document", "documents")
  return (
    <Link
      href={`/idoc/folder/${f.id}`}
      aria-label={`${f.label}, ${sub}${hasExpiring ? ", une expiration approche" : ""}`}
      className="flex min-w-0 flex-col items-center gap-1.5 rounded-[14px] border border-idn-border bg-idn-surface px-2 py-4 outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <IconTile icon={f.icon} tone={count > 0 ? "green" : "neutral"} size={40} />
      <span className="text-sm font-semibold text-idn-ink">{f.label}</span>
      <span className={hasExpiring ? "truncate text-xs font-semibold text-c-yellow-text" : "truncate text-xs text-idn-muted"}>
        {hasExpiring ? "Expiration proche" : sub}
      </span>
    </Link>
  )
}
