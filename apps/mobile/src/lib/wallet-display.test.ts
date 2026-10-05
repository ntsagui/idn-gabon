import { describe, expect, it } from 'vitest';
import { cardNumberLabel, cardValidity } from './wallet-display';

describe('affichage des cartes', () => {
  it('ne montre que les 4 derniers caractères du numéro', () => {
    expect(cardNumberLabel({ numero: 'GA 1234 5678 4587' })).toBe('•••• 4587');
  });

  it('respecte un numéro déjà masqué à la saisie', () => {
    expect(cardNumberLabel({ numero: '•••• •••• •••• 1234' })).toBe('•••• •••• •••• 1234');
  });

  it('n’invente pas de numéro absent', () => {
    expect(cardNumberLabel({})).toBeNull();
    expect(cardNumberLabel({ numero: '  ' })).toBeNull();
  });

  it('lit la validité ou, pour une carte bancaire, l’expiration', () => {
    expect(cardValidity({ validite: '03/2030' })).toBe('03/2030');
    expect(cardValidity({ expiration: '09/28' })).toBe('09/28');
    expect(cardValidity({})).toBeNull();
  });
});
