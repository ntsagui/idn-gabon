import React, { useEffect } from "react"
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, Share, View } from "react-native";
import { Text } from "@/design/text";
import * as Print from "expo-print"
import * as Sharing from "expo-sharing"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { NSheetHeader } from "@/components/chrome/sheet-header"
import RichLetterEditor from "@/components/rich-letter-editor"
import { Icon, type IconName } from "@/design/icons"
import { IconButton } from "@/design/components/app-bar"
import { api } from "@/lib/api"
import { isHtmlLetterBody, letterBodyToText } from "@/lib/letter-content"

/** Échappement HTML basique pour les chaînes injectées dans le template PDF. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Nettoie le sujet pour un nom de fichier safe. */
function safeFilename(s: string): string {
  return (
    s
      .replace(/[^a-zA-Z0-9\-_ ]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 60) || "Courrier"
  )
}

const FOLDER_LABEL: Record<string, string> = {
  inbox: "Réception",
  pending: "À traiter",
  sent: "Expédiés",
  trash: "Corbeille",
}

type Action = {
  icon: IconName
  l: string
  primary?: boolean
  danger?: boolean
  onPress: () => void
}

export default function CourrierDetail() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { isAuthenticated } = useConvexAuth()
  const letter = useQuery(
    api.iboite.letters.get,
    isAuthenticated && id ? { letterId: id as never } : "skip",
  )
  const markRead = useMutation(api.iboite.letters.markRead)
  const moveLetter = useMutation(api.iboite.letters.move)

  useEffect(() => {
    if (letter && !letter.isRead) {
      void markRead({ letterId: letter._id as never }).catch(() => {})
    }
  }, [letter, markRead])

  if (letter === undefined) {
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
  if (!letter) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
        <NSheetHeader t={t} title="Courrier" onBack={() => router.back()} />
        <View
          style={{
            flex: 1,
            padding: 22,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ color: t.muted, fontSize: 13 }}>
            Courrier introuvable.
          </Text>
        </View>
      </View>
    )
  }
  const stableLetter = letter

  const created = new Date(letter.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  const dueLabel = letter.dueAt
    ? new Date(letter.dueAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  function buildLetterHtml() {
    const bodyHtml = isHtmlLetterBody(stableLetter.body)
      ? stableLetter.body
      : `<div style="white-space: pre-wrap;">${esc(stableLetter.body)}</div>`
    const attachmentsHtml =
      stableLetter.attachments.length === 0
        ? ""
        : `
      <h2 style="font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: #6b6b6b; margin-top: 32px;">Pièces jointes</h2>
      <ul style="font-size: 12px; color: #2a2a2a; padding-left: 18px;">
        ${stableLetter.attachments.map((a) => `<li>${esc(a.name)} — ${Math.max(1, Math.round(a.size / 1024))} KB</li>`).join("")}
      </ul>`
    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${esc(stableLetter.subject)}</title></head>
<body style="font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; background: #fffdf7; margin: 0; padding: 56px 56px;">
  <div style="display: flex; justify-content: space-between; font-size: 11px; color: #3a3a3a;">
    <div style="max-width: 48%;"><div style="font-weight: 700; color: #1a1a1a;">${esc(stableLetter.senderName)}</div><div style="white-space: pre-line;">${esc(stableLetter.senderAddress)}</div></div>
    <div style="max-width: 48%; text-align: right;"><div style="font-weight: 700; color: #1a1a1a;">${esc(stableLetter.recipientName)}</div><div style="white-space: pre-line;">${esc(stableLetter.recipientAddress)}</div></div>
  </div>
  <p style="text-align: right; font-size: 11px; color: #3a3a3a; margin-top: 24px;">Libreville, le ${esc(created)}</p>
  <h1 style="border-bottom: 1px solid #d6d2c4; padding-bottom: 8px; margin-top: 28px; font-size: 14px;">Objet : ${esc(stableLetter.subject)}</h1>
  <div style="font-size: 13px; line-height: 1.7; margin-top: 20px; text-align: justify; color: #2a2a2a;">${bodyHtml}</div>
  ${attachmentsHtml}
</body></html>`
  }

  async function move(target: "pending" | "trash") {
    try {
      await moveLetter({ letterId: id as never, target })
      router.back()
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Action impossible.",
      )
    }
  }

  const plainBody = letterBodyToText(letter.body)
  const replyBody = `\n\n--- Courrier d'origine ---\nDe : ${letter.senderName}\nDate : ${created}\nObjet : ${letter.subject}\n\n${plainBody}`
  const replyHref =
    `/iboite/courrier/compose?subject=${encodeURIComponent(`Re: ${letter.subject.replace(/^Re:\s*/i, "")}`)}` +
    `&body=${encodeURIComponent(replyBody)}`

  async function onPrint() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print()
      return
    }
    try {
      await Print.printAsync({ html: buildLetterHtml() })
    } catch (err) {
      Alert.alert(
        "Impression impossible",
        err instanceof Error ? err.message : "Réessaie.",
      )
    }
  }

  async function onShare() {
    await Share.share({
      title: stableLetter.subject,
      message: `${stableLetter.senderName} — ${stableLetter.subject}\n\n${plainBody}`,
    })
  }

  /**
   * Génère un PDF du courrier via expo-print (template HTML A4) puis ouvre
   * la sheet de partage native. Le HTML reproduit grossièrement la mise en
   * page de la prévisualisation papier ivoire.
   */
  async function onDownload() {
    try {
      const { uri } = await Print.printToFileAsync({
        html: buildLetterHtml(),
        base64: false,
      })
      const canShare = await Sharing.isAvailableAsync()
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${safeFilename(stableLetter.subject)}.pdf`,
          UTI: "com.adobe.pdf",
        })
      } else {
        Alert.alert("PDF généré", `Fichier disponible : ${uri}`)
      }
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Téléchargement impossible.",
      )
    }
  }

  function openMore() {
    const run = (index: number) => {
      if (index === 1) void onDownload()
      if (index === 2) void onPrint()
      if (index === 3) void onShare()
    }
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Télécharger le PDF", "Imprimer", "Partager"],
          cancelButtonIndex: 0,
        },
        run,
      )
    } else {
      Alert.alert("Actions", undefined, [
        { text: "Télécharger le PDF", onPress: () => void onDownload() },
        { text: "Imprimer", onPress: () => void onPrint() },
        { text: "Partager", onPress: () => void onShare() },
        { text: "Annuler", style: "cancel" },
      ])
    }
  }

  const actions: Action[] = [
    {
      icon: "reply",
      l: "Répondre",
      primary: true,
      onPress: () => router.push(replyHref as never),
    },
    { icon: "clock", l: "À traiter", onPress: () => move("pending") },
    { icon: "printer", l: "Imprimer", onPress: () => void onPrint() },
    { icon: "share", l: "Partager", onPress: () => void onShare() },
    { icon: "trash", l: "Suppr.", danger: true, onPress: () => move("trash") },
  ]

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {/* En-tête aligné sur la lecture d'un e-mail : actions en icônes, grand objet, dossier. */}
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
        <IconButton icon="more" label="Plus d’actions" plain size={44} color={t.ink2} onPress={openMore} />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 14 }}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: t.bg }}
      >
        <Text
          accessibilityRole="header"
          style={{ fontSize: 22, fontWeight: "500", color: t.ink, lineHeight: 29, paddingHorizontal: 2, paddingTop: 6 }}
        >
          {letter.subject}
        </Text>
        <View
          style={{
            alignSelf: "flex-start",
            marginTop: 8,
            marginBottom: 14,
            marginHorizontal: 2,
            paddingVertical: 3,
            paddingHorizontal: 7,
            borderRadius: 5,
            backgroundColor: t.surface2,
          }}
        >
          <Text style={{ fontSize: 12, color: t.ink2 }}>{FOLDER_LABEL[letter.folder]}</Text>
        </View>
        <View
          style={{
            backgroundColor: "#fffdf7",
            borderRadius: 8,
            paddingHorizontal: 18,
            paddingVertical: 24,
          }}
        >
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View style={{ maxWidth: "50%" }}>
              <Text
                style={{ fontWeight: "700", fontSize: 10, color: "#1a1a1a" }}
              >
                {letter.senderName}
              </Text>
              <Text style={{ fontSize: 10, color: "#3a3a3a" }}>
                {letter.senderAddress}
              </Text>
            </View>
            <View style={{ maxWidth: "45%", alignItems: "flex-end" }}>
              <Text
                style={{ fontWeight: "700", fontSize: 10, color: "#1a1a1a" }}
              >
                {letter.recipientName}
              </Text>
              <Text style={{ fontSize: 10, color: "#3a3a3a" }}>
                {letter.recipientAddress}
              </Text>
            </View>
          </View>
          <Text
            style={{
              textAlign: "right",
              fontSize: 10,
              color: "#3a3a3a",
              marginTop: 14,
            }}
          >
            {created}
          </Text>
          <View
            style={{
              borderBottomWidth: 1,
              borderBottomColor: "#d6d2c4",
              paddingBottom: 6,
              marginTop: 16,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#1a1a1a" }}>
              Objet : {letter.subject}
            </Text>
          </View>
          <View style={{ marginTop: 14 }}>
            {isHtmlLetterBody(letter.body) ? (
              <RichLetterEditor
                initialHtml={letter.body}
                readOnly
                dom={{ matchContents: true, scrollEnabled: false }}
              />
            ) : (
              <Text style={{ fontSize: 11, lineHeight: 19, color: "#2a2a2a" }}>
                {letter.body}
              </Text>
            )}
          </View>
        </View>

        {letter.type === "action_required" && dueLabel ? (
          <View
            style={{
              backgroundColor: t.dark ? "#1F1216" : "#FBE5E5",
              borderWidth: 1,
              borderColor: t.dark ? "#3A1E1E" : "#F5C7C7",
              borderRadius: 12,
              padding: 12,
              marginTop: 14,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Icon name="alert" size={16} color="#B83A3A" />
            <View>
              <Text
                style={{ fontSize: 12, color: "#B83A3A", fontWeight: "700" }}
              >
                Action requise
              </Text>
              <Text style={{ fontSize: 11, color: t.ink2, marginTop: 2 }}>
                Réponse attendue avant le {dueLabel}
              </Text>
            </View>
          </View>
        ) : null}

        {letter.attachments.length > 0 ? (
          <View style={{ marginTop: 14 }}>
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
              {letter.attachments.map((a) => (
                <View
                  key={a._id}
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
                  <View style={{ flex: 1 }}>
                    <Text
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
                </View>
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
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            gap: 4,
          }}
        >
          {actions.map((a, i) => (
            <Pressable
              key={i}
              onPress={a.onPress}
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
    </View>
  )
}
