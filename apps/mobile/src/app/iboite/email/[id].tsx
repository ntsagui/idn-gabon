import React, { useEffect } from "react"
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { NSheetHeader } from "@/components/chrome/sheet-header"
import { Icon, type IconName } from "@/design/icons"
import { api } from "@/lib/api"
import { EmailHtmlView } from "@/components/mailbox/email-html-view"
import { EmailTextBody } from "@/components/mailbox/email-text-body"

type Action = {
  icon: IconName
  l: string
  primary?: boolean
  danger?: boolean
  onPress: () => void
  onLongPress?: () => void
}

export default function EmailDetail() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useConvexAuth()
  const convex = useConvex()
  const email = useQuery(
    api.iboite.messages.get,
    isAuthenticated && id ? { messageId: id as never } : "skip",
  )
  const markRead = useMutation(api.iboite.messages.markRead)
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const move = useMutation(api.iboite.messages.move)

  useEffect(() => {
    if (email && !email.isRead) {
      void markRead({ messageId: email._id as never }).catch(() => {})
    }
  }, [email, markRead])

  if (email === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: t.bg,
          paddingTop: insets.top,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: t.muted, fontSize: 13 }}>Chargement…</Text>
      </View>
    )
  }
  if (!email) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <NSheetHeader t={t} title="Message" onBack={() => router.back()} />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: t.muted, fontSize: 13 }}>
            Message introuvable.
          </Text>
        </View>
      </View>
    )
  }

  const date = new Date(email.createdAt).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  async function onDelete() {
    try {
      await move({ messageId: id as never, target: "trash" })
      router.back()
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Action impossible.",
      )
    }
  }

  /**
   * Ouvre une pièce jointe : on récupère l'URL signée à la demande via
   * `messages.attachmentUrl` (authz par ownership) puis on la déporte au
   * navigateur natif (Linking.openURL), qui gère l'aperçu / le partage.
   */
  async function openAttachment(attachmentId: string) {
    try {
      const url = await convex.query(api.iboite.messages.attachmentUrl, {
        attachmentId: attachmentId as never,
      })
      if (!url) {
        Alert.alert("Erreur", "Pièce jointe introuvable.")
        return
      }
      await Linking.openURL(url)
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Ouverture impossible.",
      )
    }
  }

  // Plus de bricolage URL : on passe `replyToId` au compose qui ira lire le
  // message d'origine via Convex et pré-remplira destinataire/objet/citation.
  const replyHref = `/iboite/compose?replyToId=${id}`
  const replyAllHref = `/iboite/compose?replyToId=${id}&mode=replyAll`
  const fwdHref = `/iboite/compose?replyToId=${id}&mode=forward`

  /**
   * Bouton Répondre : tap court = Répondre. Long press / iOS = menu
   * Répondre / Répondre à tous. Pas de dropdown custom — on s'appuie sur
   * `ActionSheetIOS` natif (iOS) et `Alert.alert` (Android), pour rester
   * sans dépendance externe.
   */
  function openReplyMenu() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Répondre", "Répondre à tous"],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) router.push(replyHref as never)
          else if (idx === 2) router.push(replyAllHref as never)
        },
      )
    } else {
      Alert.alert("Répondre", undefined, [
        { text: "Répondre", onPress: () => router.push(replyHref as never) },
        {
          text: "Répondre à tous",
          onPress: () => router.push(replyAllHref as never),
        },
        { text: "Annuler", style: "cancel" },
      ])
    }
  }

  async function onArchive() {
    try {
      await move({ messageId: id as never, target: "archive" })
      router.back()
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Action impossible.",
      )
    }
  }

  const actions: Action[] = [
    {
      icon: "reply",
      l: "Répondre",
      primary: true,
      onPress: () => router.push(replyHref as never),
      onLongPress: openReplyMenu,
    },
    {
      icon: "forward",
      l: "Transférer",
      onPress: () => router.push(fwdHref as never),
    },
    { icon: "archive", l: "Archiver", onPress: onArchive },
    { icon: "trash", l: "Suppr.", danger: true, onPress: onDelete },
  ]

  const isAdmin = email.senderKind === "admin"

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <NSheetHeader
        t={t}
        title="Message"
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={async () => {
              try {
                await toggleStar({ messageId: id as never })
              } catch {
                /* ignore */
              }
            }}
            style={{ padding: 4 }}
          >
            <Icon
              name={email.isStarred ? "star" : "starO"}
              size={18}
              color={email.isStarred ? idnTokens.yellow : t.muted}
            />
          </Pressable>
        }
      />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 14,
          paddingBottom: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "700",
            color: t.ink,
            letterSpacing: -0.3,
            lineHeight: 24,
          }}
        >
          {email.subject}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            marginTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: t.borderSoft,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: isAdmin ? "#3b82f6" : "#10b981",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name={isAdmin ? "building" : "user"} size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.ink }}>
              {email.senderName}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: t.muted,
                fontFamily: idnTokens.mono,
              }}
            >
              {email.senderEmail}
            </Text>
            <Text style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>
              À : {email.recipientEmail} · {date}
            </Text>
          </View>
        </View>
        <View
          style={{
            marginTop: 14,
            overflow: "hidden",
            borderRadius: 12,
            backgroundColor: t.surface,
          }}
        >
          {email.bodyHtml ? (
            <EmailHtmlView html={email.bodyHtml} />
          ) : (
            <EmailTextBody text={email.body} t={t} />
          )}
        </View>
        {email.attachments.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <Text
              style={{
                fontSize: 10,
                color: t.muted,
                letterSpacing: 1.2,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              PIÈCES JOINTES
            </Text>
            <View style={{ gap: 6 }}>
              {email.attachments.map((a) => (
                <Pressable
                  key={a._id}
                  onPress={() => openAttachment(a._id)}
                  accessibilityLabel={`Ouvrir ${a.name}`}
                  style={{
                    padding: 12,
                    backgroundColor: t.surface,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon name="paper" size={18} color={t.ink2} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12, color: t.ink, fontWeight: "500" }}
                    >
                      {a.name}
                    </Text>
                    <Text
                      style={{ fontSize: 10, color: t.muted, marginTop: 1 }}
                    >
                      {Math.max(1, Math.round(a.size / 1024))} KB
                    </Text>
                  </View>
                  <Icon name="download" size={16} color={t.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: t.borderSoft,
          backgroundColor: t.surface,
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          flexDirection: "row",
          gap: 4,
        }}
      >
        {actions.map((a, i) => (
          <Pressable
            key={i}
            onPress={a.onPress}
            onLongPress={a.onLongPress}
            delayLongPress={300}
            style={{
              flex: 1,
              paddingVertical: 8,
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon
              name={a.icon}
              size={18}
              color={
                a.primary ? idnTokens.green : a.danger ? "#B83A3A" : t.ink2
              }
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: "500",
                color: a.primary
                  ? idnTokens.green
                  : a.danger
                    ? "#B83A3A"
                    : t.ink2,
              }}
            >
              {a.l}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
