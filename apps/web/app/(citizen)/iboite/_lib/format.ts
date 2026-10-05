/**
 * Helpers d'affichage iBoîte (dates relatives et longues, adresse), alignés
 * sur apps/mobile/src/lib/iboite-adapter.ts.
 */

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "À l’instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 2) return "Hier"
  if (d < 7) return `Il y a ${d} j`
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

export function formatLongDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

type AddressFields = {
  isAddressConfigured: boolean
  district: string | null
  city: string
  addressLine: string | null
  street: string
}

/**
 * Première ligne d’adresse affichable (`formatAddressLine` du mobile) :
 * quartier + ville, sinon ville, sinon adresse complète, sinon rue ;
 * `null` si l’adresse n’est pas configurée.
 */
export function formatAddressLine(a: AddressFields): string | null {
  if (!a.isAddressConfigured) return null
  const parts = [a.district, a.city].filter((s): s is string => Boolean(s && s.trim()))
  if (parts.length > 0) return parts.join(", ")
  if (a.addressLine && a.addressLine.trim()) return a.addressLine
  if (a.street && a.street.trim()) return a.street
  return null
}
