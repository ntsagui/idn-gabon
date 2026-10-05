import type { IconName } from '@/design/icons';

// Couleurs des cartes : aplats de la charte (prototype iCarte), contraste du
// texte blanc ≥ 4,5:1. Trois arrêts identiques : les composants qui passent
// par LinearGradient affichent ainsi un aplat sans être réécrits.
const flat = (c: string) => [c, c, c] as const;
export const CARD_GRADIENTS = {
  green:  flat('#0E7C3A'),
  orange: flat('#C2410C'),
  blue:   flat('#2563AC'),
  rose:   flat('#BE185D'),
  black:  flat('#16170F'),
  purple: flat('#6D28D9'),
  amber:  flat('#A35A06'),
  yellow: flat('#8A6A00'),
  indigo: flat('#3730A3'),
};

export type GradKey = keyof typeof CARD_GRADIENTS;

export type Card = {
  id: string;
  type: string;
  name: string;
  sub: string;
  grad: GradKey | 'white';
  icon: IconName;
  featured?: boolean;
  official?: boolean;
};

// Catalogue verbatim du cahier des charges
export const DEFAULT_CARDS: Card[] = [
  { id: 'cni',       type: 'cni',       name: "Carte d'Identité", sub: 'République Gabonaise',  grad: 'green',  icon: 'seal',      featured: true },
  { id: 'driving',   type: 'driving',   name: 'Permis de Conduire', sub: 'Catégories B, C',      grad: 'orange', icon: 'car',       featured: true },
  { id: 'transport', type: 'transport', name: 'Carte Transport',    sub: 'STLG Libreville',      grad: 'blue',   icon: 'bus',       featured: true },
  { id: 'health',    type: 'health',    name: 'CNAMGS',             sub: 'Assurance Maladie',    grad: 'white',  icon: 'heart',     featured: true, official: true },
  { id: 'bank',      type: 'bank',      name: 'BGFI Bank',          sub: 'Visa Premium',         grad: 'black',  icon: 'cc',        featured: true },
  { id: 'business',  type: 'business',  name: 'Carte de Visite',    sub: 'TechGabon SARL',       grad: 'purple', icon: 'briefcase', featured: true },
  { id: 'consular',  type: 'consular',  name: 'Carte Consulaire',   sub: 'République Gabonaise', grad: 'amber',  icon: 'globe' },
  { id: 'voter',     type: 'voter',     name: "Carte d'Électeur",   sub: 'Bureau 12 Libreville', grad: 'yellow', icon: 'vote' },
  { id: 'loyalty',   type: 'loyalty',   name: 'Carte Fidélité',     sub: 'Casino · 1500 pts',    grad: 'indigo', icon: 'gift' },
];

export type CardTemplate = { id: string; label: string; icon: IconName; grad: GradKey };

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: 'cni',       label: 'CNI',       icon: 'seal',      grad: 'green' },
  { id: 'driving',   label: 'Permis',    icon: 'car',       grad: 'orange' },
  { id: 'transport', label: 'Transport', icon: 'bus',       grad: 'blue' },
  { id: 'health',    label: 'Santé',     icon: 'heart',     grad: 'rose' },
  { id: 'bank',      label: 'Bancaire',  icon: 'cc',        grad: 'black' },
  { id: 'business',  label: 'Visite',    icon: 'briefcase', grad: 'purple' },
];

export const CUSTOM_COLORS: { id: GradKey; label: string }[] = [
  { id: 'green',  label: 'Vert' },
  { id: 'orange', label: 'Orange' },
  { id: 'blue',   label: 'Bleu' },
  { id: 'rose',   label: 'Rose' },
  { id: 'black',  label: 'Noir' },
  { id: 'purple', label: 'Violet' },
];

export const CUSTOM_ICONS: { id: IconName; label: string }[] = [
  { id: 'cc',        label: 'Carte' },
  { id: 'car',       label: 'Voiture' },
  { id: 'bus',       label: 'Bus' },
  { id: 'heart',     label: 'Cœur' },
  { id: 'briefcase', label: 'Valise' },
  { id: 'users',     label: 'Groupe' },
];
