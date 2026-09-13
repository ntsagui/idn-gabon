import { NextRequest, NextResponse } from "next/server"

import { getBrowserRedirectUrl, getFetchRedirectUrl } from "@/lib/auth-proxy"

const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL

if (!CONVEX_SITE_URL) {
  console.error("missing envar CONVEX_SITE_URL")
}

const isDev = process.env.NODE_ENV !== "production"

const HOP_BY_HOP = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  // Node's fetch décompresse automatiquement la réponse upstream. Si on
  // forward `content-encoding: gzip|br|...` au browser alors que le body
  // est déjà en clair, le browser plante avec ERR_CONTENT_DECODING_FAILED.
  // Idem `content-length` qui ne correspond plus à la taille décompressée.
  "content-encoding",
  "content-length",
])

async function proxyToConvex(req: NextRequest): Promise<NextResponse> {
  if (!CONVEX_SITE_URL) {
    return NextResponse.json(
      { error: "CONVEX_SITE_URL not configured" },
      { status: 500 },
    )
  }

  const url = new URL(req.url)
  const targetUrl = `${CONVEX_SITE_URL}${url.pathname}${url.search}`

  const proxyHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key)) {
      proxyHeaders[key] = value
    }
  })
  // NB : ne PAS forcer `accept-encoding: application/json` (faute initiale —
  // c'est une valeur Accept, pas Accept-Encoding). Ça confondait Better Auth
  // qui retournait `{ redirect: true, url }` JSON au lieu d'un 302 sur les
  // redirects du flow OAuth (/oauth2/authorize, /oauth2/consent). On laisse
  // l'`Accept` du browser passer tel quel — Better Auth voit alors
  // `text/html` et renvoie un vrai 302.
  proxyHeaders["host"] = new URL(CONVEX_SITE_URL).host

  // Le plugin crossDomainClient stocke la session dans localStorage (pas dans
  // des cookies HTTP). Le client la recopie vers document.cookie pour qu'elle
  // voyage avec la requête vers le proxy, en strippant TOUJOURS le préfixe
  // `__Secure-` (le browser le refuse sur http://localhost, et le bridge
  // crossDomain le strip sans condition — cf. sign-in finishSignIn).
  // Convex, lui, tourne en baseURL https et pose/attend des cookies `__Secure-`
  // quel que soit l'env. On remet donc le préfixe à l'aller — en dev ET en
  // prod —, sinon le middleware session côté Convex ne retrouve pas le cookie
  // qu'il a posé et renvoie l'utilisateur vers /sign-in (la boucle de login
  // observée en production sur le flow /oauth2/authorize).
  // NB : le regex ne matche que `better-auth.*`, jamais `__Secure-better-auth.*`
  // déjà préfixé — pas de double préfixe sur les cookies natifs.
  if (proxyHeaders["cookie"]) {
    proxyHeaders["cookie"] = proxyHeaders["cookie"]
      .split(/;\s*/)
      .map((kv) => {
        const eq = kv.indexOf("=")
        if (eq < 0) return kv
        const name = kv.slice(0, eq)
        if (/^better-auth\./.test(name)) {
          return `__Secure-${kv}`
        }
        return kv
      })
      .join("; ")
  }

  if (isDev) {
     
    console.log("[auth-proxy]", req.method, url.pathname, {
      cookie: proxyHeaders["cookie"] ?? "(none)",
    })
  }
  try {
    const body =
      req.method !== "GET" && req.method !== "HEAD"
        ? await req.arrayBuffer()
        : undefined

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: proxyHeaders,
      redirect: "manual",
      body,
      // @ts-expect-error duplex required for streaming body
      duplex: "half",
    })

    const responseBody = await upstream.arrayBuffer()
    const headers = new Headers()

    upstream.headers.forEach((value, key) => {
      const lk = key.toLowerCase()
      if (lk === "set-cookie" || HOP_BY_HOP.has(lk)) return
      headers.set(key, value)
    })

    // Re-écriture des Set-Cookie : en dev, le navigateur refuse les
    // cookies `__Secure-` / `Secure` posés sur http://localhost. On strip.
    const setCookies = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() as
      | string[]
      | undefined
    if (setCookies && setCookies.length > 0) {
      const rewritten = isDev
        ? setCookies.map((cookie: string) =>
            cookie.replaceAll("__Secure-", "").replace(/;\s*Secure/gi, ""),
          )
        : setCookies
      for (const cookie of rewritten) {
        headers.append("set-cookie", cookie)
      }
    }

    // Le fetch serveur vers Convex est vu comme `cors` par Better Auth, même
    // quand la requête entrante était une navigation browser. oidcProvider
    // renvoie alors `{ redirect: true, url }` au lieu d'un 302. Restaurer ici
    // la sémantique de navigation évite d'afficher ce JSON à l'utilisateur.
    const browserRedirectUrl = getBrowserRedirectUrl({
      requestMode: req.headers.get("sec-fetch-mode"),
      requestAccept: req.headers.get("accept"),
      responseStatus: upstream.status,
      responseContentType: upstream.headers.get("content-type"),
      responseBody,
    })
    if (browserRedirectUrl) {
      headers.set("location", browserRedirectUrl)
      headers.delete("content-type")
      return new NextResponse(null, { status: 302, headers })
    }

    const fetchRedirectUrl = getFetchRedirectUrl({
      requestMode: req.headers.get("sec-fetch-mode"),
      responseStatus: upstream.status,
      location: upstream.headers.get("location"),
      upstreamUrl: targetUrl,
    })
    if (fetchRedirectUrl) {
      headers.delete("location")
      headers.set("content-type", "application/json")
      return NextResponse.json(
        { redirect: true, url: fetchRedirectUrl },
        { headers },
      )
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers,
    })
  } catch (error) {
    console.error("[auth] proxy error:", error)
    return NextResponse.json({ error: "Internal auth error" }, { status: 502 })
  }
}

export async function GET(req: NextRequest) {
  return proxyToConvex(req)
}
export async function POST(req: NextRequest) {
  return proxyToConvex(req)
}
export async function PUT(req: NextRequest) {
  return proxyToConvex(req)
}
export async function PATCH(req: NextRequest) {
  return proxyToConvex(req)
}
export async function DELETE(req: NextRequest) {
  return proxyToConvex(req)
}
export async function OPTIONS(req: NextRequest) {
  return proxyToConvex(req)
}
