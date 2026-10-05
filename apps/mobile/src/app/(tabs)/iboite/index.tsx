import React, { useState } from "react"
import { Alert, Pressable, ScrollView, View } from "react-native"
import { useRouter } from "expo-router"
import * as Clipboard from "expo-clipboard"
import { useConvexAuth, useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { Text, TextInput } from "@/design/text"
import { useIdnTheme } from "@/design/theme"
import { Icon, type IconName } from "@/design/icons"
import { AppBar, IconButton } from "@/design/components/app-bar"
import { Screen } from "@/design/components/screen"
import { Badge } from "@/design/components/badge"
import { Card, IconTile, Row } from "@/design/components/list"
import { IdnButton } from "@/design/components/idn-button"
import { IdnLottie } from "@/design/components/lottie"
import { AddressStrip } from "@/components/mailbox/address-strip"
import { api } from "@/lib/api"
import { formatRelativeTime, iboiteAccountToUi } from "@/lib/iboite-adapter"
import { resolveActiveAccountId, useIBoiteActiveAccount } from "@/lib/iboite-active-account"

type Tab = "emails" | "courriers" | "colis"
type LetterFolder = "inbox" | "pending" | "sent" | "trash"
type MessageFolder = "inbox" | "starred" | "archive" | "sent" | "trash"

const LETTER_FOLDERS: { id: LetterFolder; label: string }[] = [
  { id: "inbox", label: "Réception" },
  { id: "pending", label: "À traiter" },
  { id: "sent", label: "Expédiés" },
  { id: "trash", label: "Corbeille" },
]
const EMAIL_FOLDERS: { id: MessageFolder; label: string }[] = [
  { id: "inbox", label: "Réception" },
  { id: "starred", label: "Favoris" },
  { id: "archive", label: "Archives" },
  { id: "sent", label: "Envoyés" },
  { id: "trash", label: "Corbeille" },
]
const ACCOUNT_ICON: Record<string, IconName> = { personal: "user", professional: "briefcase", association: "users" }
const ACCOUNT_LABEL: Record<string, string> = { personal: "Personnel", professional: "Professionnel", association: "Association" }

function Chips<T extends string>({ items, value, onChange }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useIdnTheme()
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }} style={{ flexGrow: 0 }}>
      {items.map((f) => {
        const sel = f.id === value
        return (
          <Pressable
            key={f.id}
            onPress={() => onChange(f.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: sel }}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
          >
            <Text style={{ fontSize: 13, fontWeight: sel ? "600" : "500", color: sel ? t.greenText : t.ink2 }}>{f.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

function Empty({ text }: { text: string }) {
  const t = useIdnTheme()
  return (
    <View style={{ alignItems: "center", paddingVertical: 32 }}>
      <IdnLottie name="iboite" size={110} />
      <Text style={{ marginTop: 4, fontSize: 14, color: t.muted, textAlign: "center" }}>{text}</Text>
    </View>
  )
}

/** iBoîte (prototype « iboite ») : comptes, adresse, e-mails, courriers et colis. */
export default function IBoiteHome() {
  const t = useIdnTheme()
  const router = useRouter()
  const { isAuthenticated } = useConvexAuth()
  const accounts = useQuery(api.iboite.accounts.listMine, isAuthenticated ? {} : "skip")
  const [tab, setTab] = useState<Tab>("emails")
  const [letterFolder, setLetterFolder] = useState<LetterFolder>("inbox")
  const [emailFolder, setEmailFolder] = useState<MessageFolder>("inbox")
  const { activeAccountId, setActiveAccountId } = useIBoiteActiveAccount()
  const selectedAccountId = resolveActiveAccountId(accounts, activeAccountId)
  const account = accounts?.find((a) => a._id === selectedAccountId) ?? accounts?.[0]

  const compose = () => router.push((tab === "courriers" ? "/iboite/courrier/compose" : "/iboite/compose") as never)

  return (
    <Screen
      inTabs
      header={
        <AppBar
          title="iBoîte"
          right={account && tab !== "colis" ? <IconButton icon="edit" label={tab === "courriers" ? "Nouveau courrier" : "Nouveau message"} onPress={compose} /> : null}
        />
      }
    >
      {accounts === undefined ? (
        <Text style={{ marginTop: 24, color: t.muted }}>Chargement…</Text>
      ) : !account ? (
        <Empty text="Aucun compte iBoîte. Termine ton inscription pour activer ton adresse @idn.ga." />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14 }} style={{ flexGrow: 0 }}>
            {accounts.map((a) => {
              const sel = a._id === account._id
              const unread = a.counters.unreadMessages + a.counters.unreadLetters
              return (
                <Pressable
                  key={a._id}
                  onPress={() => setActiveAccountId(a._id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sel }}
                  accessibilityLabel={`${a.label || ACCOUNT_LABEL[a.type]}${unread ? `, ${unread} non lus` : ""}`}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1, borderColor: sel ? t.green : t.border, backgroundColor: sel ? t.greenBadge : t.surface }}
                >
                  <Icon name={ACCOUNT_ICON[a.type] ?? "user"} size={16} color={sel ? t.greenText : t.ink2} />
                  <Text style={{ fontSize: 14, fontWeight: sel ? "600" : "500", color: sel ? t.greenText : t.ink }}>{a.label || ACCOUNT_LABEL[a.type]}</Text>
                  {unread ? <View style={{ minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9999, backgroundColor: t.green, alignItems: "center", justifyContent: "center" }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{unread}</Text></View> : null}
                </Pressable>
              )
            })}
          </ScrollView>

          <Pressable
            onPress={async () => {
              await Clipboard.setStringAsync(account.emailAlias)
              Alert.alert("Adresse copiée", account.emailAlias)
            }}
            accessibilityRole="button"
            accessibilityLabel={`Ton adresse ${account.emailAlias}, appuie pour la copier`}
            style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.surface2 }}
          >
            <Icon name="mail" size={16} color={t.ink2} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: t.mono, fontSize: 13, color: t.ink }}>{account.emailAlias}</Text>
            <Icon name="copy" size={16} color={t.muted} />
          </Pressable>

          <View accessibilityRole="tablist" style={{ flexDirection: "row", marginTop: 12, padding: 3, borderRadius: 12, backgroundColor: t.surface2 }}>
            {([
              { id: "emails", label: "E-mails", n: account.counters.unreadMessages },
              { id: "courriers", label: "Courriers", n: account.counters.unreadLetters },
              { id: "colis", label: "Colis", n: account.counters.availablePackages },
            ] as const).map((s) => {
              const sel = s.id === tab
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setTab(s.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: sel }}
                  style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: sel ? t.surface : "transparent", borderWidth: sel ? 1 : 0, borderColor: t.border }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "600", color: sel ? t.ink : t.muted }}>{s.label}</Text>
                  {s.n ? <Text style={{ fontSize: 12, fontWeight: "600", color: t.greenText }}>{s.n}</Text> : null}
                </Pressable>
              )
            })}
          </View>

          {tab === "emails" ? <EmailsList accountId={account._id} folder={emailFolder} onFolder={setEmailFolder} /> : null}
          {tab === "courriers" ? (
            <>
              <View style={{ marginHorizontal: -20 }}>
                <AddressStrip acc={iboiteAccountToUi(account)} t={t} onConfigure={() => router.push({ pathname: "/iboite/address-setup", params: { accountId: account._id } } as never)} />
              </View>
              <LettersList accountId={account._id} folder={letterFolder} onFolder={setLetterFolder} />
            </>
          ) : null}
          {tab === "colis" ? (
            <>
              <View style={{ marginHorizontal: -20 }}>
                <AddressStrip acc={iboiteAccountToUi(account)} t={t} onConfigure={() => router.push({ pathname: "/iboite/address-setup", params: { accountId: account._id } } as never)} />
              </View>
              <PackagesList accountId={account._id} qr={account.qrCode} />
            </>
          ) : null}
        </>
      )}
    </Screen>
  )
}

function EmailsList({ accountId, folder, onFolder }: { accountId: string; folder: MessageFolder; onFolder: (f: MessageFolder) => void }) {
  const t = useIdnTheme()
  const router = useRouter()
  const result = usePaginatedQuery(api.iboite.messages.listByFolder, { accountId: accountId as never, folder }, { initialNumItems: 30 })
  const toggleStar = useMutation(api.iboite.messages.toggleStar)
  const [search, setSearch] = useState("")
  const q = search.trim().toLocaleLowerCase("fr")
  const emails = q
    ? result.results.filter((e) => [e.senderName, e.senderEmail, e.subject, e.preview].join(" ").toLocaleLowerCase("fr").includes(q))
    : result.results
  return (
    <>
      <View style={{ marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12 }}>
        <Icon name="search" size={16} color={t.muted} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Rechercher dans les messages" placeholderTextColor={t.muted} returnKeyType="search" accessibilityLabel="Rechercher dans les messages" style={{ flex: 1, fontSize: 15, color: t.ink, paddingVertical: 0 }} />
      </View>
      <Chips items={EMAIL_FOLDERS} value={folder} onChange={onFolder} />
      {result.status === "LoadingFirstPage" ? (
        <Text style={{ color: t.muted }}>Chargement…</Text>
      ) : emails.length === 0 ? (
        <Empty text={q ? "Aucun message ne correspond." : "Aucun message dans ce dossier."} />
      ) : (
        <Card>
          {emails.map((e) => (
            <Row
              key={e._id}
              icon={e.senderKind === "admin" ? "landmark" : "mail"}
              tone={e.senderKind === "admin" ? "green" : "blue"}
              unread={!e.isRead}
              title={e.subject || "(sans objet)"}
              sub={`${e.senderName} · ${formatRelativeTime(e.createdAt)}${e.hasAttachment ? " · pièce jointe" : ""}`}
              right={
                <Pressable onPress={() => void toggleStar({ messageId: e._id })} hitSlop={10} accessibilityRole="button" accessibilityLabel={e.isStarred ? "Retirer des favoris" : "Ajouter aux favoris"}>
                  <Icon name={e.isStarred ? "star" : "starO"} size={18} color={e.isStarred ? "#C99A00" : t.muted} />
                </Pressable>
              }
              onPress={() => router.push(`/iboite/email/${e._id}` as never)}
              accessibilityLabel={`${e.isRead ? "" : "Non lu, "}${e.subject}, de ${e.senderName}`}
            />
          ))}
        </Card>
      )}
      {result.status === "CanLoadMore" ? <IdnButton t={t} variant="ghost" full onPress={() => result.loadMore(30)} style={{ marginTop: 12 }}>Afficher plus</IdnButton> : null}
    </>
  )
}

function LettersList({ accountId, folder, onFolder }: { accountId: string; folder: LetterFolder; onFolder: (f: LetterFolder) => void }) {
  const t = useIdnTheme()
  const router = useRouter()
  const result = usePaginatedQuery(api.iboite.letters.listByFolder, { accountId: accountId as never, folder }, { initialNumItems: 30 })
  const letters = result.results
  return (
    <>
      <Chips items={LETTER_FOLDERS} value={folder} onChange={onFolder} />
      {result.status === "LoadingFirstPage" ? (
        <Text style={{ color: t.muted }}>Chargement…</Text>
      ) : letters.length === 0 ? (
        <Empty text="Aucun courrier dans ce dossier." />
      ) : (
        <Card>
          {letters.map((l) => (
            <Row
              key={l._id}
              icon="scrollText"
              tone={l.type === "action_required" ? "yellow" : "blue"}
              unread={!l.isRead}
              title={l.senderName}
              sub={`${l.subject}${l.dueAt ? ` · réponse avant le ${new Date(l.dueAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : ""}`}
              right={<Text style={{ fontFamily: t.mono, fontSize: 11, color: t.muted }}>{formatRelativeTime(l.createdAt)}</Text>}
              onPress={() => router.push(`/iboite/courrier/${l._id}` as never)}
            />
          ))}
        </Card>
      )}
      {result.status === "CanLoadMore" ? <IdnButton t={t} variant="ghost" full onPress={() => result.loadMore(30)} style={{ marginTop: 12 }}>Afficher plus</IdnButton> : null}
    </>
  )
}

function PackagesList({ accountId, qr }: { accountId: string; qr: string }) {
  const t = useIdnTheme()
  const data = useQuery(api.iboite.packages.listMine, { accountId: accountId as never })
  const markPickedUp = useMutation(api.iboite.packages.markPickedUp)
  if (data === undefined) return <Text style={{ marginTop: 16, color: t.muted }}>Chargement…</Text>
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
      {data.items.length === 0 ? (
        <Empty text="Aucun colis pour le moment." />
      ) : (
        <Card style={{ marginTop: 12 }}>
          {data.items.map((p) => (
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
