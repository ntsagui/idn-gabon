import { describe, expect, it } from 'vitest';
import { deviceLabel } from './device-label';

describe('deviceLabel', () => {
  it('reconnaît l’app iOS, qui n’envoie pas d’UA navigateur', () => {
    expect(deviceLabel('Appareil · Navigateur', 'IdentitNumrique/1 CFNetwork/3860.600.12 Darwin/27.2.0')).toBe('iPhone · App IDN');
  });

  it('reconnaît l’app Android (okhttp)', () => {
    expect(deviceLabel('Appareil · Navigateur', 'okhttp/4.12.0')).toBe('Android · App IDN');
  });

  it('garde le libellé du backend pour un navigateur', () => {
    expect(deviceLabel('MacBook · Chrome', 'Mozilla/5.0 (Macintosh) Chrome/151 Safari/537.36')).toBe('MacBook · Chrome');
  });
});
