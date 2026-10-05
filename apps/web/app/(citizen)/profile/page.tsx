"use client"

import * as React from "react"
import Link from "next/link"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Badge, LevelBadge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Avatar, Card, Row, RowAction, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { authClient } from "@/lib/auth-client"
import { deviceIcon } from "@/lib/citizen/display"
import { deviceLabel } from "@/lib/citizen/device-label"
import { clearLastAccount, initialsOf } from "@/lib/citizen/last-account"
import { maskNip } from "@/lib/citizen/nip-format"
import { PasskeyUnavailableError } from "@/lib/citizen/passkeys"

import { loadPasskeys } from "../_components/account/passkey-list"

type Confirm =
  | { kind: "session"; id: string; device: string }
  | { kind: "consent"; clientId: string; name: string }
  | { kind: "signOut" }

/** Onglet Profil : transposition de apps/mobile/src/app/(tabs)/profile.tsx. */
export default function ProfilePage() {
  const user = useQuery(api.profile.getCurrentUser)
  const sessions = useQuery(api.sessions.listMine)
  const consents = useQuery(api.oauthConsents.listMine)
  const accounts = useQuery(api.iboite.accounts.listMine)
  const revokeSession = useMutation(api.sessions.revoke)
  const revokeConsent = useMutation(api.oauthConsents.revokeForClient)
  const [passkeys, setPasskeys] = React.useState<number | null>(null)
  const [confirm, setConfirm] = React.useState<Confirm | null>(null)

  React.useEffect(() => {
    let alive = true
    void loadPasskeys()
      .then((list) => alive && setPasskeys(list.length))
      .catch((err) => alive && setPasskeys(err instanceof PasskeyUnavailableError ? -1 : null))
    return () => {
      alive = false
    }
  }, [])

  const profile = user?.profile
  const pivot = profile?.pivot
  const loa = (profile?.loa ?? 1) as 1 | 2 | 3
  const address = accounts?.[0]
  const residence = address?.isAddressConfigured ? [address.district, address.city].filter(Boolean).join(", ") : null

  const named = (sessions ?? []).map((s) => ({ ...s, device: deviceLabel(s.device, s.userAgent) }))
  const otherSessions = named.filter((s) => !s.isCurrent)
  const current = named.find((s) => s.isCurrent)

  async function signOut() {
    clearLastAccount()
    try {
      await authClient.signOut()
    } catch {
      // La session locale est effacée de toute façon par le client.
    }
    // Rechargement complet : repart d'un client Convex sans session et
    // l'emporte sur la redirection « ?redirect_to=/profile » de la coquille.
    window.location.replace("/sign-in")
  }

  const passkeySub =
    passkeys === -1
      ? "Pas encore disponible sur le service IDN"
      : passkeys === null
        ? "Gérer la connexion biométrique"
        : passkeys === 0
          ? "Aucune clé d’accès enregistrée"
          : `${passkeys} clé${passkeys > 1 ? "s" : ""} d’accès enregistrée${passkeys > 1 ? "s" : ""}`

  return (
    <Screen header={<AppBar title="Sécurité et profil" />}>
      <Link
        href="/profile/edit"
        aria-label="Modifier mon profil"
        className="-mx-1 mt-5 flex items-center gap-3.5 rounded-[14px] px-1 py-1 outline-none hover:bg-idn-surface-2/60 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar photoUrl={profile?.photoUrl} initials={initialsOf(pivot?.firstName, pivot?.lastName, user?.email)} size={64} />
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-idn-ink">{pivot ? `${pivot.firstName} ${pivot.lastName}` : "…"}</span>
          <span className="mt-0.5 block truncate text-[13px] text-idn-muted">{user?.email ?? ""}</span>
          <LevelBadge level={loa} className="mt-1.5" />
        </span>
      </Link>

      <SectionTitle>Identité</SectionTitle>
      <Card>
        <Row icon="pin" title="NIP" sub={pivot?.nip ? maskNip(pivot.nip) : "Non renseigné"} mono={!!pivot?.nip} chevron href="/settings/security" />
        <Row icon="smartphone" title="Téléphone" sub={pivot?.phone ?? "Non renseigné"} chevron href="/profile/edit" />
        <Row
          icon="pinLoc"
          title="Résidence"
          sub={residence || "À renseigner dans iBoîte"}
          chevron
          href={address ? `/iboite/address-setup?accountId=${address._id}` : "/iboite"}
        />
        <Row icon="idCard" title="Ma carte d’identité" sub="Présenter mon QR" chevron href="/id-card" />
      </Card>

      <SectionTitle>Connexion</SectionTitle>
      <Card>
        <Row
          icon="scanFace"
          title="Biométrie et clés d’accès"
          sub={passkeySub}
          right={passkeys && passkeys > 0 ? <Badge tone="green" icon="check">Activé</Badge> : null}
          chevron
          href="/settings/security"
        />
        <Row icon="lock" title="Changer le code PIN" chevron href="/settings/security?action=pin" />
        <Row icon="smartphone" title="Changer de téléphone" sub="Vérification par SMS du nouveau numéro" chevron href="/profile/edit" />
      </Card>

      <SectionTitle action={sessions && sessions.length > 3 ? "Tout voir" : undefined} actionHref="/settings/sessions">
        Appareils
      </SectionTitle>
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
              <RowAction danger ariaLabel={`Déconnecter ${s.device}`} onClick={() => setConfirm({ kind: "session", id: s.id, device: s.device })}>
                Déconnecter
              </RowAction>
            }
          />
        ))}
        {sessions && sessions.length > 0 ? <Row icon="laptop" title="Gérer mes appareils" chevron href="/settings/sessions" /> : null}
      </Card>

      <SectionTitle action={consents && consents.length ? "Tout voir" : undefined} actionHref="/consents">
        Apps autorisées
      </SectionTitle>
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
                <RowAction danger ariaLabel={`Révoquer ${c.appName}`} onClick={() => setConfirm({ kind: "consent", clientId: c.clientId, name: c.appName })}>
                  Révoquer
                </RowAction>
              }
            />
          ))
        )}
      </Card>

      <SectionTitle>Préférences</SectionTitle>
      <Card>
        <Row icon="bell" title="Notifications" chevron href="/settings/notifications" />
        <Row icon="palette" title="Apparence" chevron href="/settings/appearance" />
        <Row icon="globe" title="Langue" chevron href="/settings/language" />
        <Row icon="activity" title="Journal d’activité" chevron href="/activity" />
        <Row icon="file" title="Mes pièces justificatives" chevron href="/settings/documents" />
      </Card>

      <SectionTitle>Aide et informations</SectionTitle>
      <Card>
        <Row icon="shieldPlain" title="Confidentialité et données" sub="Export de tes données, suppression du compte" chevron href="/settings/privacy" />
        <Row icon="chat" title="Aide et contact" chevron href="/settings/support" />
        <Row icon="fingerprint" title="À propos d’Identité Numérique" chevron href="/settings/about" />
      </Card>

      <div className="mt-7 flex flex-col gap-2">
        <IdnButton variant="ghost" full onClick={() => setConfirm({ kind: "signOut" })}>
          Se déconnecter
        </IdnButton>
        <IdnButton variant="dangerGhost" full href="/settings/privacy?action=delete">
          Supprimer mon compte
        </IdnButton>
      </div>

      <ConfirmDialog
        open={confirm?.kind === "session"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Déconnecter cet appareil ?"
        description={confirm?.kind === "session" ? `${confirm.device} devra se reconnecter avec ton code PIN.` : undefined}
        confirmLabel="Déconnecter"
        destructive
        onConfirm={async () => {
          if (confirm?.kind === "session") await revokeSession({ sessionId: confirm.id })
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "consent"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "consent" ? `Révoquer l’accès de ${confirm.name} ?` : ""}
        description="L’application ne pourra plus lire tes informations. Tu devras l’autoriser à nouveau pour t’y connecter."
        confirmLabel="Révoquer"
        destructive
        onConfirm={async () => {
          if (confirm?.kind === "consent") await revokeConsent({ clientId: confirm.clientId })
        }}
      />
      <ConfirmDialog
        open={confirm?.kind === "signOut"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title="Se déconnecter ?"
        description="Tu devras saisir ton adresse IDN et ton code PIN pour revenir."
        confirmLabel="Se déconnecter"
        destructive
        onConfirm={signOut}
      />
    </Screen>
  )
}
