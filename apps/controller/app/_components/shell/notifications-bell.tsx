"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"
import { BellIcon } from "lucide-react"

import { api } from "@repo/backend/convex/_generated/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu"

import { relativeTime } from "../../_lib/format"

/** Destination d'une notification selon l'objet qu'elle concerne. */
function hrefFor(metadata: unknown): string | null {
  const meta = (metadata ?? {}) as Record<string, unknown>
  if (typeof meta.kycRequestId === "string") return `/queue?id=${meta.kycRequestId}`
  if (typeof meta.level3VerificationId === "string") return "/agenda"
  return null
}

export function NotificationsBell() {
  const list = useQuery(api.notifications.listMine, { limit: 10 })
  const unread = useQuery(api.notifications.unreadCount, {})
  const markAllRead = useMutation(api.notifications.markAllRead)
  const count = unread ?? 0
  const now = Date.now()

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && count > 0) void markAllRead()
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `Notifications : ${count} non lue${count > 1 ? "s" : ""}` : "Notifications"}
          className="relative flex size-9 shrink-0 items-center justify-center rounded-lg text-idn-muted transition-colors hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BellIcon aria-hidden className="size-4" />
          {count > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 min-w-4 rounded-full bg-idn-green px-1 font-mono text-[10px] font-medium leading-4 text-white"
            >
              {count > 9 ? "9+" : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-80">
        <DropdownMenuLabel className="text-sm font-semibold">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {list === undefined ? (
          <p className="px-2 py-6 text-center text-xs text-idn-muted">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-idn-muted">Aucune notification pour l&apos;instant.</p>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            {list.map((n) => {
              const href = hrefFor(n.metadata)
              const body = (
                <span className="flex flex-col items-start gap-0.5">
                  <span className="line-clamp-2 text-[13px] font-medium leading-snug text-idn-ink">{n.title}</span>
                  <span className="line-clamp-2 text-xs leading-snug text-idn-muted">{n.body}</span>
                  <span className="mt-0.5 text-[11px] text-idn-muted">{relativeTime(n.createdAt, now)}</span>
                </span>
              )
              return (
                <DropdownMenuItem key={n._id} asChild={Boolean(href)} className="items-start py-2">
                  {href ? <Link href={href}>{body}</Link> : body}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
