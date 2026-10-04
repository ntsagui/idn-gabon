"use client"

import { useEffect, useState } from "react"

/**
 * Horloge rafraîchie périodiquement : les dates relatives (« il y a 3 min »,
 * « expire dans 12 min ») restent justes sans recharger la page.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
