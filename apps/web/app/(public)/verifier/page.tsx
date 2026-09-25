import { Card } from "@repo/ui/components/card"

import { pageMetadata } from "../../../lib/seo"
import { PageHero } from "../_components/page-hero"
import { verifier as content } from "../_content/fr"
import { VerifyCodeForm } from "./_form"

export const metadata = pageMetadata({
  title: content.meta.title,
  description: content.meta.description,
  path: "/verifier",
})

export default function VerifierPage() {
  return (
    <>
      <PageHero eyebrow={content.hero.eyebrow} title={content.hero.title} sub={content.hero.sub} />

      <section className="mx-auto w-full max-w-[1180px] px-4 pb-15 md:px-7">
        <div className="max-w-[560px]">
          <Card className="p-6">
            <VerifyCodeForm />
          </Card>
          <p className="mt-5 border-l-2 border-idn-green pl-4 text-sm leading-relaxed text-foreground/80">
            {content.entry.note}
          </p>
        </div>
      </section>
    </>
  )
}
