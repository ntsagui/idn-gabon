"use client"

import { useMutation, useQuery } from "convex/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { cn } from "@repo/ui/lib/utils"

import { authClient } from "@/lib/auth-client"

import { errorMessage, formatDate } from "../../_components/format"
import { Icon, type IconName } from "../../_components/icons"
import { Notice, PageBody, PageHeader, Panel, StatusPill } from "../../_components/ui"

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        kicker="Compte"
        title="Paramètres"
        description="Votre profil, la sécurité de votre compte et l'apparence du portail."
      />
      <PageBody className="max-w-[880px]">
        <div className="space-y-5">
          <ProfilePanel />
          <DeveloperPanel />
          <PasswordPanel />
          <AppearancePanel />
        </div>
      </PageBody>
    </>
  )
}

function ProfilePanel() {
  const me = useQuery(api.profile.getCurrentUser)
  const session = authClient.useSession() as {
    data?: { user?: { name?: string | null } } | null
    refetch?: () => Promise<unknown>
  }
  const currentName = session.data?.user?.name ?? ""
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)
  useEffect(() => setName(currentName), [currentName])

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = name.trim()
    if (value.length < 2) {
      toast.error("Le nom doit contenir au moins 2 caractères.")
      return
    }
    setSaving(true)
    try {
      const result = await authClient.updateUser({ name: value })
      if (result?.error) throw new Error(result.error.message)
      await session.refetch?.()
      toast.success("Nom mis à jour.")
    } catch {
      toast.error("Mise à jour du nom impossible.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Profil" description="Votre nom figure sur vos demandes de mise en production.">
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">Nom et prénom</Label>
          <Input id="settings-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-email">Adresse e-mail</Label>
          <div className="flex items-center gap-2">
            <Input id="settings-email" value={me?.email ?? ""} readOnly className="h-10 bg-idn-surface-2" aria-describedby="settings-email-hint" />
            {me ? (
              <StatusPill tone={me.emailVerified ? "success" : "attention"}>
                {me.emailVerified ? "Vérifiée" : "Non vérifiée"}
              </StatusPill>
            ) : null}
          </div>
          <p id="settings-email-hint" className="text-xs text-idn-muted">
            Identifiant de connexion, modifiable depuis identite.ga.
          </p>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" disabled={saving || name.trim() === currentName}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Panel>
  )
}

function DeveloperPanel() {
  const status = useQuery(api.developer.catalog.accountStatus, {})
  return (
    <Panel title="Compte développeur">
      {status === undefined ? (
        <p className="text-sm text-idn-muted">Chargement…</p>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[56ch] text-[13px] leading-5 text-idn-muted">
            {status.verified ? (
              <p>Votre compte est validé : vous pouvez demander la mise en production de vos applications.</p>
            ) : (
              <p>
                La sandbox est ouverte à tous. La demande de mise en production exige un compte validé par un
                super-administrateur de l&apos;Identité Numérique.
              </p>
            )}
            {status.developerSince ? (
              <p className="mt-1">Développeur depuis le {formatDate(status.developerSince)}.</p>
            ) : null}
          </div>
          <StatusPill tone={status.verified ? "success" : "neutral"}>
            {status.verified ? "Validé" : "Non validé"}
          </StatusPill>
        </div>
      )}
    </Panel>
  )
}

function PasswordPanel() {
  const me = useQuery(api.profile.getCurrentUser)
  const changePassword = useMutation(api.account.changePassword)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (next.length < 12) return setError("Le nouveau mot de passe doit contenir au moins 12 caractères.")
    if (next !== confirm) return setError("Les deux nouveaux mots de passe ne correspondent pas.")
    setSaving(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      toast.success("Mot de passe modifié. Vos autres sessions ont été fermées.")
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err) {
      setError(errorMessage(err, "Modification impossible. Vérifiez le mot de passe actuel."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel title="Mot de passe" description="La modification ferme vos sessions ouvertes sur les autres appareils.">
      {me && !me.emailVerified ? (
        <Notice tone="attention" title="Adresse e-mail non vérifiée" className="mb-4">
          Le changement de mot de passe exige une adresse vérifiée. Vérifiez-la depuis identite.ga, ou utilisez «
          Mot de passe oublié » sur l&apos;écran de connexion.
        </Notice>
      ) : null}
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
        <fieldset disabled={!me?.emailVerified} className="contents">
        {error ? (
          <p role="alert" className="rounded-[10px] border border-[#B3261E]/30 bg-[#FBE9E7] px-3 py-2 text-[13px] text-[#B3261E] sm:col-span-3 dark:bg-[#3A1614] dark:text-[#F2857E]">
            {error}
          </p>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="pw-current">Mot de passe actuel</Label>
          <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-next">Nouveau mot de passe</Label>
          <Input id="pw-next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">Confirmation</Label>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-10" />
        </div>
        <div className="flex justify-end sm:col-span-3">
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? "Modification…" : "Modifier le mot de passe"}
          </Button>
        </div>
        </fieldset>
      </form>
    </Panel>
  )
}

const THEMES: Array<{ value: "light" | "dark" | "auto"; label: string; icon: IconName }> = [
  { value: "light", label: "Clair", icon: "sun" },
  { value: "dark", label: "Sombre", icon: "moon" },
  { value: "auto", label: "Selon le système", icon: "monitor" },
]

function AppearancePanel() {
  const preferences = useQuery(api.preferences.getMyPreferences)
  const updatePreferences = useMutation(api.preferences.updateMyPreferences)
  const { setTheme } = useTheme()
  const current = preferences?.theme ?? "auto"

  const choose = async (value: "light" | "dark" | "auto") => {
    setTheme(value === "auto" ? "system" : value)
    try {
      await updatePreferences({ theme: value })
      toast.success("Apparence enregistrée.")
    } catch (error) {
      toast.error(errorMessage(error, "Enregistrement impossible."))
    }
  }

  return (
    <Panel title="Apparence" description="Partagée avec vos autres espaces Identité Numérique.">
      <fieldset>
        <legend className="sr-only">Thème</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <label
              key={theme.value}
              className={cn(
                "flex h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border px-3 text-sm font-medium focus-within:outline-2 focus-within:outline-idn-green",
                current === theme.value
                  ? "border-idn-green bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                  : "border-idn-border text-idn-ink-2 hover:bg-idn-surface-2",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={theme.value}
                checked={current === theme.value}
                onChange={() => void choose(theme.value)}
                className="sr-only"
              />
              <Icon name={theme.icon} size={17} />
              {theme.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Panel>
  )
}
