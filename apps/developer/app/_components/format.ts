/**
 * Formats humains du portail (fr-FR) : dates relatives, nombres, dates.
 * Jamais de durée brute en heures (« 1300 h ») : au-delà d'un jour on parle
 * en jours, au-delà de deux mois en mois.
 */

const numberFormat = new Intl.NumberFormat("fr-FR")
const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})

export const formatNumber = (value: number): string => numberFormat.format(value)

export const formatDate = (timestamp: number): string =>
  dateFormat.format(new Date(timestamp))

export const formatDateTime = (timestamp: number): string =>
  dateTimeFormat.format(new Date(timestamp))

/** `AAAA-MM-JJ` → « 4 oct. » */
export const formatDayKey = (key: string): string =>
  dayFormat.format(new Date(`${key}T00:00:00Z`))

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** « à l'instant », « il y a 5 min », « il y a 3 h », « il y a 12 j », « il y a 4 mois ». */
export function formatRelative(timestamp: number, now = Date.now()): string {
  const delta = now - timestamp
  if (delta < 0) {
    const ahead = -delta
    if (ahead < HOUR) return `dans ${Math.max(1, Math.round(ahead / MINUTE))} min`
    if (ahead < DAY) return `dans ${Math.round(ahead / HOUR)} h`
    return `dans ${Math.round(ahead / DAY)} j`
  }
  if (delta < MINUTE) return "à l'instant"
  if (delta < HOUR) return `il y a ${Math.round(delta / MINUTE)} min`
  if (delta < DAY) return `il y a ${Math.round(delta / HOUR)} h`
  const days = Math.round(delta / DAY)
  if (days < 60) return `il y a ${days} j`
  const months = Math.round(days / 30)
  if (months < 24) return `il y a ${months} mois`
  return `il y a ${Math.round(days / 365)} ans`
}

/** Message lisible d'une erreur Convex (ConvexError { message }) ou JS. */
export function errorMessage(error: unknown, fallback = "Une erreur est survenue."): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data
    if (data && typeof data === "object" && "message" in data) {
      const message = (data as { message?: unknown }).message
      if (typeof message === "string" && message) return message
    }
    if (typeof data === "string" && data) return data
  }
  return fallback
}

/** Code d'une ConvexError, s'il existe. */
export function errorCode(error: unknown): string | null {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data
    if (data && typeof data === "object" && "code" in data) {
      const code = (data as { code?: unknown }).code
      if (typeof code === "string") return code
    }
  }
  return null
}

export const pluralize = (count: number, singular: string, plural: string) =>
  `${formatNumber(count)} ${count > 1 ? plural : singular}`
