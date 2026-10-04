import { normalizeRecoveryPhone } from "./phone"

/**
 * Clé de rapprochement d'identité pivot.
 *
 * Deux inscriptions du même individu se reconnaissent au triplet
 * (nom, prénom, date de naissance). Les trois composantes sont
 * nécessaires : rapprocher sur le seul nom produirait des faux positifs
 * entre homonymes — et un faux positif ici finit par la suppression du
 * compte d'un innocent.
 *
 * La normalisation retire les accents (`NFD` + suppression des
 * diacritiques), passe en minuscules et compacte les espaces : « Jean
 * MBADINGA », « jean  mbadinga » et « Jean Mbadinga » désignent la même
 * personne dans un registre d'état civil.
 *
 * Le séparateur `|` ne peut pas apparaître dans un nom saisi, ce qui
 * évite qu'un couple (nom, prénom) différent produise la même clé.
 */

/** Minuscules, sans accents, espaces compactés. */
export function normalizeIdentityPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Clé stable d'une identité pivot : `nom|prénom|AAAA-MM-JJ`.
 * La date de naissance est déjà normalisée (ISO) par le schéma.
 */
export function normalizeIdentityKey(
  firstName: string,
  lastName: string,
  dateOfBirth: string,
): string {
  return [
    normalizeIdentityPart(lastName),
    normalizeIdentityPart(firstName),
    dateOfBirth.trim(),
  ].join("|")
}

/**
 * NIP normalisé pour le contrôle d'unicité : majuscules, sans espaces.
 *
 * Le NIP admet des lettres (`/^[A-Za-z0-9]{14}$/`), donc une comparaison brute
 * laisserait `abc…` et `ABC…` coexister alors qu'ils désignent le même numéro.
 * Renvoie `undefined` pour une valeur vide, afin que l'absence de NIP ne
 * produise pas une clé `""` qui rapprocherait entre eux tous les comptes sans
 * NIP.
 */
export function normalizeNipKey(nip: string | undefined): string | undefined {
  const trimmed = nip?.replace(/\s+/g, "").toUpperCase()
  return trimmed ? trimmed : undefined
}

/**
 * Clés dérivées d'une identité pivot. Point de passage unique : tout code qui
 * écrit un `pivot` doit écrire ces clés dans le même `patch`/`insert`, sinon
 * l'index part en dérive silencieuse et le contrôle anti-doublon laisse
 * passer.
 */
export function derivePivotKeys(pivot: {
  firstName: string
  lastName: string
  dateOfBirth: string
  nip?: string
  phone?: string
  nationality?: string
}): { pivotKey: string; nipKey: string | undefined; phoneKey: string | null } {
  return {
    pivotKey: normalizeIdentityKey(
      pivot.firstName,
      pivot.lastName,
      pivot.dateOfBirth,
    ),
    nipKey: normalizeNipKey(pivot.nip),
    phoneKey: normalizeRecoveryPhone(pivot.phone, pivot.nationality),
  }
}

/**
 * Verdict d'une collision d'identité.
 *
 *   • `refuse` — un compte **vérifié** (LoA ≥ 2) porte déjà cette identité.
 *     C'est la seule situation de quasi-certitude : un KYC humain ou
 *     automatique a rattaché ces informations à une personne réelle.
 *   • `flag`   — seuls des comptes déclaratifs (LoA 1) la portent. On laisse
 *     passer et on ouvre un dossier d'arbitrage.
 *   • `allow`  — personne.
 *
 * POURQUOI NE PAS REFUSER SUR UN LoA 1 : rien n'y est vérifié. Refuser sur
 * cette base offrirait un déni de service trivial — il suffirait de créer un
 * compte au nom (ou au NIP) de quelqu'un pour l'empêcher à jamais de
 * s'inscrire. Le coût d'un faux positif est porté par un citoyen innocent qui
 * ne peut plus accéder à ses droits ; celui d'un faux négatif est un dossier
 * de plus dans une file de revue.
 */
export type IdentityCollisionVerdict = "allow" | "flag" | "refuse"

export function decideIdentityCollision(
  existing: ReadonlyArray<{ loa: number }>,
): IdentityCollisionVerdict {
  if (existing.length === 0) return "allow"
  return existing.some((e) => e.loa >= 2) ? "refuse" : "flag"
}
