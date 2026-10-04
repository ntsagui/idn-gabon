import Link from "next/link"
import type { ReactNode } from "react"

import { Icon } from "../../_components/icons"
import { ARTICLES, groupOf, neighbours } from "../_articles/meta"

/** Gabarit d'article : kicker du groupe, titre, chapeau, navigation suivante. */
export function DocPage({ slug, children }: { slug: string; children: ReactNode }) {
  const meta = ARTICLES.find((a) => a.slug === slug)!
  const { prev, next } = neighbours(slug)
  return (
    <div className="max-w-[760px]">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
        {groupOf(slug)}
      </p>
      <h1 className="mt-2 text-[28px] font-semibold leading-[34px] tracking-[-0.01em] text-idn-ink">{meta.title}</h1>
      <p className="mt-2 text-[15px] leading-6 text-idn-muted">{meta.description}</p>
      <div className="mt-8 border-t border-idn-border pt-8">{children}</div>
      <nav aria-label="Articles voisins" className="mt-12 grid gap-3 border-t border-idn-border pt-6 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="rounded-[10px] border border-idn-border bg-idn-surface p-3 hover:border-idn-green/50 focus-visible:outline-2 focus-visible:outline-idn-green"
          >
            <span className="flex items-center gap-1 text-xs text-idn-muted">
              <Icon name="arrowLeft" size={13} /> Précédent
            </span>
            <span className="mt-0.5 block text-sm font-medium text-idn-ink">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="rounded-[10px] border border-idn-border bg-idn-surface p-3 text-right hover:border-idn-green/50 focus-visible:outline-2 focus-visible:outline-idn-green"
          >
            <span className="flex items-center justify-end gap-1 text-xs text-idn-muted">
              Suivant <Icon name="arrowRight" size={13} />
            </span>
            <span className="mt-0.5 block text-sm font-medium text-idn-ink">{next.title}</span>
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
