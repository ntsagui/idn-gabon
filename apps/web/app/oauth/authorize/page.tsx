"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useConvexAuth, useQuery } from "convex/react"
import { Suspense, useEffect, useMemo } from "react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { getCurrentUserLoa } from "@/lib/oauth-flow"

import { ConsentForm } from "./_components/consent-form"

const acrToLoa = (acr: string): number =>
  acr === "eidas3" ? 3 : acr === "eidas2" ? 2 : 1

const PARAM_KEYS = [
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "nonce",
  "response_type",
  "code_challenge",
  "code_challenge_method",
  "acr_values",
  // consent_code est ajouté par oidcProvider quand il redirige vers cette
  // page — on le forward au POST /oauth2/consent qui suit.
  "consent_code",
] as const

/**
 * Consentement « Se connecter avec IDN » vu par le citoyen, aligné sur
 * l'écran mobile (apps/mobile/src/app/consent.tsx).
 *
 * Vit sur identite.ga, le domaine qui porte le cookie de session : c'est ce qui
 * permet à /oauth2/authorize de reconnaître un usager déjà connecté sans lui
 * réafficher d'écran de connexion.
 */
export default function OAuthAuthorizePage() {
  return (
    <Suspense fallback={<Shell><Loading /></Shell>}>
      <OAuthAuthorizePageInner />
    </Suspense>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-svh flex-col bg-idn-bg">{children}</main>
}

function Loading() {
  return (
    <Screen header={<AppBar title="Autorisation" />}>
      <div className="flex justify-center py-16">
        <IdnLottie name="loader" size={72} loop label="Chargement de la demande" />
      </div>
    </Screen>
  )
}

function OAuthAuthorizePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()

  const clientId = searchParams.get("client_id") ?? ""
  const redirectUri = searchParams.get("redirect_uri") ?? ""
  const requestedScope = searchParams.get("scope") ?? ""
  const acrValues = searchParams.get("acr_values") ?? ""
  // `consent_code` est posé par oidcProvider quand il redirige ici depuis
  // /oauth2/authorize. Sa présence indique un flux de consentement légitime,
  // même sans redirect_uri en query (gardée côté serveur).
  const consentCode = searchParams.get("consent_code") ?? ""

  const oauthParams = useMemo(() => {
    const out: Record<string, string> = {}
    for (const key of PARAM_KEYS) {
      const v = searchParams.get(key)
      if (v !== null) out[key] = v
    }
    return out
  }, [searchParams])

  const continueUrl = useMemo(() => {
    const qs = new URLSearchParams(oauthParams).toString()
    return `/oauth/authorize?${qs}`
  }, [oauthParams])

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.replace(`/sign-in?redirect_to=${encodeURIComponent(continueUrl)}`)
    }
  }, [isAuthLoading, isAuthenticated, continueUrl, router])

  const me = useQuery(api.profile.getCurrentUser, isAuthenticated ? {} : "skip")
  const app = useQuery(api.oauthAuthorize.getAppForConsent, isAuthenticated && clientId ? { clientId } : "skip")
  // Une vérification déjà soumise (revue manuelle) : on ne reboucle pas en step-up.
  const latestKyc = useQuery(api.kyc.getMyLatest, isAuthenticated ? {} : "skip")

  // Deux entrées légitimes : client_id + redirect_uri (entrée directe), ou
  // client_id + consent_code (redirection d'oidcProvider).
  if (!clientId || (!redirectUri && !consentCode)) {
    return (
      <Shell>
        <ErrorScreen>Demande d’autorisation invalide : il manque l’identifiant de l’application ou le code de la demande. Relance la connexion depuis l’application partenaire.</ErrorScreen>
      </Shell>
    )
  }

  if (isAuthLoading || !isAuthenticated || me === undefined || app === undefined || latestKyc === undefined) {
    return (
      <Shell>
        <Loading />
      </Shell>
    )
  }

  if (!app) {
    return (
      <Shell>
        <ErrorScreen>Cette application n’est pas enregistrée auprès d’IDN. Ne partage rien.</ErrorScreen>
      </Shell>
    )
  }

  // En entrée directe, l'URI de retour doit être l'une de celles enregistrées.
  if (redirectUri && app.redirectUris.length > 0 && !app.redirectUris.includes(redirectUri)) {
    return (
      <Shell>
        <ErrorScreen>L’adresse de retour demandée ne correspond pas à celles enregistrées par cette application. Ne partage rien.</ErrorScreen>
      </Shell>
    )
  }

  const requestedScopes = (requestedScope || app.requestedScopes.join(" ")).split(/\s+/).filter(Boolean)
  const userLoa = getCurrentUserLoa(me)

  // Niveau exigé = max entre le minimum de l'app et `acr_values` de la requête.
  const requestedLoa = acrValues
    .split(/\s+/)
    .filter(Boolean)
    .reduce((max, acr) => Math.max(max, acrToLoa(acr)), 0)
  const requiredLoa = Math.max(app.requiredLoA, requestedLoa) as 1 | 2 | 3

  // Vérification déjà soumise : l'usager a fait sa part, le jeton portera son
  // niveau actuel et l'application suivra l'avancement (pas de boucle de step-up).
  const verificationPending =
    latestKyc !== null && ["submitted", "under_review", "complement_required"].includes(latestKyc.status)

  return (
    <Shell>
      <ConsentForm
        app={app}
        email={(me as { email?: string } | null)?.email ?? ""}
        userLoa={userLoa}
        requiredLoa={requiredLoa}
        tooLow={userLoa < requiredLoa && !verificationPending}
        continueUrl={continueUrl}
        requestedScopes={requestedScopes}
        oauthParams={oauthParams}
      />
    </Shell>
  )
}

function ErrorScreen({ children }: { children: React.ReactNode }) {
  return (
    <Screen header={<AppBar title="Autorisation" back="/dashboard" backIcon="close" />}>
      <ErrorNote className="mt-6">{children}</ErrorNote>
    </Screen>
  )
}
