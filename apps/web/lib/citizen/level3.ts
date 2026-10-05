// Copie de apps/mobile/src/lib/level3.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
export const LEVEL3_JOIN_EARLY_MS = 15 * 60 * 1000
export const LEVEL3_JOIN_LATE_MS = 30 * 60 * 1000

const DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Libreville",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
})
const TIME_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Libreville",
  hour: "2-digit",
  minute: "2-digit",
})

export function canJoinLevel3(
  startsAt: number | undefined,
  endsAt: number | undefined,
  now = Date.now(),
): boolean {
  if (startsAt === undefined || endsAt === undefined) return true
  return (
    now >= startsAt - LEVEL3_JOIN_EARLY_MS &&
    now <= endsAt + LEVEL3_JOIN_LATE_MS
  )
}

export function formatLevel3Appointment(
  startsAt: number,
  endsAt?: number,
): string {
  return `${DATE_FORMATTER.format(startsAt)} · ${TIME_FORMATTER.format(startsAt)}${endsAt ? ` – ${TIME_FORMATTER.format(endsAt)}` : ""}`
}

export function formatLevel3Time(timestamp: number): string {
  return TIME_FORMATTER.format(timestamp)
}

export function groupLevel3Slots<T extends { startsAt: number }>(
  slots: T[],
): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const slot of slots) {
    const key = DATE_FORMATTER.format(slot.startsAt)
    groups.set(key, [...(groups.get(key) ?? []), slot])
  }
  return [...groups.entries()]
}
