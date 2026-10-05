"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

const LS_KEY = "idn:icv:active-cv-id"

/**
 * Sélection du CV actif persistée dans le navigateur (apps/mobile/src/hooks/use-active-cv.ts).
 * Repli : CV principal, puis premier CV.
 */
export function useActiveCv() {
  const cvs = useQuery(api.cv.cvs.listMine)
  const [storedId, setStoredId] = useState<Id<"citizenCv"> | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_KEY)
      if (raw) setStoredId(raw as Id<"citizenCv">)
    } catch {
      // Stockage indisponible (navigation privée) : repli sur le CV principal.
    }
    setHydrated(true)
  }, [])

  const activeCvId = useMemo<Id<"citizenCv"> | null>(() => {
    if (!cvs || cvs.length === 0) return null
    if (storedId && cvs.some((c) => c._id === storedId)) return storedId
    const def = cvs.find((c) => c.isDefault)
    return def?._id ?? cvs[0]!._id
  }, [cvs, storedId])

  const activeCv = useMemo(() => cvs?.find((c) => c._id === activeCvId) ?? null, [cvs, activeCvId])

  const setActiveCvId = useCallback((id: Id<"citizenCv">) => {
    try {
      window.localStorage.setItem(LS_KEY, id)
    } catch {
      // ignoré : la session retombera sur le CV principal.
    }
    setStoredId(id)
  }, [])

  return { cvs, activeCvId, activeCv, setActiveCvId, isLoading: !hydrated || cvs === undefined }
}
