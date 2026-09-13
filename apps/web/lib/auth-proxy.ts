type RedirectPayload = {
  redirect?: unknown
  url?: unknown
}

/**
 * Better Auth renvoie `{ redirect: true, url }` quand le fetch serveur du
 * proxy porte `sec-fetch-mode: cors`. Pour une navigation HTML initiée par le
 * navigateur, le proxy doit restaurer le 302 attendu par le protocole OAuth.
 */
export function getBrowserRedirectUrl({
  requestMode,
  requestAccept,
  responseStatus,
  responseContentType,
  responseBody,
}: {
  requestMode: string | null
  requestAccept: string | null
  responseStatus: number
  responseContentType: string | null
  responseBody: ArrayBuffer
}): string | null {
  const isDocumentNavigation =
    requestMode === "navigate" || requestAccept?.includes("text/html") === true

  if (
    !isDocumentNavigation ||
    responseStatus < 200 ||
    responseStatus >= 300 ||
    !responseContentType?.toLowerCase().includes("application/json")
  ) {
    return null
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(responseBody),
    ) as RedirectPayload
    if (payload.redirect !== true || typeof payload.url !== "string") {
      return null
    }

    const url = new URL(payload.url)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

/**
 * Les fetch OAuth attendent du JSON. Certains rejets Better Auth utilisent
 * pourtant un 302 : le navigateur ne doit pas suivre ce retour comme un fetch
 * vers le client OAuth (HTML ou CORS) avant que le formulaire puisse naviguer.
 */
export function getFetchRedirectUrl({
  requestMode,
  responseStatus,
  location,
  upstreamUrl,
}: {
  requestMode: string | null
  responseStatus: number
  location: string | null
  upstreamUrl: string
}): string | null {
  if (
    requestMode !== "cors" ||
    ![301, 302, 303, 307, 308].includes(responseStatus) ||
    !location
  )
    return null

  try {
    const url = new URL(location, upstreamUrl)
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}
