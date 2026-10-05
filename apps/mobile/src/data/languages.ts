export type Lang = { id: string; l: string; sub: string; sel?: boolean; dis?: boolean };

export const LANGUAGES: Lang[] = [
  { id: 'fr',    l: 'Français', sub: 'Langue officielle', sel: true },
  { id: 'en',    l: 'English',  sub: 'Bientôt' },
  { id: 'fang',  l: 'Fang',     sub: 'Bientôt', dis: true },
  { id: 'myene', l: 'Myènè',    sub: 'Bientôt', dis: true },
  { id: 'punu',  l: 'Punu',     sub: 'Bientôt', dis: true },
  { id: 'nzebi', l: 'Nzébi',    sub: 'Bientôt', dis: true },
];
