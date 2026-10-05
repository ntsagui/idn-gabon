// Copie de apps/mobile/src/lib/level3-view.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
import { canJoinLevel3 } from './level3';

/**
 * Écran du parcours Niveau 3 à afficher, déduit de l'état réel de la demande
 * (prototype : présentation → créneau → confirmation → salle d'attente →
 * visio → résultat).
 */
export type Level3View = 'needs-level2' | 'intro' | 'slots' | 'confirm' | 'waiting' | 'approved' | 'rejected';

export type Level3State = {
  status: string;
  scheduledAt?: number;
  scheduledEndAt?: number;
  canJoin: boolean;
};

export function level3View(args: { loa: number; verification: Level3State | null; now: number; choosingSlot: boolean }): Level3View {
  const { loa, verification: v, now } = args;
  if (loa >= 3 || v?.status === 'approved') return 'approved';
  if (loa < 2) return 'needs-level2';
  if (!v || v.status === 'cancelled') return 'intro';
  if (v.status === 'rejected') return 'rejected';
  if (v.status === 'in_interview') return 'waiting';
  // Demande ouverte (en attente de créneau ou créneau réservé).
  if (args.choosingSlot || v.scheduledAt === undefined) return 'slots';
  if (v.canJoin || canJoinLevel3(v.scheduledAt, v.scheduledEndAt, now)) return 'waiting';
  return 'confirm';
}

const DAY_KEY = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Africa/Libreville', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Jour calendaire à Libreville (AAAA-MM-JJ), indépendant du fuseau du téléphone. */
export function librevilleDay(ts: number): string {
  return DAY_KEY.format(ts);
}

/** Créneaux regroupés par jour de Libreville, jours triés, créneaux triés. */
export function slotsByDay<T extends { startsAt: number }>(slots: T[]): { day: string; slots: T[] }[] {
  const map = new Map<string, T[]>();
  for (const s of [...slots].sort((a, b) => a.startsAt - b.startsAt)) {
    const key = librevilleDay(s.startsAt);
    map.set(key, [...(map.get(key) ?? []), s]);
  }
  return [...map.entries()].map(([day, list]) => ({ day, slots: list }));
}

/** Référence courte d'une demande, identique à celle que voit le contrôleur (level3.ts › shortRef). */
export function level3Ref(id: string): string {
  const trimmed = id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return `L3-${trimmed.slice(-6, -3) || '000'}-${trimmed.slice(-3) || '000'}`;
}
