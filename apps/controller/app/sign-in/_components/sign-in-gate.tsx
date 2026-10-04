"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useConvexAuth, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { authClient } from "@/lib/auth-client"

import { shell } from "../../_content/fr"
import { safeRedirectTo } from "../../_lib/redirect"
import { SignInForm } from "./sign-in-form"

/**
 * `/sign-in` : formulaire si aucune session ; redirection immédiate vers la
 * page demandée si un contrôleur est déjà connecté. Tant que la session est
 * inconnue, rien que le cadre de la page (pas de formulaire entrevu).
 */
export function SignInGate() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = safeRedirectTo(params.get("redirect_to"), "/")
  const { isAuthenticated, isLoading } = useConvexAuth()
  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : "skip")
  const isController = Boolean(me?.roles?.includes("identity_controller"))
  const deniedRole = isAuthenticated && me !== undefined && !isController

  React.useEffect(() => {
    if (isAuthenticated && isController) router.replace(redirectTo)
  }, [isAuthenticated, isController, redirectTo, router])

  const resolving = isLoading || (isAuthenticated && (me === undefined || isController))

  return (
    <div className="flex min-h-svh flex-col bg-idn-bg">
      <main className="mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center px-5 py-12">
        <div className="flex items-center gap-3">
          <IdnMark size={40} />
          <div>
            <p className="text-base font-semibold leading-tight text-idn-ink">{shell.brand}</p>
            <p className="mt-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              {shell.portal}
            </p>
          </div>
        </div>
        <IdnFlagBars width="100%" height={3} className="mt-5" />

        {resolving ? (
          <div aria-busy="true" aria-label="Vérification de la session" className="mt-8 h-[320px]" />
        ) : (
          <>
            {deniedRole || params.get("motif") === "role" ? (
              <div
                role="alert"
                className="mt-8 rounded-lg border border-[#B3261E]/30 bg-[#FBE9E7] px-4 py-3 text-sm text-[#8C1D18] dark:bg-[#3A1E1E] dark:text-[#FF8A80]"
              >
                <p className="font-medium">Ce compte n&apos;est pas habilité au contrôle d&apos;identité.</p>
                {deniedRole && (
                  <button
                    type="button"
                    onClick={() => void authClient.signOut().then(() => window.location.reload())}
                    className="mt-1 text-[13px] font-medium underline underline-offset-2"
                  >
                    Se connecter avec un autre compte
                  </button>
                )}
              </div>
            ) : null}
            {!deniedRole && <SignInForm redirectTo={redirectTo} />}
          </>
        )}
      </main>
      <footer className="border-t border-idn-border px-5 py-4 text-center text-xs text-idn-muted">
        Accès réservé aux agents habilités. Chaque connexion et chaque contrôle sont journalisés.
      </footer>
    </div>
  )
}
