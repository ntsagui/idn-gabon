// Copie de apps/mobile/src/lib/consent-scopes.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Libellés citoyens des scopes OAuth demandés par une application partenaire,
 * alignés sur l'écran de consentement web (apps/web/.../consent-form.tsx) et
 * sur la liste autorisée par le fournisseur (backend/convex/auth.ts).
 */
export type ScopeMeta = { title: string; sub: string; icon: string };

export function scopeLabel(scope: string, email?: string): ScopeMeta {
  switch (scope) {
    case 'openid':
      return { title: 'Ton identifiant IDN', sub: 'Numéro public de ton identité numérique', icon: 'fingerprint' };
    case 'profile':
      return { title: 'Ton profil', sub: 'Nom, prénom, date et lieu de naissance', icon: 'user' };
    case 'email':
      return { title: 'Ton adresse IDN', sub: email ?? 'Adresse e-mail vérifiée', icon: 'mail' };
    case 'offline_access':
      return { title: 'Accès prolongé', sub: 'L’application reste connectée jusqu’à ce que tu révoques l’accès', icon: 'clock' };
    case 'idn:civil_status':
      return { title: 'Ton état civil', sub: 'Situation matrimoniale, nationalité', icon: 'scrollText' };
    case 'idn:iboite.read':
      return { title: 'Lire ton iBoîte', sub: 'Courriers, colis, messages et pièces jointes', icon: 'mailbox' };
    case 'idn:iboite.manage':
      return { title: 'Gérer ton iBoîte', sub: 'Marquer comme lu, classer, archiver', icon: 'inbox' };
    case 'idn:iboite.send':
      return { title: 'Écrire depuis ton iBoîte', sub: 'Envoyer des messages en ton nom', icon: 'send' };
    default:
      return { title: scope, sub: 'Demandé par l’application', icon: 'keyRound' };
  }
}

/**
 * URL de retour renvoyée par le fournisseur après la décision. Elle vient du
 * serveur (redirect_uri enregistrée), jamais de l'écran ; on refuse malgré
 * tout les schémas qui exécuteraient du contenu.
 */
export function consentRedirect(result: unknown): string | null {
  const data = (result as { data?: { redirectURI?: unknown; redirect_uri?: unknown } } | null)?.data;
  const raw = typeof data?.redirectURI === 'string' ? data.redirectURI : typeof data?.redirect_uri === 'string' ? data.redirect_uri : null;
  if (!raw) return null;
  const scheme = raw.split(':')[0]?.toLowerCase() ?? '';
  if (!/^[a-z][a-z0-9+.-]*$/.test(scheme) || ['javascript', 'data', 'file', 'vbscript'].includes(scheme)) return null;
  return raw;
}
