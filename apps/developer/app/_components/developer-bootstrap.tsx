"use client"

import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useEffect, useRef } from "react"

import { api } from "@repo/backend/convex/_generated/api"

/**
 * Activation libre-service du rôle « developer » au premier accès.
 *
 * `ensureRole` exige un JWT Convex valide. Juste après `signIn.email`, la
 * session Better Auth existe mais le JWT Convex n'est pas encore récupéré :
 * appeler la mutation à ce moment échoue en UNAUTHENTICATED. On attend donc
 * la sentinelle `developer/apps.me` (query) : Convex ne la sert avec
 * `authenticated: true` qu'une fois le jeton propagé au client.
 */
function useDeveloperStatus() {
  const { isAuthenticated } = useConvexAuth()
  return useQuery(api.developer.apps.me, isAuthenticated ? {} : "skip")
}

/** Vrai quand le jeton est prêt et que le rôle développeur est en place. */
export function useDeveloperReady(): boolean {
  const me = useDeveloperStatus()
  return Boolean(me?.authenticated && me.hasDeveloperRole)
}

export function DeveloperBootstrap() {
  const me = useDeveloperStatus()
  const ensureRole = useMutation(api.developer.apps.ensureRole)
  const triggered = useRef(false)

  useEffect(() => {
    if (!me?.authenticated || me.hasDeveloperRole || triggered.current) return
    triggered.current = true
    ensureRole({}).catch(() => {
      // Nouvelle tentative au prochain changement de la sentinelle.
      triggered.current = false
    })
  }, [ensureRole, me])

  return null
}
