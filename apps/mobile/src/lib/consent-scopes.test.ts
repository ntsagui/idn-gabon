import { describe, expect, it } from 'vitest';
import { consentRedirect, scopeLabel } from './consent-scopes';

describe('scopes du consentement', () => {
  it('nomme chaque scope accepté par le fournisseur', () => {
    for (const s of ['openid', 'profile', 'email', 'idn:civil_status', 'idn:iboite.read', 'idn:iboite.manage', 'idn:iboite.send']) {
      expect(scopeLabel(s).title).not.toBe(s);
    }
  });

  it('montre l’adresse réellement partagée pour le scope email', () => {
    expect(scopeLabel('email', 'awa.mboumba@idn.ga').sub).toBe('awa.mboumba@idn.ga');
  });

  it('affiche un scope inconnu tel quel plutôt que de le masquer', () => {
    expect(scopeLabel('idn:nouveau').title).toBe('idn:nouveau');
  });
});

describe('URL de retour', () => {
  it('suit l’URL renvoyée par le fournisseur, y compris un schéma d’app partenaire', () => {
    expect(consentRedirect({ data: { redirectURI: 'https://gabonconnect.ga/cb?code=1' } })).toBe('https://gabonconnect.ga/cb?code=1');
    expect(consentRedirect({ data: { redirect_uri: 'gabonconnect://cb?code=1' } })).toBe('gabonconnect://cb?code=1');
  });

  it('refuse une réponse en erreur ou un schéma exécutable', () => {
    expect(consentRedirect({ error: { status: 400 } })).toBeNull();
    expect(consentRedirect({ data: { redirectURI: 'javascript:alert(1)' } })).toBeNull();
  });
});
