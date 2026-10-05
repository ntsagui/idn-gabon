import { describe, expect, it } from 'vitest';
import { notificationRoute } from './notification-route';

describe('notificationRoute', () => {
  it('ouvre l’entretien Niveau 3 quand la notification le concerne', () => {
    expect(notificationRoute({ category: 'kyc', metadata: { level3VerificationId: 'abc' } })).toBe('/kyc/level3');
  });

  it('ouvre le suivi du dossier pour un complément ou une décision KYC', () => {
    expect(notificationRoute({ category: 'kyc', metadata: { kycRequestId: 'k1' } })).toBe('/kyc/review');
  });

  it('ouvre directement le courrier ou le message concerné', () => {
    expect(notificationRoute({ category: 'comms', metadata: { letterId: 'L1' } })).toBe('/iboite/courrier/L1');
    expect(notificationRoute({ category: 'comms', metadata: { messageId: 'M1' } })).toBe('/iboite/email/M1');
  });

  it('mène aux appareils pour une alerte de sécurité', () => {
    expect(notificationRoute({ category: 'security' })).toBe('/settings/sessions');
  });

  it('ne navigue pas quand rien ne correspond (pas de lien inventé)', () => {
    expect(notificationRoute({ category: 'system' })).toBeNull();
    expect(notificationRoute({ category: 'comms', metadata: { letterId: '' } })).toBeNull();
  });
});
