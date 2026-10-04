/**
 * Formats « humains » de la console : nombres fr-FR, dates relatives
 * (« il y a 3 j », « depuis 54 j »), jamais de durée brute en heures.
 */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function fmtNumber(n: number): string {
  return n.toLocaleString("fr-FR")
}

export function plural(n: number, one: string, many: string): string {
  return `${fmtNumber(n)} ${n > 1 ? many : one}`
}

/** « à l'instant », « il y a 5 min », « hier », « il y a 3 j », « dans 12 min ». */
export function relativeTime(ts: number, now = Date.now()): string {
  const diff = now - ts
  const abs = Math.abs(diff)
  const future = diff < 0
  const wrap = (s: string) => (future ? `dans ${s}` : `il y a ${s}`)
  if (abs < MINUTE) return future ? "dans un instant" : "à l'instant"
  if (abs < HOUR) return wrap(`${Math.round(abs / MINUTE)} min`)
  if (abs < DAY) return wrap(`${Math.round(abs / HOUR)} h`)
  const days = Math.round(abs / DAY)
  if (days === 1) return future ? "demain" : "hier"
  if (days < 31) return wrap(`${days} j`)
  const months = Math.round(days / 30.4)
  if (months < 12) return wrap(`${months} mois`)
  const years = Math.round(days / 365)
  return wrap(`${years} an${years > 1 ? "s" : ""}`)
}

/** « depuis 54 j », « depuis 3 h ». */
export function since(ts: number, now = Date.now()): string {
  const abs = Math.max(0, now - ts)
  if (abs < HOUR) return `depuis ${Math.max(1, Math.round(abs / MINUTE))} min`
  if (abs < DAY) return `depuis ${Math.round(abs / HOUR)} h`
  return `depuis ${fmtNumber(Math.round(abs / DAY))} j`
}

export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** Date ISO `AAAA-MM-JJ` (pivot) → « 2 janv. 1990 ». */
export function fmtIsoDay(value: string): string {
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : fmtDate(d.getTime())
}

export type PersonLike = {
  userId: string
  name?: string
  email?: string
  idnId?: string
  exists?: boolean
}

/** Nom affichable : le nom, sinon l'email, sinon un libellé explicite. */
export function personLabel(p: PersonLike | null | undefined): string {
  if (!p) return "Système"
  if (p.name) return p.name
  if (p.email) return p.email
  return p.exists === false ? "Compte introuvable" : "Compte sans nom"
}

export function initials(label: string): string {
  const parts = label
    .replace(/@.*/, "")
    .split(/[\s._-]+/)
    .filter(Boolean)
  const a = parts[0]?.[0] ?? "?"
  const b = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "")
  return (a + b).toUpperCase()
}
