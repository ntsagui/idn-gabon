"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { Input } from "@repo/ui/components/input"
import { cn } from "@repo/ui/lib/utils"

import { Icon } from "../../_components/icons"
import { ARTICLE_GROUPS } from "../_articles/meta"

export function DocsSidebar() {
  const pathname = usePathname() ?? ""
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const groups = ARTICLE_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
    ),
  })).filter((g) => g.items.length > 0)

  return (
    <nav aria-label="Sommaire de la documentation" className="space-y-5">
      <div className="relative">
        <Icon name="search" size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-idn-muted" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer les articles"
          aria-label="Filtrer les articles"
          className="h-9 pl-8 text-[13px]"
        />
      </div>
      <Link
        href="/docs"
        aria-current={pathname === "/docs" ? "page" : undefined}
        className={cn(
          "block rounded-[10px] px-2.5 py-1.5 text-sm font-medium",
          pathname === "/docs"
            ? "bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
            : "text-idn-ink-2 hover:bg-idn-surface-2",
        )}
      >
        Vue d&apos;ensemble
      </Link>
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-2.5 pb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((article) => {
              const href = `/docs/${article.slug}`
              const active = pathname === href
              return (
                <li key={article.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-[10px] px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-idn-green",
                      active
                        ? "bg-idn-green-soft font-medium text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                        : "text-idn-ink-2 hover:bg-idn-surface-2 hover:text-idn-ink",
                    )}
                  >
                    {article.title}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      {groups.length === 0 ? <p className="px-2.5 text-[13px] text-idn-muted">Aucun article.</p> : null}
    </nav>
  )
}
