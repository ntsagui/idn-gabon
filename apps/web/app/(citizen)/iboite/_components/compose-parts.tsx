import * as React from "react"

import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { Icon } from "@/app/_components/idn/icons"

import { formatBytes } from "../_lib/format"

// Limites alignées sur le mobile : 10 fichiers, 10 Mo chacun.
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
export const MAX_ATTACHMENT_LABEL = "10 Mo"
export const MAX_ATTACHMENTS = 10

/** Envoie un fichier vers le stockage Convex et renvoie la référence à passer à `send`. */
export async function uploadFile(uploadUrl: string, file: File) {
  const mimeType = file.type || "application/octet-stream"
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": mimeType }, body: file })
  if (!res.ok) throw new Error(`Envoi de ${file.name} impossible (${res.status}).`)
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
  return { name: file.name, size: file.size, storageRef: storageId, mimeType }
}

/** Ligne « De / À / Objet » des écrans de rédaction. */
export function ComposeField({
  label,
  htmlFor,
  srOnlyLabel,
  children,
}: {
  label: string
  htmlFor?: string
  srOnlyLabel?: boolean
  children: React.ReactNode
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className="flex min-h-12 items-center gap-2 border-b border-idn-border focus-within:border-b-2 focus-within:border-idn-green">
      <Label htmlFor={htmlFor} className={cn("w-10 shrink-0 text-[13px] font-medium text-idn-muted", srOnlyLabel && "sr-only")}>
        {label}
      </Label>
      {children}
    </div>
  )
}

/** Pièces jointes en attente d’envoi, retirables une à une. */
export function AttachmentList({ files, disabled, onRemove }: { files: File[]; disabled?: boolean; onRemove: (index: number) => void }) {
  if (files.length === 0) return null
  return (
    <ul aria-label="Pièces jointes" className="mt-3 flex flex-col gap-1.5">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-[10px] border border-idn-border bg-idn-surface py-1.5 pl-2.5 pr-1">
          <Icon name="paperclip" size={16} className="shrink-0 text-idn-ink-2" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-idn-ink">{f.name}</span>
            <span className="block text-xs text-idn-muted">{formatBytes(f.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => onRemove(i)}
            disabled={disabled}
            aria-label={`Retirer ${f.name}`}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-idn-muted outline-none hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <Icon name="close" size={16} />
          </button>
        </li>
      ))}
    </ul>
  )
}
