"use client"

import * as React from "react"
import Link from "next/link"

import { Icon } from "@/app/_components/idn/icons"

import { formatAddressLine } from "../_lib/format"
import type { IBoiteAccount } from "./iboite-context"

/**
 * Bandeau d’adresse postale (apps/mobile/src/components/mailbox/address-strip.tsx) :
 * invitation à configurer l’adresse, ou adresse + code iBoîte avec copie.
 */
export function AddressStrip({ account }: { account: IBoiteAccount }) {
  const line = formatAddressLine(account)
  const [copied, setCopied] = React.useState<"ok" | "ko" | null>(null)
  const href = `/iboite/address-setup?accountId=${account._id}`

  if (!line) {
    return (
      <Link
        href={href}
        className="mt-3 flex items-center gap-2.5 rounded-[10px] border border-dashed border-c-green-text/40 bg-c-green-badge px-3 py-2.5 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-idn-green text-white">
          <Icon name="pinLoc" size={14} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-c-green-text">Configurer mon adresse</span>
          <span className="block text-xs text-idn-muted">Aucune adresse renseignée</span>
        </span>
        <Icon name="arrow" size={18} className="shrink-0 text-c-green-text" />
      </Link>
    )
  }

  async function copy() {
    // Adresse postale complète, prête à coller (libellé, point relais, quartier, ville).
    const text = [
      account.label,
      `Point Relais idn.ga ${account.qrCode}`,
      [account.district, account.street].filter(Boolean).join(", "),
      [account.postalCode, account.city].filter(Boolean).join(" "),
      account.country,
    ]
      .filter((l) => l && l.trim())
      .join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopied("ok")
    } catch {
      setCopied("ko")
    }
    window.setTimeout(() => setCopied(null), 2500)
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 rounded-[10px] border border-idn-border bg-idn-surface py-1.5 pl-3 pr-1.5">
        <Icon name="pinLoc" size={16} className="shrink-0 text-c-green-text" />
        <Link
          href={href}
          aria-label={`Modifier mon adresse : ${line}`}
          className="min-w-0 flex-1 rounded-md py-0.5 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block truncate text-[13px] font-medium text-idn-ink">{line}</span>
          <span className="block truncate font-mono text-[11px] text-idn-muted">{account.qrCode}</span>
        </Link>
        <button
          type="button"
          onClick={() => void copy()}
          aria-label="Copier l’adresse"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-idn-border text-idn-muted outline-none hover:bg-idn-surface-2 hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name={copied === "ok" ? "check" : "copy"} size={16} />
        </button>
      </div>
      <p role="status" className="text-xs text-idn-muted">
        {copied ? <span className="mt-1 block">{copied === "ok" ? "Adresse copiée." : "Copie impossible sur ce navigateur."}</span> : null}
      </p>
    </div>
  )
}
