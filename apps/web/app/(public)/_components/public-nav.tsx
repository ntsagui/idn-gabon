"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { cn } from "@repo/ui/lib/utils"

import { UserMenu } from "@/app/_components/user-menu"

import { navActions, navTabs } from "../_content/fr"

const SIGN_IN_URL = "/sign-in"
const SIGN_UP_URL = "/sign-up"

export function PublicNav({ className }: { className?: string }) {
  const pathname = usePathname()
  const me = useQuery(api.profile.getCurrentUser)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
        className,
      )}
    >
      <div className="mx-auto flex h-15 min-h-[60px] max-w-[1180px] items-center gap-4 px-4 md:gap-7 md:px-7">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          aria-label={`${navActions.brand} — Accueil`}
        >
          <IdnMark size={26} />
          <span className="hidden whitespace-nowrap text-sm font-semibold text-foreground sm:inline">
            {navActions.brand}
          </span>
        </Link>

        <nav
          className="ml-2 hidden items-center gap-1 lg:flex"
          aria-label="Navigation principale"
        >
          {navTabs.map((tab) => {
            const active = isActive(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3.5 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-idn-green-soft font-semibold text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2">
          {me === undefined ? (
            // Loading : placeholder discret pour éviter le flash CTA → user menu
            <div
              aria-hidden="true"
              className="size-9 animate-pulse rounded-[10px] bg-secondary"
            />
          ) : me === null ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link href={SIGN_IN_URL}>{navActions.signIn}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href={SIGN_UP_URL}>{navActions.signUp}</Link>
              </Button>
            </>
          ) : (
            <UserMenu user={me} />
          )}
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-border px-4 py-2 lg:hidden"
        aria-label="Navigation principale (mobile)"
      >
        {navTabs.map((tab) => {
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "bg-idn-green-soft font-semibold text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                  : "text-foreground/80 hover:bg-secondary",
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
