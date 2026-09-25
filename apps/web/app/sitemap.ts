import type { MetadataRoute } from "next"

import { absoluteUrl } from "../lib/seo"

interface RouteConfig {
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}

const ROUTES: RouteConfig[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/about", changeFrequency: "monthly", priority: 0.8 },
  { path: "/souverainete", changeFrequency: "monthly", priority: 0.8 },
  { path: "/services", changeFrequency: "weekly", priority: 0.9 },
  { path: "/admins", changeFrequency: "monthly", priority: 0.7 },
  { path: "/help", changeFrequency: "monthly", priority: 0.8 },
  { path: "/legal", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.6 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/mentions", changeFrequency: "yearly", priority: 0.4 },
  { path: "/legal/accessibilite", changeFrequency: "yearly", priority: 0.4 },
  { path: "/legal/delete-account", changeFrequency: "yearly", priority: 0.5 },
  { path: "/legal/licenses", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/status", changeFrequency: "monthly", priority: 0.4 },
  { path: "/verifier", changeFrequency: "yearly", priority: 0.5 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  }))
}
