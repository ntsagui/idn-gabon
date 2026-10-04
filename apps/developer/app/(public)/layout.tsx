import Link from "next/link"
import type { ReactNode } from "react"

import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { PUBLIC_SITE_URL } from "@/lib/seo"

const linkClass =
  "rounded-md px-2 py-1.5 text-sm font-medium text-idn-ink-2 hover:text-idn-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-idn-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-idn-green focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>
      <header className="border-b border-idn-border bg-idn-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-4 px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
          >
            <IdnMark size={28} />
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold tracking-[-0.01em] text-idn-ink">
                Identité Numérique
              </span>
              <span className="block whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
                Développeurs
              </span>
            </span>
          </Link>
          <nav aria-label="Navigation du site" className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link href="/docs" className={`${linkClass} hidden sm:inline-flex`}>
              Documentation
            </Link>
            <Link href="/sign-in" className={linkClass}>
              Se connecter
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center rounded-[10px] bg-idn-green px-3.5 text-sm font-medium text-white hover:bg-idn-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
        <IdnFlagBars width="100%" height={3} className="gap-0" />
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <footer className="border-t border-idn-border bg-idn-surface">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-3 px-6 py-6 text-[13px] text-idn-muted sm:flex-row sm:items-center sm:justify-between">
          <p>République Gabonaise · Identité Numérique du Gabon</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            <li>
              <Link href="/docs" className="hover:text-idn-ink hover:underline">
                Documentation
              </Link>
            </li>
            <li>
              <Link href="/docs/bouton-idn" className="hover:text-idn-ink hover:underline">
                Bouton « Se connecter avec IDN »
              </Link>
            </li>
            <li>
              <a href={PUBLIC_SITE_URL} className="hover:text-idn-ink hover:underline">
                identite.ga
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  )
}
