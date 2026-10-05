import { Card, DetailRow, IconTile, Note } from "@/app/_components/idn/list"

const TZ = "Africa/Libreville"
const DATE = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" })
const TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Rendez-vous réservé (prototype « l3-confirm »). */
export function Level3Confirm({
  scheduledAt,
  scheduledEndAt,
  controllerName,
  reference,
  now,
}: {
  scheduledAt: number
  scheduledEndAt?: number
  controllerName?: string
  reference: string
  now: number
}) {
  const minutes = scheduledEndAt ? Math.round((scheduledEndAt - scheduledAt) / 60_000) : undefined
  return (
    <>
      <div className="mt-6 flex flex-col items-center text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-c-green-badge">
          <IconTile icon="calendarCheck" tone="green" size={44} />
        </div>
        <h2 className="mt-3 text-xl font-semibold text-idn-ink">Rendez-vous réservé</h2>
        <p className="mt-1 text-sm text-idn-muted">
          {/* Le backend n'envoie le rappel que si le rendez-vous est à plus de 24 h. */}
          {scheduledAt - now > 24 * 3_600_000 + 60_000 ? "Un rappel te sera envoyé la veille." : "Une confirmation t’a été envoyée par notification et e-mail."}
        </p>
      </div>
      <Card className="mt-5 px-0">
        <dl className="divide-y divide-idn-border px-3.5">
          <DetailRow label="Date" value={cap(DATE.format(scheduledAt))} />
          <DetailRow label="Heure" value={`${TIME.format(scheduledAt)}${minutes ? ` · ${minutes} min` : ""}`} />
          <DetailRow label="Format" value="Visio dans l’application" />
          <DetailRow label="Contrôleur" value={controllerName ?? "Contrôleur IDN"} />
          <DetailRow label="Référence" value={reference} mono />
        </dl>
      </Card>
      <Note>La salle d’attente ouvre 15 min avant l’heure. Garde ta CNI à portée de main.</Note>
    </>
  )
}
