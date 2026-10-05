// IDN — Design tokens (RN port of ressources/interfaces/project/idn-tokens.jsx)
// Sober institutional aesthetic. Green primary, yellow + blue as accents.

export const idnTokens = {
  green: '#0E7C3A',
  greenDk: '#0A5C2C',
  greenSoft: '#E6F2EA',
  yellow: '#F2C811',
  yellowSoft: '#FCF4D6',
  blue: '#2563AC',
  blueSoft: '#E6EEF7',
  danger: '#B83A3A',

  l: {
    bg: '#FAFAF8',
    surface: '#FFFFFF',
    surface2: '#F4F3EE',
    border: '#E6E4DD',
    borderSoft: '#EFEEE9',
    ink: '#16170F',
    ink2: '#3A3D2E',
    muted: '#74766B',
    mutedSoft: '#A6A89D',
    greenText: '#0E7C3A',
    blueText: '#2563AC',
    redText: '#B3261E',
    greenBadge: '#E6F2EA',
    blueBadge: '#E6EEF7',
    yellowBadge: '#FCF4D6',
    redBadge: '#FBEAE8',
    neutralBadge: '#ECEBE5',
  } as IdnNeutrals,
  d: {
    bg: '#0E110D',
    surface: '#181C16',
    surface2: '#22271F',
    border: '#2C3128',
    borderSoft: '#232820',
    ink: '#F2F0E8',
    ink2: '#D4D2C7',
    muted: '#9A9C8E',
    mutedSoft: '#6B6D62',
    greenText: '#5BC57F',
    blueText: '#6BA4E0',
    redText: '#F2B8B5',
    greenBadge: '#0F2A18',
    blueBadge: '#10243A',
    yellowBadge: '#332B0A',
    redBadge: '#3A1414',
    neutralBadge: '#2C3128',
  } as IdnNeutrals,

  font: 'IBMPlexSans-Regular' as string,
  mono: 'IBMPlexMono-Regular' as string,

  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 9999 },

  // Typographie — calibrée pour mobile (iOS HIG body 17pt, Material 16sp minimum).
  // Toutes les valeurs en sp/pt directs pour rester compatibles avec les styles inline.
  text: {
    display: 32,    // grand titre d'écran "marketing"
    title: 26,      // titre principal d'écran
    headline: 22,   // titre de section
    subhead: 18,    // sous-titre / valeur mise en avant
    body: 17,       // corps de texte par défaut (lisible adultes)
    callout: 16,    // corps secondaire / boutons standard
    label: 15,      // labels de champs, micro-titres
    footnote: 13,   // hint, méta sous un champ
    caption: 12,    // dernier recours (badges, tags) — éviter pour du contenu
  },
  weight: {
    bold: '700',
    semibold: '600',
    medium: '500',
    regular: '400',
  },
} as const;

export type IdnNeutrals = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  borderSoft: string;
  ink: string;
  ink2: string;
  muted: string;
  mutedSoft: string;
  // Textes et fonds de badge à contraste vérifié (prototype de la charte, RGAA 3.2/3.3).
  greenText: string;
  blueText: string;
  redText: string;
  greenBadge: string;
  blueBadge: string;
  yellowBadge: string;
  redBadge: string;
  neutralBadge: string;
};
export type IdnTheme = typeof idnTokens & IdnNeutrals & { dark: boolean };
