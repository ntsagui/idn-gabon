import React from "react"
import { useConvexAuth } from "convex/react"
import { useRouter, useSegments } from "expo-router"

const PUBLIC_ROOTS = new Set(["(auth)", "index", "launcher"])

export function AuthRouteGuard() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const router = useRouter()
  const segments = useSegments() as string[]
  const root = segments[0] ?? "index"

  React.useEffect(() => {
    if (isLoading || isAuthenticated) return
    if (!PUBLIC_ROOTS.has(root)) router.replace("/(auth)/hub")
  }, [isAuthenticated, isLoading, root, router])

  return null
}
