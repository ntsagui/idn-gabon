import Link from "next/link"

import { Icon } from "../../_components/icons"
import { ARTICLE_GROUPS } from "./meta"

export default function DocsHome() {
  return (
    <div className="max-w-[900px]">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">Documentation</p>
      <h1 className="mt-2 text-[28px] font-semibold leading-[34px] tracking-[-0.01em] text-idn-ink">
        Intégrer l’Identité Numérique du Gabon
      </h1>
      <p className="mt-2 max-w-[64ch] text-[15px] leading-6 text-idn-muted">
        IDN est un fournisseur OpenID Connect. Vos usagers se connectent avec leur identité vérifiée ; votre
        service reçoit les données qu’ils acceptent de partager, au niveau de garantie que vous exigez.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/docs/demarrage-rapide"
          className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-idn-green px-4 text-sm font-medium text-white hover:bg-idn-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
        >
          Démarrage rapide <Icon name="arrowRight" size={15} />
        </Link>
        <Link
          href="/applications/new"
          className="inline-flex h-10 items-center rounded-[10px] border border-idn-border bg-idn-surface px-4 text-sm font-medium text-idn-ink hover:bg-idn-surface-2"
        >
          Enregistrer une application
        </Link>
      </div>
      <div className="mt-10 grid gap-8">
        {ARTICLE_GROUPS.map((group) => (
          <section key={group.title} aria-labelledby={`g-${group.title}`}>
            <h2 id={`g-${group.title}`} className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              {group.title}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {group.items.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/docs/${article.slug}`}
                    className="block h-full rounded-[14px] border border-idn-border bg-idn-surface p-4 hover:border-idn-green/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
                  >
                    <span className="block text-[15px] font-semibold text-idn-ink">{article.title}</span>
                    <span className="mt-1 block text-[13px] leading-5 text-idn-muted">{article.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
