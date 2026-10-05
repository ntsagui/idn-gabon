"use client"

import { useEffect, useState } from "react"
import { ConvexHttpClient } from "convex/browser"

import { api } from "@repo/backend/convex/_generated/api"
import { ErrorNote } from "@/app/_components/idn/list"
import { authClient } from "@/lib/auth-client"
import { syncCrossDomainCookiesForProxy } from "@/lib/auth-cookie"

import { AuthScreen } from "../_components/auth-screen"
import { Spinner } from "../_components/pin-login"

/**
 * Reprise de session générique pour une application partenaire.
 *
 * POURQUOI CETTE PAGE. Une app tierce (consulat.ga) exécute le parcours
 * d'inscription IDN depuis SON origine : la session qu'elle obtient est un
 * jeton bearer, pas un cookie sur identite.ga. Or `/oauth2/authorize` ne
 * regarde que le cookie. Sans cette page, le citoyen qui vient de choisir son
 * PIN se le voit redemander trois secondes plus tard sur l'écran de connexion.
 *
 * Elle échange donc un jeton à usage unique (plugin `oneTimeToken`) contre une
 * vraie session locale, puis poursuit vers `return_to`.
 *
 * SÉCURITÉ. `return_to` est une redirection pilotée par l'appelant : sans
 * contrôle, la page devient une redirection ouverte signée par identite.ga.
 * Deux voies légitimes sont acceptées (cf. `isReturnAllowed`) ; les paramètres
 * OAuth de l'app (client_id, redirect_uri, PKCE…) sont recopiés depuis la
 * query, jamais interprétés.
 */

/**
 * Voie 1 — retour direct sur l'endpoint d'autorisation. Deux origines
 * légitimes :
 *  - celle de cette app (identite.ga), désormais annoncée comme
 *    `authorization_endpoint` dans la discovery OIDC — c'est la voie normale ;
 *  - l'origine Convex, conservée pour les partenaires déjà intégrés dont les
 *    URLs pointent encore directement sur elle.
 *
 * Le pathname est contrôlé strictement (`/api/auth/oauth2/authorize`) : c'est
 * lui qui empêche cette voie de devenir une redirection ouverte. Contrôle
 * synchrone, sans réseau.
 */
function isAllowedAuthorizeUrl(raw: string, currentOrigin: string): boolean {
  const allowedOrigins = [currentOrigin]
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
  if (convexSiteUrl) {
    try {
      allowedOrigins.push(new URL(convexSiteUrl).origin)
    } catch {
      /* env malformée : on s'en tient à l'origine courante */
    }
  }

  try {
    const target = new URL(raw)
    return (
      allowedOrigins.includes(target.origin) &&
      target.pathname === "/api/auth/oauth2/authorize"
    )
  } catch {
    return false
  }
}

/**
 * `return_to` est-il autorisé ?
 *
 * Voie 1 — une URL `/api/auth/oauth2/authorize` du host IDN ou de l'origine
 * Convex (partenaire qui saute directement sur /authorize). Synchrone.
 *
 * Voie 2 — l'URL d'un partenaire dont l'ORIGINE est déclarée dans
 * `TRUSTED_ORIGINS`, vérifiée côté serveur (`partnerOrigins.isTrusted`). C'est
 * le cas de l'inscription embarquée : le partenaire nous renvoie sur SA page
 * (ex. `https://consulat.ga/register?…&idn_ready=1`), qui relance ensuite le
 * flux OIDC normal. La liste blanche n'est jamais exposée au client.
 */
async function isReturnAllowed(returnTo: string): Promise<boolean> {
  if (isAllowedAuthorizeUrl(returnTo, window.location.origin)) return true

  let origin: string
  try {
    origin = new URL(returnTo).origin
  } catch {
    return false
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
  if (!convexUrl) return false
  try {
    const convex = new ConvexHttpClient(convexUrl)
    return await convex.query(api.partnerOrigins.isTrusted, { origin })
  } catch {
    return false
  }
}

export default function AuthContinuePage() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get("token")
    const returnTo = params.get("return_to")

    // Le jeton ne doit rester ni dans l'historique ni dans un referrer.
    window.history.replaceState({}, "", "/auth-continue")

    if (!token || !returnTo) {
      setError("Le lien de connexion est invalide ou a expiré.")
      return
    }

    let cancelled = false
    const resume = async () => {
      try {
        if (!(await isReturnAllowed(returnTo))) {
          if (!cancelled)
            setError("Le lien de connexion est invalide ou a expiré.")
          return
        }

        const result = await authClient.oneTimeToken.verify({ token })
        const session = result?.data?.session as { token?: string } | undefined
        if (!session?.token) throw new Error("invalid handoff")

        // Matérialise la session en cookie sur ce domaine : c'est la seule
        // chose que `/oauth2/authorize` sait lire.
        await authClient.getSession({
          fetchOptions: {
            headers: { Authorization: `Bearer ${session.token}` },
          },
        })
        authClient.updateSession()

        // INDISPENSABLE — `crossDomainClient` garde la session en localStorage,
        // PAS en cookie HTTP. Sans cette recopie vers `document.cookie`, le
        // proxy `/api/auth/*` ne transmet rien à Convex : l'utilisateur paraît
        // connecté (l'en-tête lit le localStorage) mais `/oauth2/authorize`
        // ne voit aucune session et renvoie sur `/sign-in` avec les paramètres
        // OAuth — la boucle observée au retour d'une inscription partenaire.
        // Même geste que `goToDestination` dans la page `sign-in`.
        try {
          syncCrossDomainCookiesForProxy(authClient)
        } catch (err) {
          console.error("[idn:auth-continue] document.cookie sync failed", err)
        }

        if (!cancelled) window.location.replace(returnTo)
      } catch {
        if (!cancelled) {
          setError(
            "La connexion automatique a échoué. Reviens à l’application et connecte-toi.",
          )
        }
      }
    }

    void resume()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <AuthScreen>
      <div className="flex flex-col items-center pt-24 text-center md:pt-0">
        <h1 className="sr-only">Connexion</h1>
        {error ? (
          <ErrorNote className="self-stretch text-left">{error}</ErrorNote>
        ) : (
          <>
            <Spinner label="Connexion en cours" />
            <p className="mt-4 text-sm text-idn-muted">Connexion en cours…</p>
          </>
        )}
      </div>
    </AuthScreen>
  )
}
