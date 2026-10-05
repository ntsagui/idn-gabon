"use client"

import * as React from "react"
import { useQuery } from "convex/react"
import { useTheme } from "next-themes"

import { api } from "@repo/backend/convex/_generated/api"

/**
 * Applique, une fois par connexion, le thème enregistré sur le compte
 * (`PreferenceSync` de apps/mobile/src/app/_layout.tsx) : un choix fait sur un
 * autre appareil est retrouvé ici. Ne rend rien ; à monter une seule fois
 * dans la coquille citoyenne (`(citizen)/layout.tsx`).
 */
export function PreferenceSync() {
  const preferences = useQuery(api.preferences.getMyPreferences)
  const { theme, setTheme } = useTheme()
  const done = React.useRef(false)

  React.useEffect(() => {
    if (done.current || !preferences?.theme) return
    done.current = true
    const wanted = preferences.theme === "auto" ? "system" : preferences.theme
    if (wanted !== theme) setTheme(wanted)
  }, [preferences?.theme, theme, setTheme])

  return null
}
