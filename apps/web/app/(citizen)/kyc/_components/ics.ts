/**
 * Évènement iCalendar (RFC 5545) de l'entretien Niveau 3, équivalent web de
 * l'éditeur d'évènement natif ouvert par le mobile (`expo-calendar`) : le
 * fichier .ics s'ouvre dans le calendrier de l'usager, qui valide l'ajout.
 */
function utc(ts: number): string {
  return new Date(ts).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function text(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1")
}

/** Replie les lignes à 75 octets (RFC 5545 § 3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const out: string[] = []
  let current = ""
  let size = 0
  for (const char of line) {
    const n = new TextEncoder().encode(char).length
    if (size + n > (out.length ? 74 : 75)) {
      out.push(current)
      current = ""
      size = 0
    }
    current += char
    size += n
  }
  out.push(current)
  return out.join("\r\n ")
}

export function level3Ics(args: {
  uid: string
  startsAt: number
  endsAt: number
  title: string
  description: string
  url: string
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Identite Numerique Gabon//IDN//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${args.uid}@identite.ga`,
    `DTSTAMP:${utc(Date.now())}`,
    `DTSTART:${utc(args.startsAt)}`,
    `DTEND:${utc(args.endsAt)}`,
    `SUMMARY:${text(args.title)}`,
    `DESCRIPTION:${text(args.description)}`,
    `URL:${args.url}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${text(args.title)}`,
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return lines.map(fold).join("\r\n") + "\r\n"
}

/** Déclenche le téléchargement d'un fichier texte. */
export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement("a")
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}
