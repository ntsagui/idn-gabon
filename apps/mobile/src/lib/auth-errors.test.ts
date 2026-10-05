import { describe, expect, it } from 'vitest';
import { isSessionExpiredError } from './auth-errors';

describe('isSessionExpiredError', () => {
  it('reconnaît une ConvexError UNAUTHENTICATED (session révoquée)', () => {
    expect(isSessionExpiredError({ data: { code: 'UNAUTHENTICATED' } })).toBe(true);
  });

  it('reconnaît le message transporté par une erreur de requête', () => {
    expect(isSessionExpiredError(new Error('[CONVEX Q(preferences:getMyPreferences)] Uncaught ConvexError: {"code":"UNAUTHENTICATED","message":"Vous devez être connecté."}'))).toBe(true);
  });

  it('ne confond pas une autre erreur avec une session expirée', () => {
    expect(isSessionExpiredError(new Error('NOT_FOUND'))).toBe(false);
    expect(isSessionExpiredError(null)).toBe(false);
  });
});
