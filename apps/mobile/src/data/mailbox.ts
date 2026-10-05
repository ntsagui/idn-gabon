import type { IconName } from '@/design/icons';

export type MailAccount = {
  id: 'personal' | 'professional' | 'association';
  label: string;
  icon: IconName;
  grad: [string, string];
  addr: {
    rue: string;
    ville: string;
    bp: string;
    qr: string;
    /** Quartier (ex. Akanda, Glass, Nzeng-Ayong). Vide tant que non configuré. */
    district?: string;
    /** Ligne d'adresse formatée (résolue par geocoder ou saisie manuelle). */
    addressLine?: string;
    /** Pays — par défaut Gabon. */
    country?: string;
    /** `true` une fois l'adresse configurée par le citoyen (GPS ou manuel). */
    isConfigured: boolean;
  };
  email: string;
};
