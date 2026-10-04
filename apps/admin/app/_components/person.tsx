import Link from "next/link"

import { personLabel, type PersonLike } from "../_lib/format"

/**
 * Personne dans une liste : le nom (ou l'email) en clair, l'ID IDN ou
 * l'identifiant technique en mono secondaire, avec un lien vers la fiche.
 */
export function PersonCell({
  person,
  link = true,
  secondary = "id",
}: {
  person: PersonLike | null | undefined
  link?: boolean
  secondary?: "id" | "email"
}) {
  if (!person) {
    return <span className="text-[13px] text-idn-muted">Système</span>
  }
  const label = personLabel(person)
  const sub =
    secondary === "email" && person.name && person.email
      ? person.email
      : (person.idnId ?? person.userId)
  const main =
    link && person.exists !== false ? (
      <Link
        href={`/users/${encodeURIComponent(person.userId)}`}
        className="truncate rounded-sm font-medium text-idn-ink outline-none hover:text-idn-green hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
      >
        {label}
      </Link>
    ) : (
      <span className="truncate font-medium text-idn-ink">{label}</span>
    )
  return (
    <span className="flex min-w-0 flex-col text-[13px] leading-5">
      {main}
      <span className="truncate font-mono text-[11px] leading-4 text-idn-muted">
        {sub}
      </span>
    </span>
  )
}
