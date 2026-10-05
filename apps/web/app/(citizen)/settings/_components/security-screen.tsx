"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { cleanError, ConfirmDialog, IdnDialog } from "@/app/_components/idn/dialog"
import { IdnInput } from "@/app/_components/idn/input"
import { Card, ErrorNote, Note, Row, RowAction, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { maskNip } from "@/lib/citizen/nip-format"
import { authClient } from "@/lib/auth-client"
import { deletePasskey, passkeyErrorMessage, PasskeyUnavailableError, setBiometricForSession, type Passkey } from "@/lib/citizen/passkeys"

import { useNotice } from "../../_components/account/notice"
import { loadPasskeys as fetchPasskeys } from "../../_components/account/passkey-list"
import { IdnSwitch } from "../../_components/account/switch"
import { PinChangeDialog } from "./pin-change-dialog"

function fmtDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
}

/** Saisie du NIP (`NipChangeModal` du mobile). */
function NipDialog({ open, currentNip, onClose, onDone }: { open: boolean; currentNip?: string; onClose: () => void; onDone: () => void }) {
  const updateNip = useMutation(api.profile.updateNip)
  const [nip, setNip] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setNip("")
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[A-Za-z0-9]{14}$/.test(nip)) {
      setError("Le NIP doit contenir exactement 14 lettres ou chiffres.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await updateNip({ nip })
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? cleanError(caught.message) : "Mise à jour impossible.")
      setSubmitting(false)
    }
  }

  return (
    <IdnDialog
      open={open}
      onOpenChange={(o) => !o && !submitting && onClose()}
      title="Numéro d’identification (NIP)"
      description={
        currentNip
          ? "Ton NIP figure sur ta carte d’identité. Corrige-le seulement s’il est erroné."
          : "Saisis le NIP de 14 caractères inscrit sur ta carte d’identité."
      }
    >
      <form onSubmit={submit} noValidate>
        <IdnInput
          label="NIP"
          value={nip}
          onChange={(e) => setNip(e.target.value.replace(/\s+/g, "").toUpperCase().slice(0, 14))}
          placeholder={currentNip ?? "14 lettres ou chiffres"}
          autoCapitalize="characters"
          autoComplete="off"
          mono
          autoFocus
          error={error ?? undefined}
        />
        <IdnButton type="submit" full className="mt-4" loading={submitting} disabled={nip.length !== 14}>
          Enregistrer
        </IdnButton>
      </form>
    </IdnDialog>
  )
}

/**
 * Mot de passe : propre au web. La connexion par mot de passe existe encore
 * sur le site (écran de connexion, « mot de passe oublié ») ; on garde donc
 * son changement, comme l'ancien onglet Sécurité.
 */
function PasswordDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const changePassword = useMutation(api.account.changePassword)
  const [current, setCurrent] = React.useState("")
  const [next, setNext] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setCurrent("")
      setNext("")
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (next.length < 12) {
      setError("Le nouveau mot de passe doit contenir au moins 12 caractères.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? cleanError(caught.message) : "Modification impossible.")
      setSubmitting(false)
    }
  }

  return (
    <IdnDialog
      open={open}
      onOpenChange={(o) => !o && !submitting && onClose()}
      title="Changer le mot de passe"
      description="Au moins 12 caractères. Tes autres appareils seront déconnectés."
    >
      <form onSubmit={submit} noValidate>
        <IdnInput label="Mot de passe actuel" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <IdnInput
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          error={error ?? undefined}
        />
        <IdnButton type="submit" full className="mt-4" loading={submitting} disabled={!current || !next}>
          Enregistrer
        </IdnButton>
      </form>
    </IdnDialog>
  )
}

/** Sécurité : transposition de apps/mobile/src/app/settings/security.tsx. */
export function SecurityScreen({ initialAction }: { initialAction?: string }) {
  const user = useQuery(api.profile.getCurrentUser)
  const [pinOpen, setPinOpen] = React.useState(initialAction === "pin")
  const [nipOpen, setNipOpen] = React.useState(false)
  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [passkeys, setPasskeys] = React.useState<Passkey[] | undefined>()
  const [pkError, setPkError] = React.useState<string | null>(null)
  const [pkUnavailable, setPkUnavailable] = React.useState(false)
  const [toDelete, setToDelete] = React.useState<Passkey | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [bioError, setBioError] = React.useState<string | null>(null)
  const { notice, show } = useNotice()

  // L'action ne vaut qu'à l'arrivée depuis le Profil : un rechargement ne doit pas rouvrir la saisie.
  React.useEffect(() => {
    if (initialAction) window.history.replaceState(null, "", "/settings/security")
  }, [initialAction])

  const loadPasskeys = React.useCallback(async () => {
    try {
      setPasskeys(await fetchPasskeys())
      setPkError(null)
    } catch (caught) {
      setPasskeys([])
      setPkUnavailable(caught instanceof PasskeyUnavailableError)
      setPkError(caught instanceof Error ? caught.message : "Chargement impossible.")
    }
  }, [])

  React.useEffect(() => {
    void loadPasskeys()
  }, [loadPasskeys])

  /** Enrôlement WebAuthn (plugin passkey de Better Auth), comme `addPasskey` du mobile. */
  async function enroll(name: string, attachment: "platform" | "cross-platform", setErr: (m: string | null) => void) {
    setAdding(true)
    setErr(null)
    try {
      const result = await authClient.passkey.addPasskey({ name, authenticatorAttachment: attachment })
      if (result?.error) throw new Error(passkeyErrorMessage(result.error, "Ajout impossible."))
      if (attachment === "platform") await setBiometricForSession(true)
      await loadPasskeys()
    } catch (caught) {
      setErr(caught instanceof Error ? caught.message : "Ajout impossible.")
    } finally {
      setAdding(false)
    }
  }

  const BIO_NAME = "Biométrie de cet appareil"
  const bioEnabled = (passkeys ?? []).some((pk) => pk.name === BIO_NAME)
  const pinConfigured = user?.profile?.pinConfigured ?? false
  const currentNip = user?.profile?.pivot?.nip
  const keySummary = pkError
    ? pkError
    : passkeys === undefined
      ? "Chargement…"
      : `${passkeys.length} clé${passkeys.length > 1 ? "s" : ""} enregistrée${passkeys.length > 1 ? "s" : ""}`
  const forgotHref = user?.email ? `/forgot-pin?identifier=${encodeURIComponent(user.email)}` : "/forgot-pin"

  return (
    <Screen header={<AppBar title="Sécurité" back="/profile" />}>
      <SectionTitle>Identifiants</SectionTitle>
      <Card>
        <Row
          icon="lock"
          title={pinConfigured ? "Changer le code PIN" : "Créer un code PIN"}
          sub="6 chiffres pour te connecter et valider tes actions"
          chevron
          onClick={() => setPinOpen(true)}
        />
        <Row icon="pin" title="NIP" sub={currentNip ? maskNip(currentNip) : "Non renseigné"} mono={!!currentNip} chevron onClick={() => setNipOpen(true)} />
        <Row icon="keyRound" title="Code PIN oublié" sub="Réinitialisation par SMS" chevron href={forgotHref} />
        <Row icon="shieldPlain" title="Mot de passe" sub="Connexion par mot de passe sur le site" chevron onClick={() => setPasswordOpen(true)} />
      </Card>

      <SectionTitle>Biométrie</SectionTitle>
      {pkUnavailable ? (
        <Note className="mb-2.5 mt-0">La biométrie et les clés d’accès ne sont pas encore activées sur le service IDN. Connecte-toi avec ton code PIN en attendant.</Note>
      ) : null}
      <Card>
        <Row
          icon="scanFace"
          title={BIO_NAME}
          sub={bioEnabled ? "Connexion par la biométrie activée sur cet appareil" : "Connecte-toi par empreinte ou visage, sans saisir ton PIN"}
          right={
            <IdnSwitch
              checked={bioEnabled}
              onChange={(on) => {
                if (on) void enroll(BIO_NAME, "platform", setBioError)
                else {
                  const pk = (passkeys ?? []).find((p) => p.name === BIO_NAME)
                  if (pk) setToDelete(pk)
                }
              }}
              label={BIO_NAME}
              disabled={pkUnavailable || passkeys === undefined || adding}
            />
          }
        />
      </Card>
      <ErrorNote>{bioError}</ErrorNote>

      <SectionTitle>Clés d’accès</SectionTitle>
      {pkUnavailable ? null : (
        <p className={pkError ? "mb-2 text-[13px] leading-[19px] text-c-red-text" : "mb-2 text-[13px] leading-[19px] text-idn-muted"}>{keySummary}</p>
      )}
      <Card>
        {(passkeys ?? []).map((pk) => (
          <Row
            key={pk.id}
            icon="keyRound"
            tone="green"
            title={pk.name || "Clé sans nom"}
            sub={`Ajoutée le ${fmtDate(pk.createdAt)}`}
            right={
              <RowAction danger ariaLabel={`Supprimer ${pk.name || "la clé"}`} onClick={() => setToDelete(pk)}>
                Supprimer
              </RowAction>
            }
          />
        ))}
        <Row
          icon="plus"
          title="Ajouter une clé de sécurité"
          sub={pkUnavailable ? "Pas encore disponible" : "Clé physique ou autre appareil"}
          chevron={!pkUnavailable}
          onClick={pkUnavailable ? undefined : () => void enroll(`Clé de sécurité · ${fmtDate(Date.now())}`, "cross-platform", setPkError)}
          disabled={adding}
        />
      </Card>
      <Note>Les clés d’accès (passkeys) remplacent le mot de passe : elles restent sur ton appareil et ne sont jamais envoyées à IDN.</Note>

      <PinChangeDialog
        open={pinOpen}
        configured={pinConfigured}
        onClose={() => setPinOpen(false)}
        onDone={() => {
          setPinOpen(false)
          show("Code PIN modifié", "Ton nouveau code PIN est actif.")
        }}
      />
      <NipDialog
        open={nipOpen}
        currentNip={currentNip}
        onClose={() => setNipOpen(false)}
        onDone={() => {
          setNipOpen(false)
          show("NIP enregistré", "Ton numéro d’identification personnel est à jour.")
        }}
      />
      <PasswordDialog
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onDone={() => {
          setPasswordOpen(false)
          show("Mot de passe modifié", "Tes autres appareils ont été déconnectés.")
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer cette clé ?"
        description={toDelete ? `${toDelete.name || "Clé sans nom"} ne pourra plus servir à te connecter.` : undefined}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await deletePasskey(toDelete.id)
          if (toDelete.name === BIO_NAME) await setBiometricForSession(false)
          await loadPasskeys()
        }}
      />
      {notice}
    </Screen>
  )
}
