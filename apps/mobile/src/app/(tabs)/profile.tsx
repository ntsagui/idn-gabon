import React from "react"
import { Alert, Pressable, View } from "react-native"
import { Image } from "expo-image"
import { useFocusEffect, useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { Text } from "@/design/text"
import { useIdnTheme } from "@/design/theme"
import { AppBar } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { LevelBadge, Badge } from "@/design/components/badge"
import { Card, Row, SectionTitle } from "@/design/components/list"
import { IdnButton } from "@/design/components/idn-button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { clearLastAccount, initialsOf } from "@/lib/last-account"
import { maskNip } from "@/lib/nip-format"
import { BIOMETRIC_TITLE } from "@/lib/biometric-label"
import { deviceLabel } from "@/lib/device-label"
import { listPasskeys, PasskeyUnavailableError } from "@/lib/passkeys"

function deviceIcon(device: string): "smartphone" | "laptop" | "tablet" {
  const d = device.toLowerCase()
  if (d.includes("ipad") || d.includes("tablet")) return "tablet"
  if (d.includes("iphone") || d.includes("android") || d.includes("mobile")) return "smartphone"
  return "laptop"
}

/** Profil, sécurité et compte (prototype « security »). */
export default function Profile() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const q = isAuthenticated ? {} : ("skip" as const)
  const user = useQuery(api.profile.getCurrentUser, q)
  const sessions = useQuery(api.sessions.listMine, q)
  const consents = useQuery(api.oauthConsents.listMine, q)
  const accounts = useQuery(api.iboite.accounts.listMine, q)
  const revokeSession = useMutation(api.sessions.revoke)
  const revokeConsent = useMutation(api.oauthConsents.revokeForClient)
  const [passkeys, setPasskeys] = React.useState<number | null>(null)
  const [signingOut, setSigningOut] = React.useState(false)

  useFocusEffect(
    React.useCallback(() => {
      let alive = true
      void listPasskeys()
        .then((list) => {
          if (alive) setPasskeys(list.length)
        })
        .catch((err) => alive && setPasskeys(err instanceof PasskeyUnavailableError ? -1 : null))
      return () => {
        alive = false
      }
    }, []),
  )

  const profile = user?.profile
  const pivot = profile?.pivot
  const loa = (profile?.loa ?? 1) as 1 | 2 | 3
  const address = accounts?.[0]
  const residence = address?.isAddressConfigured ? [address.district, address.city].filter(Boolean).join(", ") : null

  function confirmRevokeSession(id: string, device: string) {
    Alert.alert("Déconnecter cet appareil ?", `${device} devra se reconnecter avec ton code PIN.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: () => void revokeSession({ sessionId: id }).catch(() => Alert.alert("Action impossible", "Réessaie.")) },
    ])
  }

  function confirmRevokeConsent(clientId: string, name: string) {
    Alert.alert(`Révoquer l’accès de ${name} ?`, "L’application ne pourra plus lire tes informations. Tu devras l’autoriser à nouveau pour t’y connecter.", [
      { text: "Annuler", style: "cancel" },
      { text: "Révoquer", style: "destructive", onPress: () => void revokeConsent({ clientId }).catch(() => Alert.alert("Action impossible", "Réessaie.")) },
    ])
  }

  function confirmSignOut() {
    Alert.alert("Se déconnecter ?", "Tu devras saisir ton adresse IDN et ton code PIN pour revenir.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true)
          try {
            await authClient.signOut()
          } catch {
            // La session locale est effacée de toute façon par le client.
          }
          await clearLastAccount()
          router.replace("/(auth)/hub")
        },
      },
    ])
  }

  const named = (sessions ?? []).map((s) => ({ ...s, device: deviceLabel(s.device, s.userAgent) }))
  const otherSessions = named.filter((s) => !s.isCurrent)
  const current = named.find((s) => s.isCurrent)

  return (
    <Screen inTabs header={<AppBar title="Sécurité et profil" />}>
      <Pressable
        onPress={() => router.push("/profile-edit" as never)}
        accessibilityRole="button"
        accessibilityLabel="Modifier mon profil"
        style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 20 }}
      >
        <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: t.green, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {profile?.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={{ width: 64, height: 64 }} accessibilityLabel="Photo de profil" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600" }}>{initialsOf(pivot?.firstName, pivot?.lastName, user?.email)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "600", color: t.ink }}>{pivot ? `${pivot.firstName} ${pivot.lastName}` : "…"}</Text>
          <Text numberOfLines={1} style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{user?.email ?? ""}</Text>
          <LevelBadge level={loa} style={{ marginTop: 6 }} />
        </View>
      </Pressable>

      <SectionTitle>Identité</SectionTitle>
      <Card>
        <Row icon="pin" title="NIP" sub={pivot?.nip ? maskNip(pivot.nip) : "Non renseigné"} mono={!!pivot?.nip} chevron onPress={() => router.push("/settings/security")} />
        <Row icon="smartphone" title="Téléphone" sub={pivot?.phone ?? "Non renseigné"} chevron onPress={() => router.push("/profile-edit" as never)} />
        <Row icon="pinLoc" title="Résidence" sub={residence || "À renseigner dans iBoîte"} chevron onPress={() => router.push(address ? ({ pathname: "/iboite/address-setup", params: { accountId: address._id } } as never) : ("/iboite" as never))} />
        <Row icon="idCard" title="Ma carte d’identité" sub="Présenter mon QR" chevron onPress={() => router.push("/id-card")} />
      </Card>

      <SectionTitle>Connexion</SectionTitle>
      <Card>
        <Row
          icon="scanFace"
          title={`${BIOMETRIC_TITLE} et clés d’accès`}
          sub={passkeys === -1 ? "Pas encore disponible sur le service IDN" : passkeys === null ? "Gérer la connexion biométrique" : passkeys === 0 ? "Aucune clé d’accès enregistrée" : `${passkeys} clé${passkeys > 1 ? "s" : ""} d’accès enregistrée${passkeys > 1 ? "s" : ""}`}
          right={passkeys && passkeys > 0 ? <Badge tone="green" icon="check">Activé</Badge> : null}
          chevron
          onPress={() => router.push("/settings/security")}
        />
        <Row icon="lock" title="Changer le code PIN" chevron onPress={() => router.push({ pathname: "/settings/security", params: { action: "pin" } } as never)} />
        <Row icon="smartphone" title="Changer de téléphone" sub="Vérification par SMS du nouveau numéro" chevron onPress={() => router.push("/profile-edit" as never)} />
      </Card>

      <SectionTitle action={sessions && sessions.length > 3 ? "Tout voir" : undefined} onAction={() => router.push("/settings/sessions")}>Appareils</SectionTitle>
      <Card>
        {sessions === undefined ? <Row title="Chargement…" /> : null}
        {current ? <Row icon={deviceIcon(current.device)} tone="green" title={current.device} sub="Cet appareil" /> : null}
        {otherSessions.slice(0, 3).map((s) => (
          <Row
            key={s.id}
            icon={deviceIcon(s.device)}
            title={s.device}
            sub={`Connecté le ${new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`}
            right={
              <Pressable onPress={() => confirmRevokeSession(s.id, s.device)} accessibilityRole="button" accessibilityLabel={`Déconnecter ${s.device}`} hitSlop={8}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: t.redText }}>Déconnecter</Text>
              </Pressable>
            }
          />
        ))}
        {sessions && sessions.length > 0 ? <Row icon="laptop" title="Gérer mes appareils" chevron onPress={() => router.push("/settings/sessions")} /> : null}
      </Card>

      <SectionTitle action={consents && consents.length ? "Tout voir" : undefined} onAction={() => router.push("/consents" as never)}>Apps autorisées</SectionTitle>
      <Card>
        {consents === undefined ? (
          <Row title="Chargement…" />
        ) : consents.length === 0 ? (
          <Row icon="keyRound" title="Aucune application autorisée" sub="Les services où tu te connectes avec IDN apparaîtront ici." />
        ) : (
          consents.slice(0, 4).map((c) => (
            <Row
              key={c.id}
              icon="building"
              tone="blue"
              title={c.appName}
              sub={`Depuis le ${new Date(c.grantedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`}
              right={
                <Pressable onPress={() => confirmRevokeConsent(c.clientId, c.appName)} accessibilityRole="button" accessibilityLabel={`Révoquer ${c.appName}`} hitSlop={8}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: t.redText }}>Révoquer</Text>
                </Pressable>
              }
            />
          ))
        )}
      </Card>

      <SectionTitle>Préférences</SectionTitle>
      <Card>
        <Row icon="bell" title="Notifications" chevron onPress={() => router.push("/settings/notification-preferences" as never)} />
        <Row icon="palette" title="Apparence" chevron onPress={() => router.push("/settings/appearance" as never)} />
        <Row icon="globe" title="Langue" chevron onPress={() => router.push("/settings/language")} />
        <Row icon="activity" title="Journal d’activité" chevron onPress={() => router.push("/activity")} />
        <Row icon="file" title="Mes pièces justificatives" chevron onPress={() => router.push("/settings/documents" as never)} />
      </Card>

      <SectionTitle>Aide et informations</SectionTitle>
      <Card>
        <Row icon="shieldPlain" title="Confidentialité et données" sub="Export de tes données, suppression du compte" chevron onPress={() => router.push("/settings/privacy")} />
        <Row icon="chat" title="Aide et contact" chevron onPress={() => router.push("/settings/support" as never)} />
        <Row icon="refresh" title="Mises à jour de l’application" chevron onPress={() => router.push("/settings/updates" as never)} />
        <Row icon="fingerprint" title="À propos d’Identité Numérique" chevron onPress={() => router.push("/settings/about")} />
      </Card>

      <View style={{ gap: 8, marginTop: 28 }}>
        <IdnButton t={t} variant="ghost" full onPress={confirmSignOut} loading={signingOut}>Se déconnecter</IdnButton>
        <IdnButton t={t} variant="dangerGhost" full onPress={() => router.push({ pathname: "/settings/privacy", params: { action: "delete" } } as never)}>Supprimer mon compte</IdnButton>
      </View>
    </Screen>
  )
}
