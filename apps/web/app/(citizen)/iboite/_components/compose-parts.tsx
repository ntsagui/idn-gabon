"use client"

import * as React from "react"
import Link from "next/link"
import { Image as ImageIcon } from "lucide-react"

import type { Id } from "@repo/backend/convex/_generated/dataModel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"
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

/**
 * En-tête des écrans de rédaction, façon feuille Gmail : fermer à gauche,
 * trombone (Photos / Appareil photo / Fichiers) et « Envoyer » à droite.
 */
export function ComposeHeader({
  title,
  closeHref,
  formId,
  submitting,
  onFiles,
}: {
  title: string
  closeHref: string
  formId: string
  submitting: boolean
  onFiles: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const photosRef = React.useRef<HTMLInputElement>(null)
  const cameraRef = React.useRef<HTMLInputElement>(null)
  const filesRef = React.useRef<HTMLInputElement>(null)
  const menuItem = "min-h-11 gap-4 rounded-lg px-4 text-[15px] text-idn-ink focus:bg-idn-surface-2 focus:text-idn-ink"
  return (
    <div className="sticky top-0 z-20 flex min-h-[60px] items-center gap-1 bg-idn-bg/95 px-2.5 backdrop-blur supports-[backdrop-filter]:bg-idn-bg/85 md:px-0 md:pt-4">
      <h1 className="sr-only">{title}</h1>
      <Link
        href={closeHref}
        aria-label="Fermer"
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-idn-surface-2 text-idn-ink-2 outline-none hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon name="close" size={20} />
      </Link>
      <span className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={submitting}
          aria-label="Joindre un fichier"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-c-green-text outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <Icon name="paperclip" size={20} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-[18px] border-idn-border bg-idn-surface p-2">
          <DropdownMenuItem className={menuItem} onSelect={() => photosRef.current?.click()}>
            <ImageIcon aria-hidden size={20} strokeWidth={1.8} className="text-idn-ink-2" />
            Photos
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItem} onSelect={() => cameraRef.current?.click()}>
            <Icon name="camera" size={20} className="text-idn-ink-2" />
            Appareil photo
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItem} onSelect={() => filesRef.current?.click()}>
            <Icon name="file" size={20} className="text-idn-ink-2" />
            Fichiers
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-idn-border" />
          <DropdownMenuLabel className="px-4 py-1.5 text-xs font-normal text-idn-muted">{MAX_ATTACHMENT_LABEL} maximum par fichier</DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={photosRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={onFiles} />
      <input ref={filesRef} type="file" multiple hidden onChange={onFiles} />
      <button
        type="submit"
        form={formId}
        disabled={submitting}
        className="ml-1 inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-idn-green px-3.5 text-sm font-semibold text-white outline-none hover:bg-idn-green-dark focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
      >
        {submitting ? (
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        ) : (
          <Icon name="send" size={18} />
        )}
        Envoyer
      </button>
    </div>
  )
}

/** Ligne « À / De / Objet » des écrans de rédaction : filets, sans cadre. */
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
    <div className="-mx-5 flex min-h-[50px] items-center gap-2.5 border-b border-idn-border px-5 focus-within:border-b-2 focus-within:border-idn-green md:mx-0 md:px-0">
      <Label htmlFor={htmlFor} className={cn("w-11 shrink-0 text-[15px] text-idn-muted", srOnlyLabel && "sr-only")}>
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
