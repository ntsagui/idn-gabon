"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog"
import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"

import { fr } from "../_content/fr"

type Mode = "anonymize" | "delete"

const t = fr.users.actions

/**
 * Actions destructrices sur un compte IDN.
 *
 * Deux niveaux, jamais confondus : anonymiser laisse vivre le compte Better
 * Auth (le handle @idn.ga reste réservé), supprimer le détruit et libère le
 * handle. Comme aucune des deux n'est réversible, la modale exige la recopie
 * de l'identifiant du compte — le serveur revérifie cette saisie, la modale
 * n'est qu'un premier filet.
 */
export function UserRowActions({
  userId,
  idnId,
  email,
  deletedAt,
  showDetails = true,
  onDeleted,
}: {
  userId: string
  idnId?: string
  email: string
  deletedAt?: number
  showDetails?: boolean
  /** Appelé après une suppression définitive (la fiche n'existe plus). */
  onDeleted?: () => void
}) {
  const anonymize = useMutation(api.admin.accounts.anonymizeUser)
  const hardDelete = useMutation(api.admin.accounts.deleteUserPermanently)

  const [mode, setMode] = useState<Mode | null>(null)
  const [confirm, setConfirm] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  // Même règle que le serveur : l'IDN fait foi, l'email prend le relais
  // quand le profil n'a jamais été complété.
  const expected = idnId ?? email

  const close = () => {
    setMode(null)
    setConfirm("")
    setReason("")
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mode) return
    setBusy(true)
    try {
      const args = {
        userId,
        confirmIdnId: confirm,
        reason: reason.trim() || undefined,
      }
      if (mode === "anonymize") {
        await anonymize(args)
        toast.success(t.anonymized)
      } else {
        await hardDelete(args)
        toast.success(t.deleted)
      }
      close()
      if (mode === "delete") onDeleted?.()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {showDetails ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/users/${encodeURIComponent(userId)}`}>Ouvrir la fiche</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode("anonymize")}
          disabled={deletedAt !== undefined}
          title={deletedAt !== undefined ? "Compte déjà anonymisé" : undefined}
        >
          {t.anonymize}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMode("delete")}
          className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2A49E] dark:hover:bg-[#3A1513]"
        >
          {t.delete}
        </Button>
      </div>

      <Dialog open={mode !== null} onOpenChange={(o) => !o && !busy && close()}>
        <DialogContent className="shadow-none sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {mode === "delete" ? t.deleteTitle : t.anonymizeTitle}
            </DialogTitle>
            <DialogDescription>
              {mode === "delete" ? t.deleteBody : t.anonymizeBody}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-xs text-idn-muted">{t.auditNote}</p>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-account" className="select-text">
                {t.confirmLabel(expected)}
              </Label>
              <Input
                id="confirm-account"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                required
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delete-reason">{t.reasonLabel}</Label>
              <Input
                id="delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                {t.cancel}
              </Button>
              <Button
                type="submit"
                variant={mode === "delete" ? "destructive" : "default"}
                disabled={busy || confirm.trim() === ""}
              >
                {busy
                  ? "En cours…"
                  : mode === "delete"
                    ? "Supprimer définitivement"
                    : "Anonymiser le compte"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Les garde-fous serveur renvoient un `ConvexError` porteur d'un code —
 * on le traduit ici plutôt que d'exposer le message brut.
 */
function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const data = err.data as { code?: string; message?: string }
    switch (data?.code) {
      case "FORBIDDEN_SELF_DELETE":
        return "Vous ne pouvez pas supprimer votre propre compte."
      case "FORBIDDEN_ADMIN_TARGET":
        return "Ce compte est administrateur. Retirez-lui d'abord ce rôle depuis Rôles & habilitations."
      case "CONFIRMATION_MISMATCH":
        return "L'identifiant saisi ne correspond pas à ce compte."
      case "ALREADY_ANONYMIZED":
        return "Ce compte est déjà anonymisé."
      case "NOT_FOUND":
        return "Compte introuvable."
      default:
        return data?.message ?? "Action impossible."
    }
  }
  return err instanceof Error ? err.message : "Action impossible."
}
