import React, { useEffect, useState } from "react"
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/design/text";
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { NSheetHeader } from "@/components/chrome/sheet-header"
import { Icon } from "@/design/icons"
import { IconButton } from "@/design/components/app-bar"
import { SenderAvatar, VerifiedBadge } from "@/components/mailbox/sender-avatar"
import { formatListTime } from "@/lib/iboite-adapter"
import { api } from "@/lib/api"
import { EmailHtmlView } from "@/components/mailbox/email-html-view"
import { EmailTextBody } from "@/components/mailbox/email-text-body"

const FOLDER_LABEL: Record<string, string> = {
  inbox: "Réception",
  archive: "Archives",
  sent: "Envoyés",
  trash: "Corbeille",
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
  const [showDetails, setShowDetails] = useState(false)

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

  function openMore() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Répondre", "Répondre à tous", "Transférer"],
          cancelButtonIndex: 0,
        },
        (idx) => {
          if (idx === 1) router.push(replyHref as never)
          else if (idx === 2) router.push(replyAllHref as never)
          else if (idx === 3) router.push(fwdHref as never)
        },
      )
    } else {
      Alert.alert("Actions", undefined, [
        { text: "Répondre", onPress: () => router.push(replyHref as never) },
        {
          text: "Répondre à tous",
          onPress: () => router.push(replyAllHref as never),
        },
        { text: "Transférer", onPress: () => router.push(fwdHref as never) },
        { text: "Annuler", style: "cancel" },
      ])
    }
  }

  const isAdmin = email.senderKind === "admin"
  const isSent = email.folder === "sent"
  const pillButton = {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.border,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      <View
        style={{
          height: 52,
          flexShrink: 0,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 6,
        }}
      >
        <IconButton icon="arrowL" label="Retour" plain size={44} color={t.ink2} onPress={() => router.back()} />
        <View style={{ flex: 1 }} />
        <IconButton icon="archive" label="Archiver" plain size={44} color={t.ink2} onPress={onArchive} />
        <IconButton icon="trash" label="Supprimer" plain size={44} color={t.ink2} onPress={onDelete} />
        <IconButton icon="more" label="Plus d’actions" plain size={44} color={t.ink2} onPress={openMore} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            paddingLeft: 20,
            paddingRight: 8,
            paddingTop: 6,
          }}
        >
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              fontSize: 22,
              fontWeight: "500",
              color: t.ink,
              lineHeight: 29,
            }}
          >
            {email.subject}
          </Text>
          <Pressable
            onPress={async () => {
              try {
                await toggleStar({ messageId: id as never })
              } catch {
                /* ignore */
              }
            }}
            accessibilityRole="togglebutton"
            accessibilityLabel="Favori"
            accessibilityState={{ checked: email.isStarred }}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -6 }}
          >
            <Icon
              name={email.isStarred ? "star" : "starO"}
              size={22}
              color={email.isStarred ? idnTokens.yellow : t.muted}
            />
          </Pressable>
        </View>
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 8,
            marginLeft: 20,
            paddingVertical: 3,
            paddingHorizontal: 7,
            borderRadius: 5,
            backgroundColor: t.surface2,
          }}
        >
          <Text style={{ fontSize: 12, color: t.ink2 }}>{FOLDER_LABEL[email.folder]}</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingTop: 18,
            paddingBottom: 12,
            paddingHorizontal: 20,
          }}
        >
          {isAdmin ? (
            <SenderAvatar name={email.senderName} icon="landmark" tone="green" />
          ) : (
            <SenderAvatar name={email.senderName} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 15, fontWeight: "600", color: t.ink }}>
                {email.senderName}
              </Text>
              {isAdmin ? <VerifiedBadge /> : null}
              <Text style={{ fontSize: 12, color: t.muted }}>{formatListTime(email.createdAt)}</Text>
            </View>
            {/* « à moi ▾ » déplie les adresses et la date complète, comme Gmail. */}
            <Pressable
              onPress={() => setShowDetails((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showDetails ? "Masquer les détails du message" : "Afficher les détails du message"}
              accessibilityState={{ expanded: showDetails }}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 30 }}
              style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 2, marginTop: 2 }}
            >
              <Text style={{ fontSize: 13, color: t.muted }}>
                {isSent ? `à ${email.recipientName || email.recipientEmail}` : "à moi"}
              </Text>
              <Icon name="chevDn" size={15} color={t.muted} />
            </Pressable>
          </View>
        </View>
        {showDetails ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: t.border,
              gap: 4,
            }}
          >
            {[
              ["De", email.senderEmail],
              ["À", email.recipientEmail],
              ["Date", date],
            ].map(([label, value]) => (
              <View key={label} style={{ flexDirection: "row", gap: 8 }}>
                <Text style={{ width: 40, fontSize: 12, color: t.muted }}>{label}</Text>
                <Text selectable style={{ flex: 1, fontSize: 12, color: t.ink, fontFamily: label === "Date" ? undefined : idnTokens.mono }}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {isAdmin ? (
          <View
            style={{
              marginHorizontal: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: t.greenBadge,
            }}
          >
            <Icon name="landmark" size={18} color={t.dark ? t.greenText : t.greenDk} />
            <Text style={{ flex: 1, fontSize: 13, color: t.dark ? t.greenText : t.greenDk }}>
              Message officiel d’une administration vérifiée.
            </Text>
          </View>
        ) : null}
        <View
          style={{
            marginTop: 14,
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
          <View style={{ marginTop: 14, marginHorizontal: 16, gap: 8 }}>
            {email.attachments.map((a) => (
              <Pressable
                key={a._id}
                onPress={() => openAttachment(a._id)}
                accessibilityRole="button"
                accessibilityLabel={`Ouvrir ${a.name}`}
                style={{
                  minHeight: 56,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: t.surface,
                  borderWidth: 1,
                  borderColor: t.border,
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View style={{ width: 36, height: 42, borderRadius: 6, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="paper" size={18} color={t.ink2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 13, color: t.ink, fontWeight: "500" }}
                  >
                    {a.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>
                    {Math.max(1, Math.round(a.size / 1024))} Ko
                  </Text>
                </View>
                <Icon name="download" size={18} color={t.muted} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          flexDirection: "row",
          gap: 10,
          backgroundColor: t.bg,
        }}
      >
        <Pressable
          onPress={() => router.push(replyHref as never)}
          onLongPress={openReplyMenu}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityLabel="Répondre"
          accessibilityHint="Appui long pour répondre à tous"
          style={({ pressed }) => [pillButton, { backgroundColor: pressed ? t.surface2 : "transparent" }]}
        >
          <Icon name="reply" size={20} color={t.ink} />
          <Text style={{ fontSize: 15, fontWeight: "500", color: t.ink }}>Répondre</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(fwdHref as never)}
          accessibilityRole="button"
          accessibilityLabel="Transférer"
          style={({ pressed }) => [pillButton, { backgroundColor: pressed ? t.surface2 : "transparent" }]}
        >
          <Icon name="forward" size={20} color={t.ink} />
          <Text style={{ fontSize: 15, fontWeight: "500", color: t.ink }}>Transférer</Text>
        </Pressable>
      </View>
    </View>
  )
}
