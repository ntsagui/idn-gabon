import Link from "next/link"
import type { ReactNode } from "react"

import { CodeBlock } from "../../_components/code-block"
import { Notice } from "../../_components/ui"

/** Primitives typographiques des articles (échelle de la charte). */

export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="mt-10 scroll-mt-20 text-[22px] font-semibold leading-7 text-idn-ink first:mt-0">
      {children}
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="mt-7 scroll-mt-20 text-[17px] font-semibold leading-6 text-idn-ink">
      {children}
    </h3>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[15px] leading-6 text-idn-ink-2">{children}</p>
}

export function C({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-idn-surface-2 px-1 py-0.5 font-mono text-[0.86em] text-idn-ink">
      {children}
    </code>
  )
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-6 text-idn-ink-2 marker:text-idn-muted-soft">
      {children}
    </ul>
  )
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-6 text-idn-ink-2 marker:text-idn-muted">
      {children}
    </ol>
  )
}

export function Code({ title, code }: { title?: string; code: string }) {
  return <CodeBlock title={title} code={code} className="mt-4" />
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "attention" | "danger"
  title?: string
  children: ReactNode
}) {
  return (
    <Notice tone={tone} title={title} className="mt-4">
      {children}
    </Notice>
  )
}

export function A({ href, children }: { href: string; children: ReactNode }) {
  const className =
    "font-medium text-idn-green underline underline-offset-2 hover:text-idn-green-dark dark:text-idn-green-on-dark"
  return href.startsWith("/") ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <a href={href} className={className}>
      {children}
    </a>
  )
}

export function Table({
  head,
  rows,
  mono = [0],
}: {
  head: string[]
  rows: ReactNode[][]
  /** Index des colonnes en Plex Mono. */
  mono?: number[]
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-[10px] border border-idn-border">
      <table className="w-full text-left text-[13px]">
        <thead className="bg-idn-surface-2 text-xs text-idn-muted">
          <tr className="h-9">
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-idn-border-soft bg-idn-surface">
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-3 py-2 align-top leading-5 ${mono.includes(j) ? "font-mono text-idn-ink" : "text-idn-ink-2"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
