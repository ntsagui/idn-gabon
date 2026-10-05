import { describe, expect, it } from 'vitest';
import { homeTasks } from './home-tasks';

const now = Date.UTC(2026, 9, 4, 10, 0);

describe('homeTasks', () => {
  it('ne montre rien quand rien n’attend le citoyen (pas de contenu d’exemple)', () => {
    expect(homeTasks({ now, kycStatus: 'approved', level3: null, unreadLetters: 0, deletionScheduledAt: null })).toEqual([]);
  });

  it('met l’entretien ouvert en tête, car il est à heure fixe', () => {
    const tasks = homeTasks({ now, unreadLetters: 2, level3: { status: 'claimed', canJoin: true } });
    expect(tasks[0]?.id).toBe('l3-join');
    expect(tasks.map((x) => x.id)).toContain('letters');
  });

  it('annonce un créneau réservé à venir, mais pas un créneau passé', () => {
    expect(homeTasks({ now, level3: { status: 'waiting_controller', canJoin: false, scheduledAt: now + 3_600_000 } })[0]?.id).toBe('l3-slot');
    expect(homeTasks({ now, level3: { status: 'waiting_controller', canJoin: false, scheduledAt: now - 3_600_000 } })[0]?.id).toBe('l3-wait');
  });

  it('ignore une demande Niveau 3 close (approuvée, refusée, annulée)', () => {
    for (const status of ['approved', 'rejected', 'cancelled']) {
      expect(homeTasks({ now, level3: { status, canJoin: false } })).toEqual([]);
    }
  });

  it('distingue un complément demandé (action requise) d’une revue en cours (attente)', () => {
    expect(homeTasks({ now, kycStatus: 'complement_required' })[0]).toMatchObject({ id: 'kyc-complement', tone: 'yellow' });
    expect(homeTasks({ now, kycStatus: 'under_review' })[0]).toMatchObject({ id: 'kyc-review', tone: 'blue' });
  });

  it('accorde le pluriel du nombre de courriers', () => {
    expect(homeTasks({ now, unreadLetters: 1 })[0]?.title).toBe('1 courrier officiel non lu');
    expect(homeTasks({ now, unreadLetters: 3 })[0]?.title).toBe('3 courriers officiels non lus');
  });

  it('rappelle une suppression de compte programmée pour qu’elle puisse être annulée', () => {
    expect(homeTasks({ now, deletionScheduledAt: now + 86_400_000 * 30 })[0]).toMatchObject({ id: 'deletion', route: '/settings/privacy' });
  });

  it('signale une mise à jour téléchargée, sinon elle attend une fermeture complète de l’app', () => {
    expect(homeTasks({ now, updateReady: true })[0]).toMatchObject({ id: 'update', route: '/settings/updates' });
    expect(homeTasks({ now, updateReady: false })).toEqual([]);
  });

  it('fait passer les démarches du citoyen avant la mise à jour', () => {
    expect(homeTasks({ now, updateReady: true, kycStatus: 'complement_required' }).map((x) => x.id)).toEqual(['kyc-complement', 'update']);
  });
});
