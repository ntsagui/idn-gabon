// Copie de apps/mobile/src/components/documents/doc-format.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/** Formatage partagé des écrans iDocument. */

export const FILE_TYPE_LABEL: Record<string, string> = { pdf: 'PDF', image: 'Image', other: 'Fichier' };

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** Taille lisible : « 820 Ko », « 2,4 Mo ». */
export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mo`;
}

const LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatTimestamp(ts: number): string {
  return LONG.format(ts);
}

/** « 2031-04-12 » → « 12 avril 2031 » (date calendaire, sans fuseau). */
export function formatIsoDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return LONG.format(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Même seuil que `idoc.summary` côté serveur : 30 jours. */
export function expiryState(iso: string | undefined): 'expired' | 'soon' | null {
  if (!iso) return null;
  const exp = Date.parse(iso);
  if (Number.isNaN(exp)) return null;
  const left = exp - Date.now();
  if (left < 0) return 'expired';
  return left < 30 * 24 * 60 * 60 * 1000 ? 'soon' : null;
}
