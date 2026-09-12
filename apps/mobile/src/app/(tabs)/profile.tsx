import React from "react"
import { Pressable, ScrollView, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Image } from "expo-image"
import Constants from "expo-constants"
import Svg, { Circle, Path } from "react-native-svg"
import { useRouter } from "expo-router"
import { useConvexAuth, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { Icon, type IconName } from "@/design/icons"
import { LoABadge } from "@/design/loa-badge"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

type RowProps = {
  icon: React.ReactNode
  l: string
  sub?: string
  right?: React.ReactNode
  danger?: boolean
  onPress?: () => void
  last?: boolean
}

export default function Profile() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { isAuthenticated } = useConvexAuth()
  const skip = isAuthenticated ? {} : ("skip" as const)
  const user = useQuery(api.profile.getCurrentUser, skip)
  const sessions = useQuery(api.sessions.listMine, skip)
  const consents = useQuery(api.oauthConsents.listMine, skip)
  const documents = useQuery(api.documents.listMine, skip)
  const [signingOut, setSigningOut] = React.useState(false)

  function Row({ icon, l, sub, right, danger, onPress, last }: RowProps) {
    return (
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: t.borderSoft,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: t.surface2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: danger ? "#B83A3A" : t.ink,
            }}
          >
            {l}
          </Text>
          {sub ? (
            <Text style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>
              {sub}
            </Text>
          ) : null}
        </View>
        {right ?? <Icon name="arrow" size={16} color={t.muted} />}
      </Pressable>
    )
  }
  const IconG = (name: IconName) => (
    <Icon name={name} size={18} color={idnTokens.green} />
  )
  const Group = ({
    children,
    mt = 0,
  }: {
    children: React.ReactNode
    mt?: number
  }) => (
    <View
      style={{
        marginTop: mt,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.border,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  )
  const SectionLabel = ({
    children,
    mt = 12,
  }: {
    children: React.ReactNode
    mt?: number
  }) => (
    <Text
      style={{
        fontSize: 10,
        color: t.muted,
        letterSpacing: 1.4,
        fontWeight: "600",
        paddingTop: mt,
        paddingBottom: 6,
        paddingHorizontal: 4,
      }}
    >
      {children}
    </Text>
  )

  const profile = user?.profile
  const prenom = profile?.pivot?.firstName ?? "—"
  const nom = profile?.pivot?.lastName ?? ""
  const initials = `${prenom[0] ?? "?"}${nom[0] ?? ""}`.toUpperCase()
  const profileType = profile?.profileType ?? ""
  const profileLabel =
    profileType === "citizen"
      ? "Citoyen Gabonais"
      : profileType === "resident"
        ? "Résident étranger"
        : profileType === "visitor"
          ? "Visiteur"
          : profileType === "developer"
            ? "Développeur"
            : "—"
  const loa = (profile?.loa ?? 1) as 1 | 2 | 3
  const idnId = profile?.idnId ?? "—"
  const sessionsCount = sessions?.length ?? 0
  const consentsCount = consents?.length ?? 0
  const documentsCount = documents?.length ?? 0

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      await authClient.signOut()
    } catch {
      // ignore
    } finally {
      router.replace("/(auth)/hub")
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: 14 }}>
        <Text
          style={{
            fontSize: 30,
            fontWeight: "700",
            color: t.ink,
            letterSpacing: -0.6,
            lineHeight: 33,
          }}
        >
          Profil
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 4,
          paddingBottom: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Group>
          <Pressable
            onPress={() => router.push("/profile-edit" as never)}
            style={{
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <LinearGradient
              colors={["#0E7C3A", "#0A5C2C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {profile?.photoUrl ? (
                <Image
                  source={{ uri: profile.photoUrl }}
                  style={{ width: "100%", height: "100%", borderRadius: 14 }}
                  contentFit="cover"
                />
              ) : (
                <Text
                  style={{ color: "#fff", fontWeight: "600", fontSize: 18 }}
                >
                  {initials}
                </Text>
              )}
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "600", color: t.ink }}>
                {prenom} {nom}
              </Text>
              <Text style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                {profileLabel}
              </Text>
              <View style={{ marginTop: 6 }}>
                <LoABadge level={loa} t={t} compact />
              </View>
            </View>
            <Icon name="arrow" size={16} color={t.muted} />
          </Pressable>
        </Group>

        <SectionLabel mt={6}>SÉCURITÉ</SectionLabel>
        <Group>
          <Row
            icon={IconG("lock")}
            l="Code PIN"
            sub="Modifier votre code à 6 chiffres"
            onPress={() => router.push("/settings/security")}
          />
          <Row
            icon={IconG("shield")}
            l="Authentification 2FA"
            sub="SMS, TOTP, clé matérielle"
            onPress={() => router.push("/settings/security")}
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M5 11c0-3 3-7 7-7s7 4 7 7"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <Path
                  d="M9 13c.5-1.5 2-2 3-2s2.5.5 3 2v2"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <Path
                  d="M12 15v5M5 16c0 3 3 4 7 4"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l="Biométrie"
            sub="Face ID, Touch ID ou équivalent"
            onPress={() => router.push("/settings/security")}
            last
          />
        </Group>

        <SectionLabel>COMPTE</SectionLabel>
        <Group>
          <Row
            icon={IconG("edit")}
            l="Modifier mon profil"
            sub="Photo et identité pivot"
            onPress={() => router.push("/profile-edit" as never)}
          />
          <Row
            icon={IconG("doc")}
            l="Mes documents"
            sub={`${documentsCount} document${documentsCount > 1 ? "s" : ""} stocké${documentsCount > 1 ? "s" : ""}`}
            onPress={() => router.push("/settings/documents" as never)}
          />
          <Row
            icon={IconG("activity")}
            l="Activité"
            sub="Tous les événements de votre compte"
            onPress={() => router.push("/activity")}
          />
          <Row
            icon={IconG("shield")}
            l="Consentements"
            sub={`${consentsCount} application${consentsCount > 1 ? "s" : ""} autorisée${consentsCount > 1 ? "s" : ""}`}
            onPress={() => router.push("/consents" as never)}
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M3 6h18l-2 14H5z"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinejoin="round"
                />
                <Path
                  d="M9 10v6M15 10v6"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
              </Svg>
            }
            l="Appareils & sessions"
            sub={`${sessionsCount} session${sessionsCount > 1 ? "s" : ""} active${sessionsCount > 1 ? "s" : ""}`}
            onPress={() => router.push("/settings/sessions")}
            last
          />
        </Group>

        <SectionLabel>PRÉFÉRENCES</SectionLabel>
        <Group>
          <Row
            icon={IconG("bell")}
            l="Centre de notifications"
            onPress={() => router.push("/notifications")}
          />
          <Row
            icon={IconG("bell")}
            l="Préférences de notification"
            onPress={() =>
              router.push("/settings/notification-preferences" as never)
            }
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={12}
                  cy={12}
                  r={9}
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
                <Path
                  d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
              </Svg>
            }
            l="Langue"
            onPress={() => router.push("/settings/language")}
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={12}
                  cy={12}
                  r={4}
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
                <Path
                  d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l="Apparence"
            sub="Clair, sombre ou système"
            onPress={() => router.push("/settings/appearance" as never)}
            last
          />
        </Group>

        <SectionLabel>DONNÉES</SectionLabel>
        <Group>
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M12 3v14M6 11l6 6 6-6M4 21h16"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l="Télécharger mes données"
            onPress={() => router.push("/settings/privacy")}
          />
          <Row
            icon={IconG("shield")}
            l="Confidentialité"
            onPress={() => router.push("/settings/privacy")}
            last
          />
        </Group>

        <Group mt={12}>
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={12}
                  cy={12}
                  r={9}
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
                <Path
                  d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l="Aide & support"
            onPress={() => router.push("/settings/support" as never)}
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Circle
                  cx={12}
                  cy={12}
                  r={9}
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                />
                <Path
                  d="M12 8v5M12 16h.01"
                  stroke={idnTokens.green}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l="À propos d'IDN"
            sub={`v${Constants.expoConfig?.version ?? "1.0.0"}`}
            onPress={() => router.push("/settings/about")}
          />
          <Row
            icon={IconG("download")}
            l="Mises à jour"
            sub="Rechercher et installer les dernières corrections"
            onPress={() => router.push("/settings/updates" as never)}
          />
          <Row
            icon={
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"
                  stroke="#B83A3A"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
                <Path
                  d="M14 17l5-5-5-5M9 12h10"
                  stroke="#B83A3A"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                />
              </Svg>
            }
            l={signingOut ? "Déconnexion…" : "Se déconnecter"}
            danger
            onPress={signOut}
            last
          />
        </Group>

        <Text
          style={{
            textAlign: "center",
            fontSize: 11,
            color: t.mutedSoft,
            paddingVertical: 12,
            fontFamily: idnTokens.mono,
          }}
        >
          ID IDN · {idnId}
        </Text>
      </ScrollView>
    </View>
  )
}
