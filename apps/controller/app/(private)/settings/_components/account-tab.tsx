"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"
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

import { describeError } from "../../../_lib/errors"
import { settings } from "./content"
import { SettingsRow, SettingsSection } from "./settings-section"


export function AccountTab() {
  const me = useQuery(api.profile.getCurrentUser)

  if (me === undefined) {
    return <div className="h-40 animate-pulse rounded-xl bg-secondary" />
  }
  if (me === null) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Session introuvable. Reconnectez-vous.
      </div>
    )
  }

  const firstName = me.profile?.pivot?.firstName ?? ""
  const lastName = me.profile?.pivot?.lastName ?? ""
  const fullName = [firstName, lastName].filter(Boolean).join(" ")

  return (
    <div className="space-y-5">
      <SettingsSection title={settings.account.title} sub={settings.account.sub}>
        <SettingsRow
          label={settings.account.nameLabel}
          trailing={
            <span className="text-sm text-foreground">
              {fullName || me.email.split("@")[0]}
            </span>
          }
        />
        <SettingsRow
          label={settings.account.emailLabel}
          description={settings.account.emailHelper}
          trailing={<span className="text-sm text-foreground">{me.email}</span>}
        />
        <SettingsRow
          label={settings.account.roleLabel}
          trailing={
            <span className="rounded-full bg-idn-green-soft px-2 py-0.5 text-xs font-semibold text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark">
              {settings.account.roleValue}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection title={settings.password.title} sub={settings.password.sub}>
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
      setError(settings.password.errorTooShort)
      return
    }
    if (currentPassword === newPassword) {
      setError(settings.password.errorSame)
      return
    }
    setSubmitting(true)
    try {
      await changePassword({ currentPassword, newPassword })
      toast.success(settings.password.successToast)
      setOpen(false)
      reset()
    } catch (err) {
      const msg = describeError(err, "Le mot de passe n'a pas pu être modifié. Vérifiez le mot de passe actuel.")
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsRow
      label={settings.password.title}
      description={settings.password.newHint}
      trailing={
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o)
            if (!o) reset()
          }}
        >
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {settings.password.cta}
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{settings.password.modalTitle}</DialogTitle>
              <DialogDescription>{settings.password.newHint}</DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ctrl-pwd-current">
                  {settings.password.currentLabel}
                </Label>
                <Input
                  id="ctrl-pwd-current"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11"
                  value={currentPassword}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ctrl-pwd-new">{settings.password.newLabel}</Label>
                <Input
                  id="ctrl-pwd-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="h-11"
                  value={newPassword}
                  onChange={(e) => setNew(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setOpen(false)}
                >
                  {settings.password.cancel}
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "…" : settings.password.submit}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  )
}
