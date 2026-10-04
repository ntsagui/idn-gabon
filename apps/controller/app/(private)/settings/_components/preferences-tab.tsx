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

import { describeError } from "../../../_lib/errors"
import { settings } from "./content"
import {
  SettingsRow,
  SettingsSection,
} from "./settings-section"

export function PreferencesTab() {
  const prefs = useQuery(api.preferences.getMyPreferences)
  const update = useMutation(api.preferences.updateMyPreferences)
  const { theme, setTheme } = useTheme()

  const onLanguageChange = async (lang: "fr" | "en") => {
    try {
      await update({ language: lang })
      toast.success(settings.preferences.saveSuccessToast)
    } catch (err) {
      toast.error(describeError(err, "Préférence non enregistrée. Réessayez."))
    }
  }

  const onThemeChange = async (t: "light" | "dark" | "auto") => {
    setTheme(t === "auto" ? "system" : t)
    try {
      await update({ theme: t })
      toast.success(settings.preferences.saveSuccessToast)
    } catch (err) {
      toast.error(describeError(err, "Préférence non enregistrée. Réessayez."))
    }
  }

  if (prefs === undefined) {
    return <div className="h-32 animate-pulse rounded-xl bg-secondary" />
  }

  const currentLang = prefs?.language ?? "fr"
  const currentTheme =
    theme === "system"
      ? "auto"
      : ((theme ?? prefs?.theme ?? "auto") as "light" | "dark" | "auto")

  return (
    <SettingsSection
      title={settings.preferences.title}
      sub={settings.preferences.sub}
    >
      <SettingsRow
        label={settings.preferences.language.label}
        description={settings.preferences.language.description}
        trailing={
          <Select
            value={currentLang}
            onValueChange={(v) => void onLanguageChange(v as "fr" | "en")}
          >
            <SelectTrigger className="!h-10 w-40 !text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.preferences.language.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <SettingsRow
        label={settings.preferences.theme.label}
        description={settings.preferences.theme.description}
        trailing={
          <Select
            value={currentTheme}
            onValueChange={(v) =>
              void onThemeChange(v as "light" | "dark" | "auto")
            }
          >
            <SelectTrigger className="!h-10 w-40 !text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.preferences.theme.options.map((opt) => (
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
