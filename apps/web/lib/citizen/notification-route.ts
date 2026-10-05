// Copie de apps/mobile/src/lib/notification-route.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Écran à ouvrir quand on touche une notification, déduit de sa catégorie et
 * des identifiants posés par le backend dans `metadata` (cf.
 * notifications.dispatch). `null` : rien de plus à montrer que le texte.
 */
export type NotificationLike = { category: string; metadata?: Record<string, unknown> | null };

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : null);

export function notificationRoute(n: NotificationLike): string | null {
  const m = n.metadata ?? {};
  if (str(m.level3VerificationId)) return '/kyc/level3';
  if (str(m.kycRequestId)) return '/kyc/review';
  const letter = str(m.letterId);
  if (letter) return `/iboite/courrier/${letter}`;
  const message = str(m.messageId);
  if (message) return `/iboite/email/${message}`;
  if (str(m.packageId)) return '/iboite';
  if (str(m.vaultItemId)) return '/idoc';
  switch (n.category) {
    case 'security':
      return '/settings/sessions';
    case 'consent':
      return '/consents';
    case 'kyc':
      return '/kyc/review';
    case 'documents':
      return '/idoc';
    case 'cv':
    case 'ai':
      return '/icv';
    default:
      return null;
  }
}
