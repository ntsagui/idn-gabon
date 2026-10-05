import type { OnboardingProfile } from '@/hooks/use-onboarding-state';

import type { IconName } from '@/design/icons';

export type Profil = { id: OnboardingProfile; label: string; sub: string; loa: 1 | 2 | 3; icon: IconName };

// Les développeurs s'inscrivent depuis la plateforme dédiée — pas exposé
// dans le tunnel mobile citoyen.
export const PROFILS: Profil[] = [
  { id: 'citizen',   label: 'Citoyen gabonais', sub: 'CNI ou acte de naissance',     loa: 3, icon: 'idCard' },
  { id: 'resident',  label: 'Résident',         sub: 'Carte de séjour et passeport', loa: 2, icon: 'home' },
  { id: 'visitor',   label: 'Visiteur',         sub: 'Passeport et visa',            loa: 1, icon: 'plane' },
];
