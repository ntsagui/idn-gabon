"use client"

import { useMutation, useQuery } from "convex/react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

import { fr } from "../../../_content/fr"
import {
  SettingsRow,
  SettingsSection,
} from "../../../_components/settings-section"

/**
 * Affichage de la console. Seul le thème est proposé : la console n'existe
 * qu'en français, un sélecteur de langue n'y changerait rien.
 */
export function PreferencesTab() {
  const prefs = useQuery(api.preferences.getMyPreferences)
  const update = useMutation(api.preferences.updateMyPreferences)
  const { theme, setTheme } = useTheme()

  const onThemeChange = async (t: "light" | "dark" | "auto") => {
    setTheme(t === "auto" ? "system" : t)
    try {
      await update({ theme: t })
      toast.success("Thème enregistré.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.")
    }
  }

  if (prefs === undefined) {
    return <div className="adm-skeleton h-32" />
  }

  const currentTheme =
    theme === "system"
      ? "auto"
      : ((theme ?? prefs?.theme ?? "auto") as "light" | "dark" | "auto")

  return (
    <SettingsSection title="Affichage" sub="Apparence de la console sur cet appareil.">
      <SettingsRow
        label={fr.settings.preferences.theme.label}
        description={fr.settings.preferences.theme.description}
        trailing={
          <Select
            value={currentTheme}
            onValueChange={(v) => void onThemeChange(v as "light" | "dark" | "auto")}
          >
            <SelectTrigger aria-label={fr.settings.preferences.theme.label} className="!h-9 w-40 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="shadow-none">
              {fr.settings.preferences.theme.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </SettingsSection>
  )
}
