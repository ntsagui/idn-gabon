import React, { useEffect, useState } from "react"
import { Alert, Modal, Platform, Pressable, View } from "react-native";
import { Text, TextInput } from "@/design/text";
import { useLocalSearchParams, useRouter } from "expo-router"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import * as DocumentPicker from "expo-document-picker"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useIdnTheme } from "@/design/theme"
import { idnTokens } from "@/design/tokens"
import RichEmailEditor from "@/components/mailbox/rich-email-editor"
import { IconButton } from "@/design/components/app-bar"
import { Icon, type IconName } from "@/design/icons"
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

/** Photo de la galerie ou de l'appareil photo, au format attendu par l'envoi. */
async function pickImage(source: "library" | "camera"): Promise<PickedAttachment | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert("Appareil photo", "Autorise l’accès à l’appareil photo dans les réglages.")
      return null
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.85 }
  const res =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
  const asset = res.canceled ? null : res.assets[0]
  if (!asset) return null
  return {
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    size: asset.fileSize ?? 0,
    mime: asset.mimeType ?? "image/jpeg",
    uri: asset.uri,
  }
}

// Le web n'a ni galerie ni appareil photo branchés : seul le choix de fichier y est proposé.
const ATTACH_SOURCES: { label: string; icon: IconName; pick: () => Promise<PickedAttachment | null> }[] = [
  ...(Platform.OS === "web"
    ? []
    : [
        { label: "Photos", icon: "image" as const, pick: () => pickImage("library") },
        { label: "Appareil photo", icon: "camera" as const, pick: () => pickImage("camera") },
      ]),
  { label: "Fichiers", icon: "file", pick: pickAttachment },
]

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

  const [attachMenu, setAttachMenu] = useState(false)
  const pendingPick = React.useRef<(() => Promise<PickedAttachment | null>) | null>(null)

  function runPendingPick() {
    const pick = pendingPick.current
    pendingPick.current = null
    if (pick) void onAttach(pick)
  }

  function chooseSource(pick: () => Promise<PickedAttachment | null>) {
    pendingPick.current = pick
    setAttachMenu(false)
    // iOS refuse d'ouvrir un sélecteur pendant la fermeture du menu : il attend `onDismiss`.
    if (Platform.OS !== "ios") runPendingPick()
  }

  async function onAttach(pick: () => Promise<PickedAttachment | null>) {
    try {
      if (attachments.length >= MAX_ATTACHMENTS) {
        Alert.alert(
          "Limite atteinte",
          `Tu peux joindre jusqu’à ${MAX_ATTACHMENTS} fichiers.`,
        )
        return
      }
      const f = await pick()
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

  const field = {
    minHeight: 50,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  }
  const label = { width: 44, fontSize: 15, color: t.muted }

  return (
    <View
      style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}
    >
      <View
        style={{
          height: 60,
          flexShrink: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingLeft: 10,
          paddingRight: 16,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? t.border : t.surface2,
          })}
        >
          <Icon name="close" size={20} color={t.ink2} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, marginLeft: 8, fontSize: 15, fontWeight: "500", color: t.ink2 }}>
          {!replyToId ? "Nouveau message" : mode === "forward" ? "Transférer" : "Répondre"}
        </Text>
        <IconButton
          icon="paper"
          label="Joindre un fichier"
          plain
          size={44}
          color={submitting ? t.muted : t.greenText}
          onPress={() => !submitting && setAttachMenu(true)}
        />
        <Pressable
          onPress={submit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          accessibilityState={{ disabled: submitting, busy: submitting }}
          style={({ pressed }) => ({
            height: 40,
            borderRadius: 20,
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: submitting ? t.mutedSoft : t.green,
            opacity: pressed ? 0.85 : 1,
          })}
          hitSlop={4}
        >
          <Icon name="send" size={17} color="#fff" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
            {submitting ? "Envoi…" : "Envoyer"}
          </Text>
        </Pressable>
      </View>
      <View style={field}>
        <Text style={label}>À</Text>
        <TextInput
          value={toEmail}
          onChangeText={setToEmail}
          placeholder="destinataire@…"
          placeholderTextColor={t.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel="Destinataire"
          style={{ flex: 1, fontSize: 15, color: t.ink, paddingVertical: 12 }}
        />
      </View>
      <View style={field}>
        <Text style={label}>De</Text>
        <Text numberOfLines={1} style={{ flex: 1, fontFamily: t.mono, fontSize: 14, color: t.ink }}>
          {senderEmail}
        </Text>
      </View>
      <View style={field}>
        <TextInput
          value={subject}
          onChangeText={setSubject}
          placeholder="Objet"
          placeholderTextColor={t.muted}
          accessibilityLabel="Objet"
          style={{ flex: 1, fontSize: 15, color: t.ink, paddingVertical: 12 }}
        />
      </View>
      <View style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 2 }}>
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
      {attachments.length > 0 ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: t.borderSoft,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 8),
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
                borderRadius: 12,
                paddingLeft: 12,
                paddingVertical: 4,
              }}
            >
              <Icon name="paper" size={14} color={t.ink2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 13, color: t.ink, fontWeight: "500" }}
                >
                  {a.name}
                </Text>
                <Text style={{ fontSize: 12, color: t.muted }}>
                  {formatBytes(a.size)}
                </Text>
              </View>
              <Pressable
                onPress={() => removeAttachment(i)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${a.name}`}
                style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="close" size={16} color={t.muted} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {/* Menu du trombone : le sélecteur ne s'ouvre qu'une fois le menu refermé (iOS). */}
      <Modal
        visible={attachMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachMenu(false)}
        onDismiss={runPendingPick}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={() => setAttachMenu(false)}
          accessibilityRole="button"
          accessibilityLabel="Fermer le menu"
        />
        <View
          accessibilityViewIsModal
          style={{
            position: "absolute",
            top: insets.top + 56,
            right: 56,
            width: 240,
            paddingVertical: 8,
            borderRadius: 18,
            backgroundColor: t.surface,
            borderWidth: t.dark ? 1 : 0,
            borderColor: t.border,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 12 },
            elevation: 8,
          }}
        >
          {ATTACH_SOURCES.map((s) => (
            <Pressable
              key={s.label}
              onPress={() => chooseSource(s.pick)}
              accessibilityRole="button"
              accessibilityLabel={s.label}
              style={({ pressed }) => ({
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                paddingHorizontal: 20,
                backgroundColor: pressed ? t.surface2 : "transparent",
              })}
            >
              <Icon name={s.icon} size={20} color={t.ink2} />
              <Text style={{ fontSize: 16, color: t.ink }}>{s.label}</Text>
            </Pressable>
          ))}
          <Text
            style={{
              marginTop: 4,
              paddingTop: 8,
              paddingBottom: 6,
              paddingHorizontal: 20,
              borderTopWidth: 1,
              borderTopColor: t.border,
              fontSize: 12,
              color: t.muted,
            }}
          >
            {MAX_ATTACHMENT_LABEL} maximum par fichier
          </Text>
        </View>
      </Modal>
    </View>
  )
}
