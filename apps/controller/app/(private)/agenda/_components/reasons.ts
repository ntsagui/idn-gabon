export const OTHER_REASON = "autre"

/** Motifs d'annulation d'un rendez-vous, communiqués au citoyen. */
export const CANCEL_REASONS = [
  { value: "indisponible", label: "Indisponibilité du contrôleur" },
  { value: "absence", label: "Absence du citoyen à l'heure prévue" },
  { value: "demande", label: "Report demandé par le citoyen" },
  { value: "technique", label: "Problème technique empêchant l'entretien" },
  { value: OTHER_REASON, label: "Autre motif" },
]

/** Motifs de refus du Niveau 3 à l'issue de l'entretien. */
export const LEVEL3_REJECT_REASONS = [
  { value: "visage", label: "La personne ne correspond pas aux pièces présentées" },
  { value: "piece", label: "Pièce originale non présentée pendant l'entretien" },
  { value: "incoherence", label: "Réponses incohérentes avec l'identité déclarée" },
  { value: "contrainte", label: "Entretien mené sous contrainte ou par un tiers" },
  { value: OTHER_REASON, label: "Autre motif" },
]

/** Libellé choisi, suivi des précisions ; « Autre » exige des précisions. */
export function composeReason(
  options: Array<{ value: string; label: string }>,
  value: string,
  details: string,
): { message: string } | { error: string } {
  const option = options.find((o) => o.value === value)
  if (!option) return { error: "Choisissez un motif dans la liste." }
  const extra = details.trim()
  if (option.value === OTHER_REASON) {
    return extra.length >= 5 ? { message: extra } : { error: "Précisez le motif (au moins 5 caractères)." }
  }
  return { message: extra ? `${option.label} — ${extra}` : option.label }
}
