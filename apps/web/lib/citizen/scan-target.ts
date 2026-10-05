// Copie de apps/mobile/src/lib/scan-target.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
import { normalizeVerificationCode } from '@/lib/official-act-verification';

/**
 * Code d'acte porté par un QR scanné : l'URL imprimée (`…/verifier/<code>`,
 * sur identite.ga ou demarche.ga) ou le code seul. `null` sinon.
 * (Copie de `actCodeFromScan`, apps/mobile/src/lib/official-act.ts.)
 */
export function actCodeFromScan(raw: string): string | null {
  const text = raw.trim();
  const match = text.match(/\/verifier\/([0-9A-Za-z-]{12,14})(?:[/?#]|$)/);
  return normalizeVerificationCode(match ? match[1]! : text);
}

/**
 * Ce que contient un QR lu par le scanner de l'app :
 * - `act`          : acte officiel de l'administration (URL `…/verifier/<code>` ou code seul) ;
 * - `cross-device` : connexion d'un autre appareil à approuver (`idn:cross-device:<code>`) ;
 * - `presentation` : carte d'identité IDN d'un tiers (`idn:p1:…`), vérifiable par un agent seulement ;
 * - `unknown`      : tout le reste, jamais ouvert ni suivi.
 */
export type ScanTarget =
  | { kind: 'act'; code: string }
  | { kind: 'cross-device'; code: string }
  | { kind: 'presentation' }
  | { kind: 'unknown' };

const CROSS_DEVICE_PREFIX = 'idn:cross-device:';

export function classifyScan(raw: string): ScanTarget {
  const text = raw.trim();
  if (text.startsWith(CROSS_DEVICE_PREFIX)) {
    const code = text.slice(CROSS_DEVICE_PREFIX.length);
    return /^[A-Za-z0-9_-]{12,32}$/.test(code) ? { kind: 'cross-device', code } : { kind: 'unknown' };
  }
  if (text.startsWith('idn:p1:')) return { kind: 'presentation' };
  const act = actCodeFromScan(text);
  if (act) return { kind: 'act', code: act };
  return { kind: 'unknown' };
}
