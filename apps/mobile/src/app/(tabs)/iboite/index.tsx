import React, { useState } from "react"
import { Alert, Pressable, View } from "react-native"
import { Image } from "expo-image"
import { useRouter } from "expo-router"
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { Text, TextInput } from "@/design/text"
import { useIdnTheme } from "@/design/theme"
import { Icon, type IconName } from "@/design/icons"
import { AppBar, IconButton } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Badge } from "@/design/components/badge"
import { Card, IconTile, useToneColors } from "@/design/components/list"
import { IdnButton } from "@/design/components/idn-button"
import { IdnLottie } from "@/design/components/lottie"
import { AddressStrip } from "@/components/mailbox/address-strip"
import { IBoiteDrawer } from "@/components/mailbox/iboite-drawer"
import { SenderAvatar, VerifiedBadge } from "@/components/mailbox/sender-avatar"
import { api } from "@/lib/api"
import { initialsOf } from "@/lib/last-account"
import { formatListTime, iboiteAccountToUi } from "@/lib/iboite-adapter"
import { resolveActiveAccountId, useIBoiteActiveAccount } from "@/lib/iboite-active-account"

type Tab = "emails" | "courriers" | "colis"
type LetterFolder = "inbox" | "pending" | "sent" | "trash"
type MessageFolder = "inbox" | "starred" | "archive" | "sent" | "trash"

const LETTER_FOLDERS: { id: LetterFolder; label: string; icon: IconName }[] = [
  { id: "inbox", label: "Réception", icon: "inbox" },
  { id: "pending", label: "À traiter", icon: "clock" },
  { id: "sent", label: "Expédiés", icon: "send" },
  { id: "trash", label: "Corbeille", icon: "trash" },
]
const EMAIL_FOLDERS: { id: MessageFolder; label: string; icon: IconName }[] = [
  { id: "inbox", label: "Réception", icon: "inbox" },
  { id: "starred", label: "Favoris", icon: "starO" },
  { id: "sent", label: "Envoyés", icon: "send" },
  { id: "archive", label: "Archives", icon: "archive" },
  { id: "trash", label: "Corbeille", icon: "trash" },
]
const ACCOUNT_ICON: Record<string, IconName> = { personal: "user", professional: "briefcase", association: "users" }
const ACCOUNT_LABEL: Record<string, string> = { personal: "Personnel", professional: "Professionnel", association: "Association" }

function Empty({ text }: { text: string }) {
  const t = useIdnTheme()
  return (
    <View style={{ alignItems: "center", paddingVertical: 32 }}>
      <IdnLottie name="iboite" size={110} />
      <Text style={{ marginTop: 4, fontSize: 14, color: t.muted, textAlign: "center" }}>{text}</Text>
    </View>
  )
}

/** Ligne de liste à trois niveaux (expéditeur + heure / objet / aperçu), façon Gmail. */
function MailRow({ avatar, from, verified, time, unread, subject, preview, footer, onPress, a11y, action }: {
  avatar: React.ReactNode
  from: string
  verified?: boolean
  time: string
  unread: boolean
  subject: string
  preview?: string
  footer?: React.ReactNode
  onPress: () => void
  a11y: string
  action?: React.ReactNode
}) {
  const t = useIdnTheme()
  const strong = { fontWeight: unread ? ("700" as const) : ("400" as const), color: unread ? t.ink : t.ink2 }
  // L'action (étoile) reste hors de la zone cliquable de la ligne (RGAA 7.1, pas d'actions imbriquées).
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        style={({ pressed }) => ({ flex: 1, flexDirection: "row", gap: 14, paddingVertical: 11, opacity: pressed ? 0.6 : 1 })}
      >
        {avatar}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 16, ...strong }}>{from}</Text>
            {verified ? <VerifiedBadge /> : null}
          </View>
          <Text numberOfLines={1} style={{ marginTop: 1, fontSize: 14, ...strong }}>{subject}</Text>
          {preview ? <Text numberOfLines={1} style={{ fontSize: 14, color: t.muted }}>{preview}</Text> : null}
          {footer}
        </View>
      </Pressable>
      <View style={{ alignItems: "flex-end", paddingTop: 14, paddingLeft: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: unread ? "700" : "400", color: unread ? t.greenText : t.muted }}>{time}</Text>
        {action}
      </View>
    </View>
  )
}

/** iBoîte (prototype « iboite », présentation Gmail) : recherche, onglets, liste et tiroir des dossiers. */
export default function IBoiteHome() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const accounts = useQuery(api.iboite.accounts.listMine, isAuthenticated ? {} : "skip")
  const user = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : "skip")
  const [tab, setTab] = useState<Tab>("emails")
  const [letterFolder, setLetterFolder] = useState<LetterFolder>("inbox")
  const [emailFolder, setEmailFolder] = useState<MessageFolder>("inbox")
  const [search, setSearch] = useState("")
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { activeAccountId, setActiveAccountId } = useIBoiteActiveAccount()
  const selectedAccountId = resolveActiveAccountId(accounts, activeAccountId)
  const account = accounts?.find((a) => a._id === selectedAccountId) ?? accounts?.[0]
  const q = search.trim().toLocaleLowerCase("fr")

  const compose = () => router.push((tab === "courriers" ? "/iboite/courrier/compose" : "/iboite/compose") as never)

  if (accounts === undefined || !account) {
    return (
      <Screen inTabs header={<AppBar title="iBoîte" />}>
        {accounts === undefined ? (
          <Text style={{ marginTop: 24, color: t.muted }}>Chargement…</Text>
        ) : (
          <Empty text="Aucun compte iBoîte. Termine ton inscription pour activer ton adresse @idn.ga." />
        )}
      </Screen>
    )
  }

  const configureAddress = () => router.push({ pathname: "/iboite/address-setup", params: { accountId: account._id } } as never)
  const pivot = user?.profile?.pivot
  const photoUrl = user?.profile?.photoUrl
  const folders = tab === "courriers" ? LETTER_FOLDERS : EMAIL_FOLDERS
  const folder = tab === "courriers" ? letterFolder : emailFolder
  const sectionLabel = tab === "colis" ? "Colis" : folders.find((f) => f.id === folder)?.label
  const fabFg = t.dark ? t.greenText : t.greenDk

  return (
    <View style={{ flex: 1 }}>
      <Screen
        inTabs
        contentStyle={{ paddingHorizontal: 16, paddingBottom: tab === "colis" ? 24 : 96 }}
        header={
          <View style={{ paddingTop: 6 }}>
            <View style={{ marginHorizontal: 14, height: 52, borderRadius: 26, backgroundColor: t.surface2, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 9 }}>
              <IconButton icon="menu" label="Ouvrir le menu de l’iBoîte" plain size={44} color={t.ink2} onPress={() => setDrawerOpen(true)} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher dans iBoîte"
                placeholderTextColor={t.muted}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
                accessibilityLabel="Rechercher dans iBoîte"
                style={{ flex: 1, height: 44, fontSize: 16, color: t.ink, paddingVertical: 0 }}
              />
              <Pressable
                onPress={() => router.push("/profile" as never)}
                accessibilityRole="button"
                accessibilityLabel="Mon profil"
                hitSlop={5}
                style={{ width: 34, height: 34, borderRadius: 9999, backgroundColor: t.green, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={{ width: 34, height: 34 }} />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 14, fontWeight: "600" }}>{initialsOf(pivot?.firstName, pivot?.lastName, user?.email)}</Text>
                )}
              </Pressable>
            </View>

            <View accessibilityRole="tablist" style={{ flexDirection: "row", marginTop: 8, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: t.border }}>
              {([
                { id: "emails", label: "E-mails", n: account.counters.unreadMessages, unit: "non lus" },
                { id: "courriers", label: "Courriers", n: account.counters.unreadLetters, unit: "non lus" },
                { id: "colis", label: "Colis", n: account.counters.availablePackages, unit: "à retirer" },
              ] as const).map((s) => {
                const sel = s.id === tab
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setTab(s.id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: sel }}
                    accessibilityLabel={`${s.label}${s.n ? `, ${s.n} ${s.unit}` : ""}`}
                    style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: "600", color: sel ? t.greenText : t.muted }}>{s.label}</Text>
                    {s.n ? (
                      <View style={{ minWidth: 18, height: 17, paddingHorizontal: 6, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: sel ? t.green : t.surface2 }}>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: sel ? "#fff" : t.ink2 }}>{s.n}</Text>
                      </View>
                    ) : null}
                    {sel ? <View style={{ position: "absolute", left: "18%", right: "18%", bottom: -1, height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: t.greenText }} /> : null}
                  </Pressable>
                )
              })}
            </View>
          </View>
        }
      >
        <Text accessibilityRole="header" style={{ paddingTop: 14, paddingBottom: 4, paddingHorizontal: 4, fontSize: 13, fontWeight: "500", letterSpacing: 0.6, color: t.ink2 }}>{sectionLabel}</Text>

        {tab === "emails" ? <EmailsList accountId={account._id} folder={emailFolder} q={q} /> : null}
        {tab === "courriers" ? (
          <>
            {/* L'adresse se règle depuis le tiroir ; l'invitation reste visible tant qu'elle n'est pas configurée. */}
            {!account.isAddressConfigured ? (
              <View style={{ marginHorizontal: -16, marginBottom: 6 }}>
                <AddressStrip acc={iboiteAccountToUi(account)} t={t} onConfigure={configureAddress} />
              </View>
            ) : null}
            <LettersList accountId={account._id} folder={letterFolder} q={q} />
          </>
        ) : null}
        {tab === "colis" ? (
          <>
            <View style={{ marginHorizontal: -16 }}>
              <AddressStrip acc={iboiteAccountToUi(account)} t={t} onConfigure={configureAddress} />
            </View>
            <PackagesList accountId={account._id} qr={account.qrCode} q={q} />
          </>
        ) : null}
      </Screen>

      {tab !== "colis" ? (
        <Pressable
          onPress={compose}
          accessibilityRole="button"
          accessibilityLabel={tab === "courriers" ? "Nouveau courrier" : "Écrire un message"}
          style={({ pressed }) => ({
            position: "absolute", right: 16, bottom: 16, height: 56, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 18, paddingRight: 20,
            backgroundColor: t.greenBadge, opacity: pressed ? 0.85 : 1,
            shadowColor: t.greenDk, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          })}
        >
          <Icon name="edit" size={20} color={fabFg} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: fabFg }}>{tab === "courriers" ? "Nouveau courrier" : "Écrire"}</Text>
        </Pressable>
      ) : null}

      <IBoiteDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        emailAlias={account.emailAlias}
        folders={(tab === "courriers" ? LETTER_FOLDERS : EMAIL_FOLDERS).map((f) => ({
          ...f,
          count: f.id === "inbox" ? (tab === "courriers" ? account.counters.unreadLetters : account.counters.unreadMessages) : undefined,
        }))}
        folder={folder}
        onFolder={(id) => {
          // Depuis Colis, un dossier d'e-mails ramène à l'onglet E-mails.
          if (tab === "courriers") setLetterFolder(id as LetterFolder)
          else {
            setEmailFolder(id as MessageFolder)
            if (tab === "colis") setTab("emails")
          }
        }}
        accounts={accounts.map((a) => ({
          id: a._id,
          label: a.label || ACCOUNT_LABEL[a.type],
          icon: ACCOUNT_ICON[a.type] ?? "user",
          unread: a.counters.unreadMessages + a.counters.unreadLetters,
        }))}
        accountId={account._id}
        onAccount={setActiveAccountId}
        onSettings={configureAddress}
      />
    </View>
  )
}

function EmailsList({ accountId, folder, q }: { accountId: string; folder: MessageFolder; q: string }) {
  const t = useIdnTheme()
  const router = useRouter()
  const result = usePaginatedQuery(api.iboite.messages.listByFolder, { accountId: accountId as never, folder }, { initialNumItems: 30 })
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const emails = q
    ? result.results.filter((e) => [e.senderName, e.senderEmail, e.subject, e.preview].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      {result.status === "LoadingFirstPage" ? (
        <Text style={{ color: t.muted }}>Chargement…</Text>
      ) : emails.length === 0 ? (
        <Empty text={q ? "Aucun message ne correspond." : "Aucun message dans ce dossier."} />
      ) : (
        emails.map((e) => {
          const admin = e.senderKind === "admin"
          // Dans Envoyés, la ligne présente le destinataire, comme Gmail.
          const sent = e.folder === "sent"
          const who = sent ? e.recipientName || e.recipientEmail : e.senderName
          const time = formatListTime(e.createdAt)
          return (
            <MailRow
              key={e._id}
              avatar={admin && !sent ? <SenderAvatar name={who} icon="landmark" tone="green" /> : <SenderAvatar name={who} />}
              from={sent ? `À : ${who}` : who}
              verified={admin && !sent}
              time={time}
              unread={!e.isRead}
              subject={e.subject || "(sans objet)"}
              preview={e.preview}
              footer={
                e.hasAttachment ? (
                  <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6, paddingVertical: 3, paddingLeft: 7, paddingRight: 10, borderRadius: 16, borderWidth: 1, borderColor: t.border }}>
                    <Icon name="paper" size={13} color={t.ink2} />
                    <Text style={{ fontSize: 12, color: t.ink2 }}>Pièce jointe</Text>
                  </View>
                ) : null
              }
              onPress={() => router.push(`/iboite/email/${e._id}` as never)}
              a11y={`${e.isRead ? "" : "Non lu, "}${sent ? `à ${who}` : `de ${who}${admin ? ", administration vérifiée" : ""}`}, ${e.subject || "sans objet"}, ${time}${e.hasAttachment ? ", pièce jointe" : ""}`}
              action={
                <Pressable
                  onPress={() => void toggleStar({ messageId: e._id })}
                  accessibilityRole="togglebutton"
                  accessibilityLabel={`Favori : ${e.subject || "sans objet"}`}
                  accessibilityState={{ checked: e.isStarred }}
                  style={{ width: 44, height: 44, marginTop: 2, marginRight: -12, alignItems: "center", justifyContent: "center" }}
                >
                  <Icon name={e.isStarred ? "star" : "starO"} size={20} color={e.isStarred ? t.yellow : t.muted} />
                </Pressable>
              }
            />
          )
        })
      )}
      {result.status === "CanLoadMore" ? <IdnButton t={t} variant="ghost" full onPress={() => result.loadMore(30)} style={{ marginTop: 12 }}>Afficher plus</IdnButton> : null}
    </>
  )
}

function LettersList({ accountId, folder, q }: { accountId: string; folder: LetterFolder; q: string }) {
  const t = useIdnTheme()
  const router = useRouter()
  const due = useToneColors("yellow")
  const result = usePaginatedQuery(api.iboite.letters.listByFolder, { accountId: accountId as never, folder }, { initialNumItems: 30 })
  const letters = q
    ? result.results.filter((l) => [l.senderName, l.subject].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      {result.status === "LoadingFirstPage" ? (
        <Text style={{ color: t.muted }}>Chargement…</Text>
      ) : letters.length === 0 ? (
        <Empty text={q ? "Aucun courrier ne correspond." : "Aucun courrier dans ce dossier."} />
      ) : (
        letters.map((l) => {
          const dueLabel = l.dueAt ? new Date(l.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : null
          const time = formatListTime(l.createdAt)
          return (
            <MailRow
              key={l._id}
              avatar={<SenderAvatar name={l.senderName} icon="scrollText" tone={l.type === "action_required" ? "yellow" : "blue"} />}
              from={l.senderName}
              time={time}
              unread={!l.isRead}
              subject={l.subject}
              footer={
                dueLabel ? (
                  <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, backgroundColor: due.bg }}>
                    <Icon name="clock" size={13} color={due.fg} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: due.fg }}>Réponse avant le {dueLabel}</Text>
                  </View>
                ) : null
              }
              onPress={() => router.push(`/iboite/courrier/${l._id}` as never)}
              a11y={`${l.isRead ? "" : "Non lu, "}de ${l.senderName}, ${l.subject}, ${time}${dueLabel ? `, réponse avant le ${dueLabel}` : ""}`}
            />
          )
        })
      )}
      {result.status === "CanLoadMore" ? <IdnButton t={t} variant="ghost" full onPress={() => result.loadMore(30)} style={{ marginTop: 12 }}>Afficher plus</IdnButton> : null}
    </>
  )
}

function PackagesList({ accountId, qr, q }: { accountId: string; qr: string; q: string }) {
  const t = useIdnTheme()
  const data = useQuery(api.iboite.packages.listMine, { accountId: accountId as never })
  const markPickedUp = useMutation(api.iboite.packages.markPickedUp)
  if (data === undefined) return <Text style={{ marginTop: 16, color: t.muted }}>Chargement…</Text>
  const items = q ? data.items.filter((p) => [p.description, p.senderName, p.trackingNumber].join(" ").toLocaleLowerCase("fr").includes(q)) : data.items
  const statusBadge = (s: string) =>
    s === "available" ? <Badge tone="green" icon="checkCir">À retirer</Badge> : s === "transit" ? <Badge tone="blue" icon="truck">En transit</Badge> : s === "delivered" ? <Badge tone="neutral">Retiré</Badge> : <Badge tone="neutral">En attente</Badge>
  return (
    <>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <View style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: t.ink }}>{data.available}</Text>
          <Text style={{ fontSize: 12, color: t.muted }}>À retirer</Text>
        </View>
        <View style={{ flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
          <Text style={{ fontSize: 20, fontWeight: "600", color: t.ink }}>{data.transit}</Text>
          <Text style={{ fontSize: 12, color: t.muted }}>En transit</Text>
        </View>
      </View>
      {items.length === 0 ? (
        <Empty text={q ? "Aucun colis ne correspond." : "Aucun colis pour le moment."} />
      ) : (
        <Card style={{ marginTop: 12 }}>
          {items.map((p) => (
            <View key={p._id} style={{ paddingVertical: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <IconTile icon="package" tone={p.status === "available" ? "green" : "neutral"} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: t.ink }}>{p.description}</Text>
                  <Text style={{ fontSize: 13, color: t.muted }}>De : {p.senderName}</Text>
                  <Text style={{ fontFamily: t.mono, fontSize: 12, color: t.muted, marginTop: 2 }}>{p.trackingNumber}</Text>
                </View>
                {statusBadge(p.status)}
              </View>
              {p.status === "available" ? (
                <IdnButton
                  t={t}
                  variant="secondary"
                  full
                  onPress={() =>
                    Alert.alert("Colis retiré ?", "Confirme seulement si tu as le colis en main.", [
                      { text: "Annuler", style: "cancel" },
                      { text: "Oui, retiré", onPress: () => void markPickedUp({ packageId: p._id }).catch(() => Alert.alert("Action impossible", "Réessaie.")) },
                    ])
                  }
                >
                  J’ai retiré ce colis
                </IdnButton>
              ) : null}
            </View>
          ))}
        </Card>
      )}
      <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
        <Icon name="qr" size={24} color={t.ink2} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: t.muted }}>Code iBoîte à présenter au guichet</Text>
          <Text selectable style={{ fontFamily: t.mono, fontSize: 14, color: t.ink, marginTop: 2 }}>{qr}</Text>
        </View>
      </View>
    </>
  )
}
