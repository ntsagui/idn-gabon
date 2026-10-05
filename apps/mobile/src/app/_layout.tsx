import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ConvexReactClient, useConvexAuth, useQuery } from "convex/react"
import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { useFonts } from "expo-font"
import { StatusBar } from "expo-status-bar"
import React, { StrictMode } from "react"
import { LogBox } from "react-native"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { KeyboardProvider } from "react-native-keyboard-controller"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AuthRouteGuard } from "@/components/auth-route-guard"
import { ThemePreferenceProvider, useThemePreference } from "@/design/theme"
import { authClient } from "@/lib/auth-client"
import { api } from "@/lib/api"
import { MobilePushBootstrap } from "@/components/mobile-push-bootstrap"
import { registerLiveKitGlobals } from "@/lib/livekit-globals"
import { IDN_FONTS } from "@/design/text"
import { RootErrorBoundary } from "@/components/root-error-boundary"

registerLiveKitGlobals()
// Avertissement de développement émis par react-native-keyboard-controller
// (findNodeHandle sous StrictMode) : tiers, sans effet en production. Masqué
// de la LogBox seulement, il reste affiché dans la console Metro.
LogBox.ignoreLogs(["findHostInstance_DEPRECATED"])
void SplashScreen.preventAutoHideAsync()

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL in apps/mobile/.env.local")
}

// `expectAuth` est volontairement omis : il suspend TOUTES les useQuery
// jusqu'à ce que setAuth() ait été appelé, ce qui bloque les écrans
// pre-auth comme signup/idn (vérification de handle, suggestions). Les
// queries qui exigent l'auth utilisent déjà `requireAuth` côté backend
// et throw si appelées non-authentifié — ce qui est le comportement
// attendu et géré par les écrans appelants.
const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
})

// Session révoquée ou erreur de rendu : jamais d’écran rouge en production.
export const ErrorBoundary = RootErrorBoundary

export default function RootLayout() {
  // Les polices IBM Plex sont embarquées par le plugin expo-font ; le
  // chargement ici couvre le dev client et les mises à jour OTA. Une police
  // manquante ne doit jamais bloquer l'app : on continue en police système.
  const [fontsLoaded, fontError] = useFonts(IDN_FONTS)
  const ready = fontsLoaded || !!fontError
  React.useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])
  if (!ready) return null
  return (
    <StrictMode>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <ThemePreferenceProvider>
          <PreferenceSync />
          <MobilePushBootstrap />
          <AuthRouteGuard />
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <SafeAreaProvider>
                  <ThemedStatusBar />
                  <Stack
                    screenOptions={{ headerShown: false, animation: "default" }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen
                      name="launcher"
                      options={{ animation: "fade" }}
                    />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="id-card" />
                    <Stack.Screen
                      name="scanner"
                      options={{ presentation: "fullScreenModal" }}
                    />
                    <Stack.Screen name="consent" />
                    <Stack.Screen name="notifications" />
                    <Stack.Screen name="service/[id]" />
                    <Stack.Screen name="kyc" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="idoc" />
                    <Stack.Screen name="icv" />
                    <Stack.Screen name="services" />
                    <Stack.Screen name="activity" />
                    <Stack.Screen name="consents" />
                    <Stack.Screen name="profile-edit" />
                  </Stack>
                </SafeAreaProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
        </ThemePreferenceProvider>
      </ConvexBetterAuthProvider>
    </StrictMode>
  )
}

function ThemedStatusBar() {
  const { dark } = useThemePreference()
  return <StatusBar style={dark ? "light" : "dark"} />
}

function PreferenceSync() {
  const { isAuthenticated } = useConvexAuth()
  const preferences = useQuery(
    api.preferences.getMyPreferences,
    isAuthenticated ? {} : "skip",
  )
  const { hydrated, preference, setPreference } = useThemePreference()
  const didHydrateRemotePreference = React.useRef(false)

  React.useEffect(() => {
    if (!isAuthenticated) {
      didHydrateRemotePreference.current = false
      return
    }
    if (hydrated && !didHydrateRemotePreference.current && preferences?.theme) {
      didHydrateRemotePreference.current = true
      if (preferences.theme !== preference)
        void setPreference(preferences.theme)
    }
  }, [hydrated, isAuthenticated, preference, preferences?.theme, setPreference])
  return null
}
