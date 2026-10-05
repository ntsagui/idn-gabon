"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge } from "@/app/_components/idn/badge"
import { Card, Note, Row } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

/** Copie de apps/mobile/src/data/languages.ts (identifiants et libellés). */
const LANGUAGES = [
  { id: "fr", l: "Français" },
  { id: "en", l: "English" },
  { id: "fang", l: "Fang" },
  { id: "myene", l: "Myènè" },
  { id: "punu", l: "Punu" },
  { id: "nzebi", l: "Nzébi" },
] as const

/**
 * Le site n'est traduit qu'en français : aucune autre langue n'est
 * sélectionnable tant que sa traduction n'existe pas (pas de choix sans effet).
 */
const AVAILABLE = "fr"

/** Langue : transposition de apps/mobile/src/app/settings/language.tsx. */
export default function LanguagePage() {
  const prefs = useQuery(api.preferences.getMyPreferences)
  return (
    <Screen header={<AppBar title="Langue" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">L’application est disponible en français. Les autres langues arrivent progressivement.</p>
      <Card className="mt-4">
        {LANGUAGES.map((o) =>
          o.id === AVAILABLE ? (
            <Row key={o.id} title={<span lang="fr">{o.l}</span>} sub="Langue officielle" right={<Badge tone="green" icon="check">Utilisée</Badge>} />
          ) : (
            <Row key={o.id} title={o.id === "en" ? <span lang="en">{o.l}</span> : o.l} right={<Badge tone="neutral">Bientôt</Badge>} />
          )
        )}
      </Card>
      {prefs?.language && prefs.language !== AVAILABLE ? (
        <Note>Ton compte indique l’anglais comme langue préférée. L’application reste en français tant que cette traduction n’est pas disponible.</Note>
      ) : null}
    </Screen>
  )
}
