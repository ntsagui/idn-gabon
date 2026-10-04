"use client"

import { useRouter } from "next/navigation"
import { useConvexAuth } from "convex/react"
import { useEffect } from "react"

/** Un développeur déjà connecté arrive directement sur ses applications. */
export function RedirectIfSignedIn({ to = "/applications" }: { to?: string }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const router = useRouter()
  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(to)
  }, [isAuthenticated, isLoading, router, to])
  return null
}
