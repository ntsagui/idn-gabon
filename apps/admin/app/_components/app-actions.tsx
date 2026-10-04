"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { ConvexError } from "convex/values"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"

import { ConfirmDialog } from "./confirm-dialog"

type Pending = "approve" | "reject" | "suspend" | "reactivate" | null

function message(err: unknown, fallback: string) {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : fallback
}

/**
 * Actions de la fiche d'application.
 *
 * - Demande de passage en production (déposée par un développeur) : approuver
 *   ou refuser, toujours via le client_id Sandbox.
 * - Application créée par la console en attente : approuver.
 * - Suspendre / réactiver (`admin.appControl`) : coupe tous les
 *   environnements et restaure ensuite l'état exact d'avant.
 */
export function AppActions({
  clientId,
  name,
  status,
  sandboxClientId,
  productionStatus,
  suspended,
}: {
  clientId: string
  name: string
  status: "production" | "pending" | "sandbox" | "disabled"
  sandboxClientId: string | null
  productionStatus: "none" | "pending" | "approved" | "rejected"
  suspended: boolean
}) {
  const router = useRouter()
  const approveApp = useMutation(api.admin.oauthApps.approveApp)
  const approveRequest = useMutation(api.admin.oauthApps.approveProductionRequest)
  const rejectRequest = useMutation(api.admin.oauthApps.rejectProductionRequest)
  const suspend = useMutation(api.admin.appControl.suspend)
  const reactivate = useMutation(api.admin.appControl.reactivate)
  const [pending, setPending] = useState<Pending>(null)

  const isProdRequest = productionStatus === "pending" && Boolean(sandboxClientId)
  const canApprove = !suspended && (isProdRequest || status === "pending" || status === "disabled")

  const run = async (fn: () => Promise<unknown>, success: string, fallback: string) => {
    try {
      await fn()
      toast.success(success)
    } catch (err) {
      toast.error(message(err, fallback))
      throw err
    }
  }

  const dialogs: Record<
    Exclude<Pending, null>,
    {
      title: string
      consequence: string
      confirmLabel: string
      destructive?: boolean
      reasonLabel?: string
      action: (reason: string) => Promise<void>
    }
  > = {
    approve: {
      title: isProdRequest ? "Approuver la demande de production" : "Approuver pour la production",
      consequence: isProdRequest
        ? `L'environnement Production de « ${name} » est activé sur l'émetteur OIDC : de vrais citoyens pourront s'y connecter.`
        : `« ${name} » passe en production et devient utilisable par les citoyens.`,
      confirmLabel: "Approuver",
      action: () =>
        run(
          () =>
            isProdRequest && sandboxClientId
              ? approveRequest({ clientId: sandboxClientId })
              : approveApp({ clientId }),
          "Application approuvée pour la production.",
          "Approbation impossible.",
        ),
    },
    reject: {
      title: "Refuser la demande de production",
      consequence:
        "La Sandbox reste utilisable ; l'environnement Production n'est pas activé. Le développeur voit la demande refusée et le motif.",
      confirmLabel: "Refuser la demande",
      destructive: true,
      reasonLabel: "Motif communiqué au développeur (facultatif)",
      action: async (reason) => {
        await run(
          () => rejectRequest({ clientId: sandboxClientId!, reason: reason || undefined }),
          "Demande de production refusée.",
          "Refus impossible.",
        )
        if (sandboxClientId && sandboxClientId !== clientId) {
          router.push(`/apps/${encodeURIComponent(sandboxClientId)}`)
        }
      },
    },
    suspend: {
      title: `Suspendre « ${name} »`,
      consequence:
        "Tous les environnements de l'application sont désactivés immédiatement : plus aucune connexion « Se connecter avec IDN » n'aboutit. Vous pourrez la réactiver dans son état actuel.",
      confirmLabel: "Suspendre l'application",
      destructive: true,
      reasonLabel: "Motif de la suspension (journalisé)",
      action: (reason) =>
        run(
          () => suspend({ clientId, reason: reason || undefined }),
          "Application suspendue.",
          "Suspension impossible.",
        ),
    },
    reactivate: {
      title: `Réactiver « ${name} »`,
      consequence:
        "Chaque environnement retrouve l'état qu'il avait avant la suspension. Une demande de production en attente reste en attente.",
      confirmLabel: "Réactiver",
      action: () =>
        run(() => reactivate({ clientId }), "Application réactivée.", "Réactivation impossible."),
    },
  }

  const current = pending ? dialogs[pending] : null

  return (
    <>
      {suspended ? (
        <Button size="sm" onClick={() => setPending("reactivate")}>
          Réactiver
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPending("suspend")}
            className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2A49E] dark:hover:bg-[#3A1513]"
          >
            Suspendre
          </Button>
          {isProdRequest ? (
            <Button size="sm" variant="outline" onClick={() => setPending("reject")}>
              Refuser la demande
            </Button>
          ) : null}
          {canApprove ? (
            <Button size="sm" onClick={() => setPending("approve")}>
              {isProdRequest ? "Approuver la demande" : "Approuver pour la production"}
            </Button>
          ) : null}
        </>
      )}

      {current ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={current.title}
          consequence={current.consequence}
          confirmLabel={current.confirmLabel}
          destructive={current.destructive}
          reasonLabel={current.reasonLabel}
          onConfirm={current.action}
        />
      ) : null}
    </>
  )
}
