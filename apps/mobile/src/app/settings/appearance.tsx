import React from "react"
import { Pressable, View } from "react-native"
import { Text } from "@/design/text"
import { useRouter } from "expo-router"
import { useMutation } from "convex/react"

import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Card, ErrorNote, Note } from "@/design/components/list"
import { Icon } from "@/design/icons"
import {
  useIdnTheme,
  useThemePreference,
  type ThemePreference,
} from "@/design/theme"
import { api } from "@/lib/api"

const OPTIONS: { id: ThemePreference; label: string; sub: string }[] = [
  { id: "auto", label: "Système", sub: "Suit automatiquement le réglage du téléphone" },
  { id: "light", label: "Clair", sub: "Fond clair en permanence" },
  { id: "dark", label: "Sombre", sub: "Fond sombre en permanence" },
]

export default function Appearance() {
  const t = useIdnTheme()
  const router = useRouter()
  const { preference, setPreference } = useThemePreference()
  const update = useMutation(api.preferences.updateMyPreferences)
  const [updating, setUpdating] = React.useState<ThemePreference | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  async function choose(next: ThemePreference) {
    if (next === preference) return
    const previous = preference
    setUpdating(next)
    setError(null)
    await setPreference(next)
    try {
      await update({ theme: next })
    } catch (caught) {
      await setPreference(previous)
      setError(
        caught instanceof Error ? caught.message : "Mise à jour impossible.",
      )
    } finally {
      setUpdating(null)
    }
  }

  return (
    <Screen header={<AppBar title="Apparence" onBack={() => router.back()} />}>
      <Text style={{ marginTop: 16, fontSize: 14, lineHeight: 20, color: t.muted }}>
        Choisis le thème de l’application.
      </Text>
      <Card style={{ marginTop: 16 }}>
        {OPTIONS.map((option) => {
          const selected = option.id === preference
          return (
            <Pressable
              key={option.id}
              onPress={() => void choose(option.id)}
              disabled={updating !== null}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: updating !== null, busy: updating === option.id }}
              accessibilityLabel={`${option.label}. ${option.sub}`}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: t.ink, lineHeight: 19 }}>{option.label}</Text>
                <Text style={{ fontSize: 13, color: t.muted, lineHeight: 18 }}>{option.sub}</Text>
              </View>
              {selected ? (
                <Icon name="checkCir" size={22} color={t.greenText} />
              ) : (
                <View style={{ width: 22, height: 22, borderRadius: 9999, borderWidth: 1.5, borderColor: t.border }} />
              )}
            </Pressable>
          )
        })}
      </Card>
      <Note>Ton choix est enregistré sur ton compte et retrouvé à ta prochaine connexion.</Note>
      <ErrorNote>{error}</ErrorNote>
    </Screen>
  )
}
