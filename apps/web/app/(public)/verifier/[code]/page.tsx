import type { Metadata } from "next"
import Link from "next/link"

import { administrationVerifyApiUrl } from "../../../../lib/official-act-verification"
import { pageMetadata } from "../../../../lib/seo"
import { PageHero } from "../../_components/page-hero"
import { verifier as content } from "../../_content/fr"
import { OfficialActReader } from "../_reader"

// L'adresse du backend se lit à l'exécution (variable du service), jamais au build.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  ...pageMetadata({
    title: content.result.meta.title,
    description: content.result.meta.description,
    path: "/verifier",
  }),
  // Une page par code : jamais indexée.
  robots: { index: false, follow: false },
}

export default async function VerifierCodePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  return (
    <>
      <PageHero eyebrow={content.hero.eyebrow} title={content.result.title} />

      <section className="mx-auto w-full max-w-[1180px] space-y-6 px-4 pb-15 md:px-7">
        <div className="max-w-[920px]">
          <OfficialActReader apiBaseUrl={administrationVerifyApiUrl(process.env)} code={code} />
        </div>
        <p className="text-sm">
          <Link
            href="/verifier"
            className="rounded-sm font-medium text-idn-green underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-idn-green-on-dark"
          >
            {content.result.another}
          </Link>
        </p>
      </section>
    </>
  )
}
