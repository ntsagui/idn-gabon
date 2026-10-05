import { describe, expect, it } from 'vitest';
import { level3View, librevilleDay, slotsByDay } from './level3-view';

const now = Date.UTC(2026, 9, 5, 9, 0); // 10:00 à Libreville
const H = 3_600_000;

describe('level3View', () => {
  it('exige le Niveau 2 avant tout entretien', () => {
    expect(level3View({ loa: 1, verification: null, now, choosingSlot: false })).toBe('needs-level2');
  });

  it('présente le parcours quand aucune demande n’est ouverte ou qu’elle a été annulée', () => {
    expect(level3View({ loa: 2, verification: null, now, choosingSlot: false })).toBe('intro');
    expect(level3View({ loa: 2, verification: { status: 'cancelled', canJoin: false }, now, choosingSlot: false })).toBe('intro');
  });

  it('demande un créneau tant qu’aucun n’est réservé', () => {
    expect(level3View({ loa: 2, verification: { status: 'waiting_controller', canJoin: false }, now, choosingSlot: false })).toBe('slots');
  });

  it('confirme un créneau lointain, ouvre la salle d’attente 15 min avant', () => {
    const later = { status: 'claimed', canJoin: false, scheduledAt: now + 2 * H, scheduledEndAt: now + 2.5 * H };
    expect(level3View({ loa: 2, verification: later, now, choosingSlot: false })).toBe('confirm');
    const soon = { ...later, scheduledAt: now + 10 * 60_000, scheduledEndAt: now + 40 * 60_000 };
    expect(level3View({ loa: 2, verification: soon, now, choosingSlot: false })).toBe('waiting');
  });

  it('« Modifier le créneau » rouvre le choix même avec un rendez-vous', () => {
    const booked = { status: 'claimed', canJoin: false, scheduledAt: now + 2 * H, scheduledEndAt: now + 2.5 * H };
    expect(level3View({ loa: 2, verification: booked, now, choosingSlot: true })).toBe('slots');
  });

  it('un entretien démarré par le contrôleur mène directement à la salle', () => {
    expect(level3View({ loa: 2, verification: { status: 'in_interview', canJoin: true }, now, choosingSlot: false })).toBe('waiting');
  });

  it('le Niveau 3 acquis l’emporte sur tout état de demande', () => {
    expect(level3View({ loa: 3, verification: { status: 'claimed', canJoin: true }, now, choosingSlot: false })).toBe('approved');
  });
});

describe('créneaux', () => {
  it('regroupe par jour de Libreville, pas par jour du téléphone', () => {
    // 23:30 UTC = 00:30 le lendemain à Libreville (UTC+1).
    expect(librevilleDay(Date.UTC(2026, 9, 5, 23, 30))).toBe('2026-10-06');
  });

  it('trie jours et horaires', () => {
    const groups = slotsByDay([{ startsAt: now + 25 * H }, { startsAt: now + H }, { startsAt: now }]);
    expect(groups.map((g) => g.slots.length)).toEqual([2, 1]);
    expect(groups[0]!.slots[0]!.startsAt).toBe(now);
  });
});

describe('référence', () => {
  it('reprend exactement le format affiché au contrôleur', async () => {
    const { level3Ref } = await import('./level3-view');
    expect(level3Ref('k17abc9def42')).toBe('L3-9DE-F42');
  });
});
