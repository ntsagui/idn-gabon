import type { MetadataRoute } from "next"

import { ARTICLES } from "./docs/_articles/meta"
import { absoluteUrl } from "../lib/seo"

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: absoluteUrl("/docs"), lastModified, changeFrequency: "weekly", priority: 1.0 },
    ...ARTICLES.map((article) => ({
      url: absoluteUrl(`/docs/${article.slug}`),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ]
}
