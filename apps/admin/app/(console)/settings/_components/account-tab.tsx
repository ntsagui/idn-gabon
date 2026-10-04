"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { fr } from "../../../_content/fr"
import {
  SettingsRow,
  SettingsSection,
} from "../../../_components/settings-section"

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  if (err instanceof Error) return err.message
  return fallback
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  identity_controller: "Contrôleur d'Identité",
  developer: "Développeur",
}

export function AccountTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const me = useQuery(api.profile.getCurrentUser) as any

  if (me === undefined) {
    return <div className="adm-skeleton h-40" />
  }
  if (me === null) {
    return (
      <div className="adm-panel p-6 text-sm text-idn-muted">
        Session introuvable. Reconnectez-vous.
      </div>
    )
  }

  const firstName = me.profile?.pivot?.firstName ?? ""
  const lastName = me.profile?.pivot?.lastName ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ")
  const primaryRole =
    me.roles?.includes("admin")
      ? "admin"
      : me.roles?.includes("identity_controller")
        ? "identity_controller"
        : me.roles?.includes("developer")
          ? "developer"
          : null

  return (
    <div className="space-y-5">
      <SettingsSection
        title={fr.settings.account.title}
        sub={fr.settings.account.sub}
      >
        <SettingsRow
          label={fr.settings.account.nameLabel}
          trailing={
            <span className="text-sm text-foreground">
              {fullName || me.email.split("@")[0]}
            </span>
          }
        />
        <SettingsRow
          label={fr.settings.account.emailLabel}
          description={fr.settings.account.emailHelper}
          trailing={<span className="text-sm text-foreground">{me.email}</span>}
        />
        <SettingsRow
          label={fr.settings.account.roleLabel}
          trailing={
            <span className="rounded-full bg-idn-green-soft px-2.5 py-0.5 text-xs font-medium text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark">
              {(primaryRole && ROLE_LABEL[primaryRole]) ??
                fr.settings.account.roleValue}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection
        title={fr.settings.password.title}
        sub={fr.settings.password.sub}
      >
        <PasswordChangeRow />
      </SettingsSection>
    </div>
  )
}

function PasswordChangeRow() {
  const [open, setOpen] = React.useState(false)
  const [currentPassword, setCurrent] = React.useState("")
  const [newPassword, setNew] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const changePassword = useMutation(api.account.changePassword)

  const reset = () => {
    setCurrent("")
    setNew("")
    setError(null)
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (newPassword.length < 12) {
      setError(fr.settings.password.errorTooShort)
      return
    }
    if (currentPassword === newPassword) {
      setError(fr.settings.password.errorSame)
      return
    }
    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      toast.success(fr.settings.password.successToast)
      setOpen(false)
      reset()
    } catch (err) {
      setError(describeError(err, "Erreur"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsRow
      label={fr.settings.password.title}
      description={fr.settings.password.newHint}
      trailing={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) reset()
          }}
        >
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {fr.settings.password.cta}
          </Button>
          <DialogContent className="shadow-none">
            <DialogHeader>
              <DialogTitle>{fr.settings.password.modalTitle}</DialogTitle>
              <DialogDescription>
                {fr.settings.password.newHint}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="admin-pwd-current">
                  {fr.settings.password.currentLabel}
                </Label>
                <Input
                  id="admin-pwd-current"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11"
                  value={currentPassword}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-pwd-new">
                  {fr.settings.password.newLabel}
                </Label>
                <Input
                  id="admin-pwd-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="h-11"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                />
              </div>
              {error ? (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setOpen(false)}
                >
                  {fr.settings.password.cancel}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : fr.settings.password.submit}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  )
}
