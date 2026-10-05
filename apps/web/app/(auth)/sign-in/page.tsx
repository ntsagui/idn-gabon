"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { IdnButton } from "@/app/_components/idn/button"
import { Icon } from "@/app/_components/idn/icons"
import { IdnInput } from "@/app/_components/idn/input"
import { ErrorNote, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { OtpInput } from "@/app/_components/idn/otp-input"
import { authClient } from "@/lib/auth-client"
import { syncCrossDomainCookiesForProxy } from "@/lib/auth-cookie"
import { normalizeIdnIdentifier } from "@/lib/citizen/idn-identifier"
import { getLastAccount, initialsOf, type LastAccount } from "@/lib/citizen/last-account"
import { BIOMETRIC, biometricEnabledFor, isServerFailure, passkeyErrorMessage, passkeysSupported } from "@/lib/citizen/passkeys"
import {
  authorizeFederatedSignIn,
  getProviderRedirect,
  hasAuthorizationRequest,
  resumeFederatedSignIn,
} from "@/lib/federated-sign-in"
import { buildPostLoginRedirect, isFederatedSignIn } from "@/lib/oauth-flow"

import { AuthAppBar, AuthScreen } from "../_components/auth-screen"
import { CrossDeviceQr } from "../_components/cross-device-qr"
import { PinLogin, Spinner } from "../_components/pin-login"
import { safeRedirectTo } from "../_lib/redirect"

type Phase = "loading" | "handle" | "pin" | "password" | "two-factor"
type AuthResult = Parameters<typeof getProviderRedirect>[0]
type ErrorBody = { code?: string; status?: number; message?: string } | null

export default function SignInPage() {
  return (
    <React.Suspense fallback={null}>
      <SignIn />
    </React.Suspense>
  )
}

/**
 * Connexion (apps/mobile/src/app/(auth)/login.tsx et two-factor.tsx) :
 * adresse @idn.ga mémorisée, puis PIN à 6 chiffres ou biométrie, puis
 * double authentification si le compte l'a activée.
 *
 * Capacités propres au web conservées : connexion depuis un autre appareil
 * par QR, mot de passe pour les comptes sans PIN (créés par un organisme),
 * reprise d'une autorisation OAuth (`/oauth2/authorize`, `redirect_to`).
 */
function SignIn() {
  const router = useRouter()
  const params = useSearchParams()

  // Deux destinations possibles après authentification :
  //  - connexion ordinaire au portail → un chemin interne validé ;
  //  - connexion fédérée (app partenaire) → rejeu de /oauth2/authorize via le
  //    proxy de cette origine, seul porteur du cookie de session.
  const isOAuthFlow = isFederatedSignIn(params)
  const redirectTo = isOAuthFlow ? buildPostLoginRedirect(params) : safeRedirectTo(params.get("redirect_to"), "/dashboard")
  const authorizationParams = params.toString()
  const isAuthorizationRequest = hasAuthorizationRequest(params)
  const paramIdentifier = params.get("identifier") ?? ""

  const [checkingSession, setCheckingSession] = React.useState(isAuthorizationRequest)
  const [sessionError, setSessionError] = React.useState(false)
  const sessionCheck = React.useRef<{ query: string; promise: Promise<string | null> } | null>(null)

  React.useEffect(() => {
    if (!isAuthorizationRequest) {
      setCheckingSession(false)
      return
    }
    let cancelled = false
    setCheckingSession(true)
    setSessionError(false)
    // Réutiliser la promesse évite deux autorisations en React StrictMode.
    if (sessionCheck.current?.query !== authorizationParams) {
      sessionCheck.current = {
        query: authorizationParams,
        promise: resumeFederatedSignIn(new URLSearchParams(authorizationParams), authClient),
      }
    }
    void sessionCheck.current.promise
      .then((url) => {
        if (cancelled) return
        if (url) window.location.replace(url)
        else setCheckingSession(false)
      })
      .catch(() => {
        if (!cancelled) setSessionError(true)
      })
    return () => {
      cancelled = true
    }
  }, [authorizationParams, isAuthorizationRequest])

  const [phase, setPhase] = React.useState<Phase>("loading")
  const [identifier, setIdentifier] = React.useState(paramIdentifier)
  const [last, setLast] = React.useState<LastAccount | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pinSetupRequired, setPinSetupRequired] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [qrOpen, setQrOpen] = React.useState(false)
  const [tfMode, setTfMode] = React.useState<"totp" | "backup">("totp")
  const [tfCode, setTfCode] = React.useState("")
  const [faceId, setFaceId] = React.useState(false)

  const normalized = normalizeIdnIdentifier(identifier)

  // Le dernier compte de ce navigateur mène directement au PIN, comme le verrou mobile.
  React.useEffect(() => {
    const account = getLastAccount()
    setLast(account)
    const fromParam = paramIdentifier ? normalizeIdnIdentifier(paramIdentifier) : null
    if (paramIdentifier) {
      if (fromParam) enterPin(fromParam.email)
      else setPhase("handle")
    } else if (account) {
      setIdentifier(account.email)
      enterPin(account.email)
    } else {
      setPhase("handle")
    }
    // Une seule fois par adresse reçue : relancer la biométrie à chaque rendu
    // rouvrirait la fenêtre du navigateur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramIdentifier])

  /** PIN, précédé de la biométrie si ce compte l'a activée dans ce navigateur. */
  function enterPin(email: string) {
    setPhase("pin")
    const enabled = biometricEnabledFor(email)
    setFaceId(enabled)
    if (enabled) void signInWithPasskey(email)
  }

  function goToPin(e?: React.FormEvent) {
    e?.preventDefault()
    if (!normalized) {
      setError("Saisis une adresse IDN valide.")
      return
    }
    setError(null)
    setPinSetupRequired(false)
    enterPin(normalized.email)
  }

  function backToHandle() {
    setPhase("handle")
    setError(null)
    setPinSetupRequired(false)
    setPassword("")
  }

  /**
   * Aiguillage post-authentification.
   *
   * En flux fédéré on ne peut pas se contenter d'un `router.push` : le plugin
   * crossDomainClient garde la session en localStorage, pas en cookie HTTP.
   * Il faut donc la recopier sur `document.cookie` pour que le proxy
   * `/api/auth/*` la transmette à Convex, puis suivre nous-mêmes la redirection
   * que renvoie `/oauth2/authorize` (consentement, ou retour direct au
   * partenaire si le consentement est déjà enregistré).
   */
  async function goToDestination(result: AuthResult) {
    const providerUrl = getProviderRedirect(result)
    if (providerUrl) {
      window.location.assign(providerUrl)
      return
    }
    if (isAuthorizationRequest) {
      const url = await authorizeFederatedSignIn(new URLSearchParams(authorizationParams), authClient)
      window.location.assign(url)
      return
    }
    if (params.get("client_id") && params.get("code")) {
      throw new Error("Missing OIDC reauthentication redirect")
    }
    if (!isOAuthFlow) {
      router.push(redirectTo)
      router.refresh()
      return
    }

    try {
      syncCrossDomainCookiesForProxy(authClient)
    } catch (err) {
      console.error("[idn:sign-in] failed to write document.cookie", err)
    }

    let nextUrl: string | null = null
    try {
      const r = await fetch(redirectTo, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      if (r.redirected) {
        nextUrl = r.url
      } else {
        const body = (await r.json().catch(() => null)) as { redirect?: boolean; url?: string } | null
        if (body?.url) nextUrl = body.url
      }
    } catch (err) {
      console.error("[idn:sign-in] authorize fetch threw", err)
    }

    window.location.assign(nextUrl ?? redirectTo)
  }

  async function afterSignIn(result: AuthResult) {
    // 2FA requise : Better Auth n'a pas ouvert de session, il faut valider
    // le code TOTP (ou un code de secours).
    if ((result?.data as { twoFactorRedirect?: boolean } | undefined)?.twoFactorRedirect) {
      setSubmitting(false)
      setTfMode("totp")
      setTfCode("")
      setError(null)
      setPhase("two-factor")
      return
    }
    await goToDestination(result)
  }

  async function signInWithPin(entered: string) {
    if (submitting || !normalized) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authClient.$fetch("/sign-in/pin", {
        method: "POST",
        body: { email: normalized.email, pin: entered },
      })
      const errorBody = (res?.error ?? null) as ErrorBody
      if (errorBody) {
        const code = errorBody.code
        setPinSetupRequired(code === "PIN_SETUP_REQUIRED")
        if (code === "EMAIL_NOT_VERIFIED") setError("Adresse non vérifiée. Termine ton inscription ou contacte le support.")
        else if (code === "PIN_SETUP_REQUIRED") setError("Ce compte n’a pas encore de code PIN. Vérifie ton numéro de mobile pour en créer un.")
        else if (errorBody.status === 429) setError("Trop de tentatives. Réessaie plus tard.")
        else if (code === "INVALID_PIN") setError("Adresse ou code PIN incorrect.")
        else setError("Connexion impossible pour le moment. Réessaie.")
        setSubmitting(false)
        return
      }
      await afterSignIn(res)
    } catch {
      setPinSetupRequired(false)
      setError("Connexion impossible pour le moment. Réessaie.")
      setSubmitting(false)
    }
  }

  async function signInWithPasskey(email: string) {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      // Service sans clés d'accès : on le dit avant d'ouvrir la fenêtre du navigateur.
      if (!(await passkeysSupported())) {
        setError(passkeyErrorMessage({ status: 500 }, ""))
        setSubmitting(false)
        return
      }
      const res = await authClient.signIn.passkey()
      if (res?.error) {
        // Le client WebAuthn renvoie des messages anglais (« Auth cancelled ») :
        // hors panne du service, on garde le message du mobile.
        setError(passkeyErrorMessage(isServerFailure(res.error) ? res.error : null, `La connexion par ${BIOMETRIC} n’a pas abouti. Saisis ton code PIN.`))
        setSubmitting(false)
        return
      }
      // La clé choisie par le navigateur peut appartenir à un autre compte.
      if ((res?.data as { user?: { email?: string } } | undefined)?.user?.email?.toLowerCase() !== email) {
        try { await authClient.signOut() } catch { /* ignore */ }
        setError("Cette clé d’accès appartient à un autre compte. Saisis ton code PIN.")
        setSubmitting(false)
        return
      }
      await afterSignIn(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Connexion par ${BIOMETRIC} impossible.`)
      setSubmitting(false)
    }
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !normalized || !password) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await authClient.signIn.email({ email: normalized.email, password })
      if (res?.error) {
        const code = res.error.code as string | undefined
        setError(
          code === "INVALID_EMAIL_OR_PASSWORD"
            ? "Adresse ou mot de passe incorrect."
            : code === "EMAIL_NOT_VERIFIED"
              ? "Adresse non vérifiée. Termine ton inscription ou contacte le support."
              : res.error.status === 429
                ? "Trop de tentatives. Réessaie plus tard."
                : "Connexion impossible pour le moment. Réessaie."
        )
        setSubmitting(false)
        return
      }
      await afterSignIn(res)
    } catch {
      setError("Connexion impossible pour le moment. Réessaie.")
      setSubmitting(false)
    }
  }

  const isBackup = tfMode === "backup"
  const canVerify = isBackup ? tfCode.trim().length > 0 : tfCode.trim().length === 6

  async function verifySecondFactor(e?: React.FormEvent) {
    e?.preventDefault()
    if (submitting || !canVerify) return
    setSubmitting(true)
    setError(null)
    try {
      const res = isBackup
        ? await authClient.twoFactor.verifyBackupCode({ code: tfCode.trim() })
        : await authClient.twoFactor.verifyTotp({ code: tfCode.trim() })
      if (res?.error) {
        setError(isBackup ? "Code de secours invalide ou déjà utilisé." : "Code incorrect. Vérifie ton application d’authentification.")
        setTfCode("")
        setSubmitting(false)
        return
      }
      await goToDestination(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vérification impossible. Réessaie.")
      setTfCode("")
      setSubmitting(false)
    }
  }

  function forgotPinHref(): string {
    const next = new URLSearchParams(params.toString())
    next.delete("identifier")
    if (normalized) next.set("identifier", normalized.email)
    const qs = next.toString()
    return qs ? `/forgot-pin?${qs}` : "/forgot-pin"
  }

  if (checkingSession) {
    return (
      <AuthScreen>
        <div className="flex flex-col items-center pt-24 text-center md:pt-0">
          {sessionError ? null : <Spinner label="Reprise de ta session" />}
          <p role={sessionError ? "alert" : "status"} className="mt-4 text-sm text-idn-muted">
            {sessionError
              ? "La connexion à ton application n’a pas pu être reprise. Réessaie depuis cette application."
              : "Reprise de ta session Identité Numérique…"}
          </p>
        </div>
      </AuthScreen>
    )
  }

  if (phase === "loading") return null

  if (phase === "two-factor") {
    return (
      <AuthScreen
        header={<AuthAppBar title="Double authentification" onBack={backToHandle} />}
        footer={
          <>
            <IdnButton full onClick={() => void verifySecondFactor()} disabled={!canVerify} loading={submitting}>
              Vérifier
            </IdnButton>
            <IdnButton
              variant="ghost"
              full
              onClick={() => {
                setTfMode((m) => (m === "totp" ? "backup" : "totp"))
                setTfCode("")
                setError(null)
              }}
            >
              {isBackup ? "Utiliser mon application d’authentification" : "Utiliser un code de secours"}
            </IdnButton>
          </>
        }
      >
        <ScreenTitle
          title={isBackup ? "Code de secours" : "Code de ton application"}
          lead={
            isBackup
              ? "Saisis l’un des codes de secours que tu as conservés lors de l’activation."
              : "Ouvre ton application d’authentification et saisis le code à 6 chiffres affiché pour IDN."
          }
        />
        <form onSubmit={verifySecondFactor} className="mt-6">
          {isBackup ? (
            <IdnInput
              label="Code de secours"
              value={tfCode}
              onChange={(e) => setTfCode(e.target.value)}
              autoCapitalize="none"
              autoComplete="one-time-code"
              spellCheck={false}
              mono
              autoFocus
            />
          ) : (
            <OtpInput
              value={tfCode}
              onChange={(v) => {
                setError(null)
                setTfCode(v)
              }}
              autoFocus
              error={!!error}
            />
          )}
        </form>
        <ErrorNote>{error}</ErrorNote>
      </AuthScreen>
    )
  }

  if (phase === "password" && normalized) {
    return (
      <AuthScreen
        header={<AuthAppBar title="Mot de passe" onBack={() => setPhase("pin")} />}
        footer={
          <>
            <IdnButton type="submit" form="signin-password" full disabled={!password} loading={submitting}>
              Se connecter
            </IdnButton>
            <IdnButton variant="ghost" full onClick={() => { setError(null); setPhase("pin") }}>
              Utiliser mon code PIN
            </IdnButton>
          </>
        }
      >
        <ScreenTitle
          title="Ton mot de passe"
          lead={<span className="font-mono">{normalized.email}</span>}
        />
        <form id="signin-password" onSubmit={signInWithPassword} className="mt-6">
          <IdnInput
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setError(null)
              setPassword(e.target.value)
            }}
            autoFocus
            required
          />
        </form>
        <p className="mt-3 text-right">
          <Link href="/forgot-password" className="rounded-[6px] text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
            Mot de passe oublié ?
          </Link>
        </p>
        <ErrorNote>{error}</ErrorNote>
      </AuthScreen>
    )
  }

  if (phase === "pin" && normalized) {
    const known = last && last.email.toLowerCase() === normalized.email ? last : null
    return (
      <AuthScreen header={<AuthAppBar border={false} onBack={backToHandle} />} contentClassName="flex flex-col">
        <PinLogin
          initials={initialsOf(known?.firstName, known?.lastName, normalized.handle)}
          title={known?.firstName ? `Bon retour, ${known.firstName}` : "Saisis ton code PIN"}
          subtitle={known?.firstName ? "Saisis ton code PIN à 6 chiffres" : <span className="font-mono">{normalized.email}</span>}
          onComplete={signInWithPin}
          busy={submitting}
          error={error}
          onClearError={() => setError(null)}
          onFaceId={faceId ? () => void signInWithPasskey(normalized.email) : undefined}
          links={[
            { label: pinSetupRequired ? "Configurer mon PIN" : "Code PIN oublié ?", href: forgotPinHref() },
            ...(pinSetupRequired
              ? [{ label: "Utiliser mon mot de passe", onClick: () => { setError(null); setPhase("password") } }]
              : []),
            { label: "Autre compte", onClick: backToHandle },
          ]}
        />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      header={
        <>
          <div className="hidden justify-center pb-2 md:flex">
            <IdnLottie name="logo" size={64} label="Logo animé Identité Numérique du Gabon" />
          </div>
          <AuthAppBar title="Connexion" back="/" />
        </>
      }
      footer={
        <>
          <IdnButton type="submit" form="signin-handle" full disabled={!normalized}>
            Continuer
          </IdnButton>
          <IdnButton
            variant="ghost"
            full
            className="hidden md:inline-flex"
            onClick={() => setQrOpen(true)}
            leadIcon={<Icon name="qr" size={18} />}
          >
            Se connecter avec mon téléphone
          </IdnButton>
          <AccountLinks className="mt-4 hidden md:block" />
        </>
      }
    >
      <ScreenTitle title="Ton adresse IDN" lead="Saisis ton adresse @idn.ga pour te connecter." />
      <form id="signin-handle" onSubmit={goToPin} className="mt-6">
        <IdnInput
          label="Adresse IDN"
          value={identifier}
          onChange={(e) => {
            setError(null)
            setIdentifier(e.target.value.toLowerCase().trim())
          }}
          placeholder="prenom.nom@idn.ga"
          hint="Avec ou sans @idn.ga"
          type="text"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          mono
          autoFocus
        />
      </form>
      <ErrorNote>{error}</ErrorNote>
      <AccountLinks className="mt-6 md:hidden" />
      {qrOpen ? (
        <CrossDeviceQr
          onClose={() => setQrOpen(false)}
          onApproved={(approvedEmail) => {
            setQrOpen(false)
            setIdentifier(approvedEmail)
            setError(null)
            setPinSetupRequired(false)
            setPhase("pin")
          }}
        />
      ) : null}
    </AuthScreen>
  )
}

/** Liens vers l'inscription et la récupération d'un compte créé par un organisme. */
function AccountLinks({ className }: { className?: string }) {
  const cls = "rounded-[6px] font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
  return (
    <div className={className}>
      <p className="text-center text-sm text-idn-muted">
        Pas encore de compte ?{" "}
        <Link href="/sign-up" className={cls}>
          Créer mon compte
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-idn-muted">
        Identité créée par un organisme ?{" "}
        <Link href="/claim" className={cls}>
          Récupérer mon compte
        </Link>
      </p>
    </div>
  )
}
