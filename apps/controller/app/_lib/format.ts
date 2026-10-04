/**
 * Mise en forme des données pour l'humain : dates à l'heure de Libreville,
 * durées relatives (« depuis 54 j », jamais « 1300h 49min »), nombres fr-FR.
 */

export const TIME_ZONE = "Africa/Libreville"

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const numberFormat = new Intl.NumberFormat("fr-FR")
export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

/** « 12 min », « 3 h », « 54 j », « 4 mois » — durée écoulée, arrondie vers le bas. */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, ms)
  if (safe < MIN) return "moins d'1 min"
  if (safe < HOUR) return `${Math.floor(safe / MIN)} min`
  if (safe < DAY) return `${Math.floor(safe / HOUR)} h`
  const days = Math.floor(safe / DAY)
  if (days < 60) return `${days} j`
  return `${Math.floor(days / 30)} mois`
}

/** « depuis 54 j » — ancienneté d'une attente. */
export function waitingSince(ts: number, now: number): string {
  return `depuis ${formatDuration(now - ts)}`
}

/** « il y a 3 j » / « dans 2 h » / « à l'instant ». */
export function relativeTime(ts: number, now: number): string {
  const diff = ts - now
  const abs = Math.abs(diff)
  if (abs < MIN) return "à l'instant"
  const label = formatDuration(abs)
  return diff < 0 ? `il y a ${label}` : `dans ${label}`
}

/** Seuils de délai d'une demande en attente : sobre, trois paliers. */
export type DelayTone = "ok" | "attention" | "late"
export function delayTone(ts: number, now: number): DelayTone {
  const age = now - ts
  if (age >= 7 * DAY) return "late"
  if (age >= 3 * DAY) return "attention"
  return "ok"
}

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const dateOnly = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
})
const timeOnly = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
})
const timeSeconds = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})
const weekdayLong = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
})
const weekdayShort = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
})

export const formatDateTime = (ts: number) => dateTime.format(ts)
export const formatDate = (ts: number) => dateOnly.format(ts)
export const formatTime = (ts: number) => timeOnly.format(ts)
export const formatTimeSeconds = (ts: number) => timeSeconds.format(ts)
export const formatWeekday = (ts: number) => weekdayLong.format(ts)
export const formatWeekdayShort = (ts: number) => weekdayShort.format(ts)

/** « 1991-04-12 » → « 12 avril 1991 » (date civile, sans fuseau). */
export function formatCivilDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return iso
  return dateOnly.format(Date.UTC(y, m - 1, d, 12))
}

/** Âge révolu à partir d'une date civile ISO. */
export function ageFromIso(iso: string, now: number): number | null {
  const [y, m, d] = iso.split("-").map(Number)
  if (!y || !m || !d) return null
  const today = new Date(now)
  let age = today.getUTCFullYear() - y
  if (today.getUTCMonth() + 1 < m || (today.getUTCMonth() + 1 === m && today.getUTCDate() < d)) age--
  return age
}

const LIBREVILLE_OFFSET = HOUR
/** Minuit (Libreville) du jour contenant `ts`. */
export function startOfDay(ts: number): number {
  return Math.floor((ts + LIBREVILLE_OFFSET) / DAY) * DAY - LIBREVILLE_OFFSET
}
/** Lundi 0 h (Libreville) de la semaine contenant `ts`. */
export function startOfWeek(ts: number): number {
  const day = startOfDay(ts)
  const weekday = new Date(day + LIBREVILLE_OFFSET).getUTCDay() // 0 = dimanche
  return day - ((weekday + 6) % 7) * DAY
}
/** « 2026-10-05 » (Libreville) pour les champs `type=date`. */
export function isoDay(ts: number): string {
  return new Date(startOfDay(ts) + LIBREVILLE_OFFSET).toISOString().slice(0, 10)
}
/** Champs date + heure saisis à l'heure de Libreville → horodatage. */
export function librevilleTimestamp(day: string, time: string): number {
  return Date.parse(`${day}T${time}:00+01:00`)
}

export const DAY_MS = DAY
export const HOUR_MS = HOUR
export const MINUTE_MS = MIN

const DOCUMENT_TYPES: Record<string, string> = {
  cni_gabon: "CNI gabonaise",
  birth_certificate: "Acte de naissance",
  residence_card: "Carte de séjour",
  passport: "Passeport",
  visa: "Visa",
}
export function documentTypeLabel(type: string): string {
  return DOCUMENT_TYPES[type] ?? type
}

const GENDERS: Record<string, string> = { M: "Masculin", F: "Féminin", O: "Autre", N: "Non précisé" }
export function genderLabel(value: string): string {
  return GENDERS[value] ?? value
}

const COUNTRIES = new Intl.DisplayNames(["fr"], { type: "region" })
export function countryLabel(code: string): string {
  try {
    return COUNTRIES.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

export function fullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(" ")
}

export function initials(name: string): string {
  const parts = name.split(/[\s.-]+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}
