"use client"

import { useRouter } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { useEffect, type ReactNode } from "react"

import { IdnMark } from "@repo/ui/components/idn-mark"

import { DeveloperBootstrap, useDeveloperReady } from "../_components/developer-bootstrap"
import { Shell } from "../_components/shell"

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const router = useRouter()
  const ready = useDeveloperReady()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/sign-in")
  }, [isLoading, isAuthenticated, router])

  if (isLoading || !isAuthenticated || !ready) {
    return (
      <div role="status" aria-live="polite" className="grid min-h-svh place-items-center bg-idn-bg">
        <DeveloperBootstrap />
        <div className="flex flex-col items-center gap-3">
          <IdnMark size={36} />
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            Ouverture du portail…
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-idn-green focus:px-4 focus:py-2 focus:text-white"
      >
        Aller au contenu principal
      </a>
      <Shell>{children}</Shell>
    </>
  )
}
