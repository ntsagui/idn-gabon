"use client"

import { useAction } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { RecoveryCodeCard } from "./recovery-code-card"

/**
 * Code provisoire de mot de passe : accepté par la route Better Auth déjà
 * utilisée par le portail (`/reset-password`, « J’ai déjà un code
 * provisoire »).
 */
export function PasswordRecoveryCard(props: {
  userId: string
  idnId?: string
  email: string
  authExists: boolean
  deletedAt?: number
  hasAdminRole: boolean
}) {
  const generate = useAction(api.admin.accounts.generatePasswordResetCode)
  return (
    <RecoveryCodeCard
      {...props}
      title="Récupération du mot de passe"
      intro="Créez un code provisoire si l’utilisateur ne reçoit pas le code de récupération. Vérifiez son identité avant de lui remettre le code."
      confirmInputId="confirm-password-recovery"
      issue={generate}
      instruction={(email) => (
        <>
          L’utilisateur ouvre <strong>identite.ga/forgot-password</strong>,
          saisit <strong>{email}</strong>, puis choisit « J’ai déjà un code
          provisoire » avant de définir son nouveau mot de passe.
        </>
      )}
    />
  )
}
