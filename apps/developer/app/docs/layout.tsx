import type { Metadata } from "next"
import type { ReactNode } from "react"

import {
  absoluteUrl,
  DEFAULT_DOCS_OG_IMAGE,
  DOCS_DESCRIPTION,
  DOCS_NAME,
  SITE_LOCALE,
} from "../../lib/seo"
import Link from "next/link"

import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { DocsSidebar } from "./_components/sidebar"

export const metadata: Metadata = {
  title: {
    default: DOCS_NAME,
    template: `%s · ${DOCS_NAME}`,
  },
  description: DOCS_DESCRIPTION,
  alternates: {
    canonical: absoluteUrl("/docs"),
  },
  openGraph: {
    type: "website",
    url: absoluteUrl("/docs"),
    siteName: DOCS_NAME,
    title: DOCS_NAME,
    description: DOCS_DESCRIPTION,
    locale: SITE_LOCALE,
    images: [
      {
        url: DEFAULT_DOCS_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: DOCS_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DOCS_NAME,
    description: DOCS_DESCRIPTION,
    images: [DEFAULT_DOCS_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-idn-bg">
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-idn-green focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>
      <header className="sticky top-0 z-30 border-b border-idn-border bg-idn-surface">
        <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-4 px-6">
          <Link
            href="/docs"
            className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
          >
            <IdnMark size={26} />
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold text-idn-ink">Identité Numérique</span>
              <span className="block whitespace-nowrap font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
                Documentation
              </span>
            </span>
          </Link>
          <nav aria-label="Liens du portail" className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/" className="hidden rounded-md px-2 py-1.5 font-medium text-idn-ink-2 hover:text-idn-ink sm:inline-flex">
              Portail
            </Link>
            <Link
              href="/applications"
              className="inline-flex h-9 items-center rounded-[10px] bg-idn-green px-3.5 font-medium text-white hover:bg-idn-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
            >
              Mes applications
            </Link>
          </nav>
        </div>
        <IdnFlagBars width="100%" height={3} className="gap-0" />
      </header>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 gap-10 px-6 py-8">
        <aside className="hidden w-[240px] shrink-0 lg:block">
          <div className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto pb-6">
            <DocsSidebar />
          </div>
        </aside>
        <main id="docs-main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <details className="mb-6 rounded-[10px] border border-idn-border bg-idn-surface lg:hidden">
            <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-idn-ink">Sommaire</summary>
            <div className="border-t border-idn-border-soft p-3">
              <DocsSidebar />
            </div>
          </details>
          {children}
        </main>
      </div>
    </div>
  )
}
