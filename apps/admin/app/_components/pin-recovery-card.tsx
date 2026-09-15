"use client"

import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { RecoveryCodeCard } from "./recovery-code-card"

/**
 * Code provisoire de PIN : voie de secours quand l’envoi automatique par SMS
 * est bloqué (carte « Récupération du PIN par SMS ») ou n’arrive pas. Le
 * citoyen le saisit sur `/forgot-pin`, « J’ai déjà un code provisoire ».
 */
export function PinRecoveryCard(props: {
  userId: string
  idnId?: string
  email: string
  authExists: boolean
  deletedAt?: number
  hasAdminRole: boolean
}) {
  const generate = useMutation(api.admin.accounts.generatePinResetCode)
  return (
    <RecoveryCodeCard
      {...props}
      title="Récupération du PIN par code provisoire"
      intro="Créez un code provisoire si l’envoi automatique par SMS est bloqué ou si l’utilisateur ne reçoit pas le code. Vérifiez son identité avant de lui remettre le code."
      confirmInputId="confirm-pin-recovery"
      issue={generate}
      instruction={(email) => (
        <>
          L’utilisateur ouvre <strong>identite.ga/forgot-pin</strong>, saisit{" "}
          <strong>{email}</strong>, puis choisit « J’ai déjà un code
          provisoire » avant de choisir son nouveau PIN.
        </>
      )}
    />
  )
}
