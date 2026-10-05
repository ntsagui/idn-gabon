import { describe, expect, it } from 'vitest';
import { classifyScan } from './scan-target';

describe('classifyScan', () => {
  it('reconnaît un acte officiel par son URL de vérification ou son code', () => {
    expect(classifyScan('https://identite.ga/verifier/ABCD-EFGH-JKMN')).toEqual({ kind: 'act', code: 'ABCDEFGHJKMN' });
    expect(classifyScan('abcdefghjkmn')).toEqual({ kind: 'act', code: 'ABCDEFGHJKMN' });
  });

  it('reconnaît une demande de connexion d’un autre appareil', () => {
    expect(classifyScan('idn:cross-device:Ab_cd-EF12345678')).toEqual({ kind: 'cross-device', code: 'Ab_cd-EF12345678' });
  });

  it('n’approuve pas une connexion dont le code est mal formé', () => {
    expect(classifyScan('idn:cross-device:court')).toEqual({ kind: 'unknown' });
  });

  it('signale la carte IDN d’un tiers sans tenter de la lire', () => {
    expect(classifyScan('idn:p1:eyJ2IjoxfQ.sig')).toEqual({ kind: 'presentation' });
  });

  it('ignore toute autre URL (aucune ouverture de lien arbitraire)', () => {
    expect(classifyScan('https://phishing.example/login')).toEqual({ kind: 'unknown' });
  });
});
