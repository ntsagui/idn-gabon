"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { IdnLottie } from "@/app/_components/idn/lottie"
import { parseKycFlow } from "@/lib/kyc-flow"

import { IN_REVIEW, useKycFlow } from "./_components/flow"

/**
 * Ancienne entrée `/kyc` (liens des e-mails, notifications push, profil,
 * /oauth/authorize) : oriente vers l'écran du parcours qui correspond à
 * l'état réel du dossier, en conservant `target` et `return_to`.
 */
export default function KycEntryPage() {
  return (
    <React.Suspense fallback={null}>
      <KycEntry />
    </React.Suspense>
  )
}

function KycEntry() {
  const router = useRouter()
  const flow = useKycFlow()
  const me = useQuery(api.profile.getCurrentUser)
  const active = useQuery(api.kyc.getActiveRequest)

  React.useEffect(() => {
    if (me === undefined || active === undefined) return
    const loa = me?.profile?.loa ?? 1
    const { targetLoa } = parseKycFlow(window.location.search, loa)
    const status = active?.status
    const href = (path: string) => flow.href(path, { target: String(targetLoa) })
    if (flow.returnTo && (loa >= targetLoa || (status && IN_REVIEW.includes(status)))) {
      window.location.assign(flow.returnTo)
    } else if (status && [...IN_REVIEW, "complement_required"].includes(status)) {
      router.replace(href("/kyc/review"))
    } else if (targetLoa === 3) {
      router.replace(href("/kyc/level3"))
    } else if (loa >= 2 || status === "rejected" || status === "expired") {
      router.replace(href("/kyc/review"))
    } else {
      router.replace(href("/kyc/intro"))
    }
  }, [me, active, flow, router])

  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <IdnLottie name="loader" size={64} label="Chargement de ta vérification" />
    </div>
  )
}
