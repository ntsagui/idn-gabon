import { describe, expect, it } from 'vitest';
import { formatNip, maskNip } from './nip-format';

describe('NIP à l’écran', () => {
  it('groupe le NIP en 4-4-4-2 pour la dictée', () => {
    expect(formatNip('19900312004587')).toBe('1990 0312 0045 87');
  });

  it('accepte un NIP saisi avec espaces ou en minuscules', () => {
    expect(formatNip(' ab12 cd34ef56gh78 ')).toBe('AB12 CD34 EF56 GH78');
  });

  it('ne laisse voir que les six derniers caractères une fois masqué', () => {
    expect(maskNip('19900312004587')).toBe('•••• •••• 0045 87');
  });

  it('masque entièrement un NIP trop court plutôt que de le dévoiler', () => {
    expect(maskNip('1234')).toBe('••••');
  });
});
