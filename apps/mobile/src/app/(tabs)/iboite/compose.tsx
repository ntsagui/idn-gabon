import React, { useEffect, useState } from "react"
import { Alert, Platform, Pressable, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import * as DocumentPicker from "expo-document-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import { NSheetHeader } from "@/components/chrome/sheet-header"
import RichEmailEditor from "@/components/mailbox/rich-email-editor"
import { IdnButton } from "@/design/components/idn-button"
import { Icon } from "@/design/icons"
import { api } from "@/lib/api"
import { uploadAttachment, type PickedAttachment } from "@/lib/attachment-upload"
import { iboiteFr } from "@/data/iboite-fr"
import {
  resolveActiveAccountId,
  useIBoiteActiveAccount,
} from "@/lib/iboite-active-account"
import {
  hasLetterContent,
  isHtmlLetterBody,
  letterBodyToText,
  plainTextToLetterHtml,
} from "@/lib/letter-content"

// Pièces jointes : même flux que `courrier/compose.tsx`
// (`expo-document-picker → generateUploadUrl → POST → send`). On accumule
// les fichiers en mémoire puis on les uploade au moment de l'envoi.
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const MAX_ATTACHMENT_LABEL = "10 Mo"
const MAX_ATTACHMENTS = 10


function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

async function pickAttachment(): Promise<PickedAttachment | null> {
  if (Platform.OS === "web") {
    return new Promise((resolve) => {
      const input = document.createElement("input")
      input.type = "file"
      input.onchange = async () => {
        const f = input.files?.[0]
        if (!f) {
          resolve(null)
          return
        }
        const buf = new Uint8Array(await f.arrayBuffer())
        resolve({
          name: f.name,
          size: f.size,
          mime: f.type || "application/octet-stream",
          bytes: buf,
        })
      }
      input.click()
    })
  }
  const res = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    copyToCacheDirectory: true,
    multiple: false,
  })
  if (res.canceled || !res.assets[0]) return null
  const asset = res.assets[0]
  return { name: asset.name, size: asset.size ?? 0, mime: asset.mimeType ?? "application/octet-stream", uri: asset.uri }
}

export default function IBoiteCompose() {
  const t = useIdnTheme()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    to?: string
    subject?: string
    body?: string
    replyToId?: string
    mode?: "reply" | "replyAll" | "forward"
  }>()
  const { isAuthenticated } = useConvexAuth()
  const accounts = useQuery(
    api.iboite.accounts.listMine,
    isAuthenticated ? {} : "skip",
  )
  const send = useMutation(api.iboite.messages.send)
  const generateUploadUrl = useMutation(api.iboite.messages.generateUploadUrl)
  // Réponse / transfert : on lit le message d'origine via Convex pour
  // pré-remplir proprement destinataire / objet / citation (au lieu de
  // tout passer en query params).
  const replyToId = (params.replyToId as string | undefined) ?? null
  // Note V1 : 'replyAll' = 'reply' au pré-remplissage tant que le modèle
  // `iboiteMessage` n'a pas de champ `cc[]`. Comportement identique côté UX
  // — sera précisé quand la conv supportera plusieurs destinataires.
  const mode =
    (params.mode as "reply" | "replyAll" | "forward" | undefined) ?? "reply"
  const original = useQuery(
    api.iboite.messages.get,
    isAuthenticated && replyToId ? { messageId: replyToId as never } : "skip",
  )

  const { activeAccountId } = useIBoiteActiveAccount()
  const accountId = resolveActiveAccountId(accounts, activeAccountId)
  const [toEmail, setToEmail] = useState(
    (params.to as string | undefined) ?? "",
  )
  const [subject, setSubject] = useState(
    (params.subject as string | undefined) ?? "",
  )
  const [body, setBody] = useState((params.body as string | undefined) ?? "")
  const bodyHtmlRef = React.useRef((params.body as string | undefined) ?? "")
  const [attachments, setAttachments] = useState<PickedAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  // Sentinel pour ne pré-remplir qu'une seule fois (sinon l'effet ré-écrase
  // les modifs que l'utilisateur fait pendant la frappe).
  const [prefilled, setPrefilled] = useState(false)

  useEffect(() => {
    if (prefilled || !original) return
    const stripPrefix = (s: string) => s.replace(/^(Re|Tr|Fwd):\s*/i, "")
    const date = new Date(original.createdAt).toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    const quote = `\n\n--- Message d'origine ---\nDe : ${original.senderName} <${original.senderEmail}>\nDate : ${date}\nObjet : ${original.subject}\n\n${original.body}`
    if (mode === "forward") {
      setSubject((prev) => prev || `Tr: ${stripPrefix(original.subject)}`)
    } else {
      setToEmail((prev) => prev || original.senderEmail)
      setSubject((prev) => prev || `Re: ${stripPrefix(original.subject)}`)
    }
    setBody((prev) => {
      const next = prev || quote
      bodyHtmlRef.current = next
      return next
    })
    setPrefilled(true)
  }, [original, mode, prefilled])

  const senderEmail =
    accounts?.find((a) => a._id === accountId)?.emailAlias ?? "—"

  const onBodyChange = React.useCallback(async (html: string) => {
    bodyHtmlRef.current = html
  }, [])

  async function onAttach() {
    try {
      if (attachments.length >= MAX_ATTACHMENTS) {
        Alert.alert(
          "Limite atteinte",
          `Tu peux joindre jusqu’à ${MAX_ATTACHMENTS} fichiers.`,
        )
        return
      }
      const f = await pickAttachment()
      if (!f) return
      if (f.size > MAX_ATTACHMENT_BYTES) {
        Alert.alert(
          "Fichier trop volumineux",
          `Chaque pièce jointe est limitée à ${MAX_ATTACHMENT_LABEL}.`,
        )
        return
      }
      setAttachments((prev) => [...prev, f])
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Sélection impossible.",
      )
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (submitting) return
    if (!accountId) {
      Alert.alert("Aucun compte", iboiteFr.compose.errors.noAccount)
      return
    }
    const rawRecipient = toEmail.trim().toLowerCase()
    const recipientEmail = rawRecipient.includes("@")
      ? rawRecipient
      : `${rawRecipient}@idn.ga`
    if (!rawRecipient || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      Alert.alert(
        "Destinataire invalide",
        "Saisis une adresse email ou un identifiant iBoîte valide.",
      )
      return
    }
    if (!subject.trim()) {
      Alert.alert("Objet requis", "Donne un objet à ton message.")
      return
    }
    const rawBody = bodyHtmlRef.current.trim()
    if (!hasLetterContent(rawBody)) {
      Alert.alert("Message vide", "Écris ton message.")
      return
    }
    const bodyHtml = isHtmlLetterBody(rawBody)
      ? rawBody
      : plainTextToLetterHtml(rawBody)
    const bodyText = letterBodyToText(rawBody)
    setSubmitting(true)
    try {
      // Upload des pièces jointes vers `_storage`, puis collecte des
      // références à passer à `send`.
      const uploaded: {
        name: string
        size: number
        storageRef: string
        mimeType: string
      }[] = []
      for (const att of attachments) {
        const uploadUrl = await generateUploadUrl({})
        const storageId = await uploadAttachment(uploadUrl, att)
        uploaded.push({
          name: att.name,
          size: att.size,
          storageRef: storageId,
          mimeType: att.mime,
        })
      }

      await send({
        accountId: accountId as never,
        recipientEmail,
        recipientName: recipientEmail.split("@")[0] || recipientEmail,
        subject: subject.trim(),
        body: bodyText,
        bodyHtml,
        attachments: uploaded.length > 0 ? (uploaded as never) : undefined,
        inReplyTo:
          replyToId && mode !== "forward" ? (replyToId as never) : undefined,
      })
      router.back()
    } catch (err) {
      Alert.alert(
        "Erreur",
        err instanceof Error ? err.message : "Envoi impossible.",
      )
      setSubmitting(false)
    }
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}
    >
      <NSheetHeader
        t={t}
        title={!replyToId ? "Nouveau message" : mode === "forward" ? "Transférer" : "Répondre"}
        onBack={() => router.back()}
        right={
          <Pressable
            onPress={submit}
            disabled={submitting}
            style={{ padding: 4 }}
          >
            <Icon
              name="send"
              size={18}
              color={submitting ? t.muted : idnTokens.green}
            />
          </Pressable>
        }
      />
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.borderSoft,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: t.muted,
              width: 36,
              fontWeight: "500",
            }}
          >
            De
          </Text>
          <Text style={{ fontSize: 13, color: t.ink }}>{senderEmail}</Text>
        </View>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.borderSoft,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: t.muted,
              width: 36,
              fontWeight: "500",
            }}
          >
            À
          </Text>
          <TextInput
            value={toEmail}
            onChangeText={setToEmail}
            placeholder="destinataire@…"
            placeholderTextColor={t.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ flex: 1, fontSize: 13, color: t.ink }}
          />
        </View>
        <View
          style={{
            borderBottomWidth: 1,
            borderBottomColor: t.borderSoft,
            paddingVertical: 12,
          }}
        >
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Objet"
            placeholderTextColor={t.muted}
            style={{ fontSize: 14, color: t.ink, fontWeight: "600" }}
          />
        </View>
        <View style={{ flex: 1, paddingVertical: 2 }}>
          <RichEmailEditor
            initialHtml={body}
            onChange={onBodyChange}
            theme={{
              dark: t.dark,
              background: t.bg,
              surface: t.surface,
              foreground: t.ink,
              muted: t.muted,
              border: t.borderSoft,
              active: t.surface2,
              link: t.dark ? "#58C985" : idnTokens.green,
            }}
            dom={{ style: { flex: 1, backgroundColor: t.bg } }}
          />
        </View>
      </View>
      {attachments.length > 0 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: t.borderSoft,
            paddingHorizontal: 22,
            paddingVertical: 8,
            gap: 6,
          }}
        >
          {attachments.map((a, i) => (
            <View
              key={`${a.name}-${i}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: t.surface,
                borderWidth: 1,
                borderColor: t.border,
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
            >
              <Icon name="paper" size={14} color={t.ink2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 12, color: t.ink, fontWeight: "500" }}
                >
                  {a.name}
                </Text>
                <Text style={{ fontSize: 10, color: t.muted }}>
                  {formatBytes(a.size)}
                </Text>
              </View>
              <Pressable
                onPress={() => removeAttachment(i)}
                disabled={submitting}
                accessibilityLabel={`Retirer ${a.name}`}
                hitSlop={8}
                style={{ padding: 2 }}
              >
                <Icon name="close" size={16} color={t.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: t.borderSoft,
          backgroundColor: t.surface,
          paddingHorizontal: 14,
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 10),
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        }}
      >
        <Pressable
          onPress={onAttach}
          disabled={submitting}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Icon name="paper" size={14} color={t.ink2} />
          <Text style={{ color: t.ink2, fontSize: 12, fontWeight: "500" }}>
            Joindre
          </Text>
          <Text style={{ color: t.muted, fontSize: 11 }}>
            Max {MAX_ATTACHMENT_LABEL}
          </Text>
        </Pressable>
        <View style={{ flex: 1 }} />
        <IdnButton
          t={t}
          variant="primary"
          size="sm"
          leadIcon={<Icon name="send" size={14} color="#fff" />}
          onPress={submit}
          disabled={submitting}
        >
          {submitting ? "…" : "Envoyer"}
        </IdnButton>
      </View>
    </View>
  )
}
