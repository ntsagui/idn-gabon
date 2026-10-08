import type { IconName } from '@/design/icons';
import type { MailAccount } from '@/data/mailbox';

/** Conversion du `iboiteAccount` (backend) vers le type UI `MailAccount`. */
export function iboiteAccountToUi(a: {
  _id: string;
  type: 'personal' | 'professional' | 'association';
  label: string;
  emailAlias: string;
  street: string;
  city: string;
  postalCode: string;
  country?: string;
  qrCode: string;
  isAddressConfigured?: boolean;
  district?: string | null;
  addressLine?: string | null;
}): MailAccount & { _id: string } {
  const grad = ((): [string, string] => {
    switch (a.type) {
      case 'personal':
        return ['#3b82f6', '#4338ca'];
      case 'professional':
        return ['#10b981', '#0d9488'];
      case 'association':
        return ['#a855f7', '#ec4899'];
    }
  })();
  const icon: IconName = a.type === 'personal' ? 'home' : a.type === 'professional' ? 'briefcase' : 'users';
  return {
    _id: a._id,
    id: a.type,
    label: a.label,
    icon,
    grad,
    email: a.emailAlias,
    addr: {
      rue: a.street,
      ville: a.city,
      bp: a.postalCode,
      qr: a.qrCode,
      district: a.district ?? undefined,
      addressLine: a.addressLine ?? undefined,
      country: a.country ?? undefined,
      isConfigured: a.isAddressConfigured === true,
    },
  };
}

/** Heure des listes (façon messagerie) : « 15:10 » aujourd'hui, « Hier », « 2 oct. », puis « 02/10/2025 ». */
export function formatListTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('fr-FR');
}

/**
 * Construit la première ligne d'adresse affichable. Priorité :
 *   1. quartier + ville
 *   2. ville seule
 *   3. addressLine
 *   4. null (= non configuré)
 */
export function formatAddressLine(addr: MailAccount['addr']): string | null {
  if (!addr.isConfigured) return null;
  const parts = [addr.district, addr.ville].filter((s): s is string => Boolean(s && s.trim()));
  if (parts.length > 0) return parts.join(', ');
  if (addr.addressLine && addr.addressLine.trim()) return addr.addressLine;
  if (addr.rue && addr.rue.trim()) return addr.rue;
  return null;
}
