import { describe, expect, it } from 'vitest';
import { kycTimeline } from './kyc-timeline';

const states = (status: string | undefined, actions: string[] = []) => kycTimeline(status, actions).map((s) => `${s.label}:${s.state}`);

describe('frise de vérification', () => {
  it('un dossier non envoyé n’affiche aucune étape franchie', () => {
    expect(kycTimeline('pending', []).some((s) => s.state === 'done')).toBe(false);
  });

  it('un dossier envoyé est « en revue », le complément reste hypothétique', () => {
    expect(states('under_review')).toEqual(['Soumis:done', 'En revue:current', 'Complément si nécessaire:upcoming', 'Approuvé:upcoming']);
  });

  it('un complément demandé est l’étape courante : c’est au citoyen d’agir', () => {
    expect(kycTimeline('complement_required', [])[2]).toMatchObject({ label: 'Complément demandé', state: 'current' });
  });

  it('après un complément fourni, le dossier attend la décision', () => {
    expect(states('under_review', ['kyc_submitted', 'kyc_complement_requested', 'kyc_complement_provided'])).toEqual([
      'Soumis:done', 'En revue:done', 'Complément fourni:done', 'Approuvé:current',
    ]);
  });

  it('une approbation sans complément ne montre pas d’étape complément', () => {
    expect(states('approved')).toEqual(['Soumis:done', 'En revue:done', 'Approuvé:done']);
  });

  it('un refus se termine en échec, jamais en « Approuvé »', () => {
    const steps = kycTimeline('rejected', []);
    expect(steps.at(-1)).toMatchObject({ label: 'Refusé', state: 'failed' });
    expect(steps.some((s) => s.label === 'Approuvé')).toBe(false);
  });
});
