/**
 * Helpers d'affichage iBoîte (dates relatives et longues, adresse), alignés
 * sur apps/mobile/src/lib/iboite-adapter.ts.
 */

/** Heure des listes (façon messagerie) : « 15:10 » aujourd’hui, « Hier », « 2 oct. », puis « 02/10/2025 ». */
export function formatListTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Hier"
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  return d.toLocaleDateString("fr-FR")
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
