import Link from "next/link"
import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

/**
 * En-tête de page : kicker mono, titre 24/600, description courte, actions à
 * droite et, sur les pages de détail, fil d'Ariane. Bordure basse 1px, sans
 * dégradé ni flou.
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  breadcrumb,
}: {
  kicker: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  breadcrumb?: Array<{ label: string; href?: string }>
}) {
  return (
    <header className="border-b border-idn-border bg-idn-surface px-5 py-5 md:px-8">
      {breadcrumb ? (
        <nav aria-label="Fil d'Ariane" className="mb-2">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-idn-muted">
            {breadcrumb.map((item, i) => (
              <li key={item.label} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3.5" /> : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="rounded-sm outline-none hover:text-idn-ink hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-idn-ink-2">
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="adm-kicker">{kicker}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-[-0.01em] text-idn-ink">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-idn-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

/** Zone de contenu sous l'en-tête. */
export function PageBody({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 px-5 py-6 md:px-8">
      <div className="mx-auto w-full max-w-[1240px]">{children}</div>
    </div>
  )
}
