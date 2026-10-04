import { notFound } from "next/navigation"

import { docsMetadata, DOCS_DESCRIPTION } from "../../../lib/seo"
import { ARTICLE_COMPONENTS } from "../_articles"
import DocsHome from "../_articles/home"
import { ARTICLES } from "../_articles/meta"
import { DocPage } from "../_components/doc-page"

interface PageProps {
  params: Promise<{ slug?: string[] }>
}

export function generateStaticParams() {
  return [{ slug: [] }, ...ARTICLES.map((a) => ({ slug: [a.slug] }))]
}

export default async function DocsRoute({ params }: PageProps) {
  const { slug } = await params
  const key = slug?.[0]
  if (!key) return <DocsHome />
  const Article = ARTICLE_COMPONENTS[key]
  if (!Article || slug.length > 1) notFound()
  return (
    <DocPage slug={key}>
      <Article />
    </DocPage>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const key = slug?.[0]
  if (!key) {
    return docsMetadata({ title: "Documentation", description: DOCS_DESCRIPTION, path: "/docs" })
  }
  const meta = ARTICLES.find((a) => a.slug === key)
  if (!meta) return { title: "Article introuvable", robots: { index: false, follow: false } }
  return docsMetadata({ title: meta.title, description: meta.description, path: `/docs/${meta.slug}` })
}
