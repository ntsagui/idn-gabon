// Copie de apps/mobile/src/lib/kyc-timeline.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Frise de suivi d'une vérification d'identité (prototype : Soumis → En
 * revue → Complément demandé → Approuvé), déduite du statut du dossier et
 * des événements de son journal.
 */
export type TimelineState = 'done' | 'current' | 'upcoming' | 'failed';
export type TimelineStep = { label: string; state: TimelineState; hint?: string };

export function kycTimeline(status: string | undefined, actions: string[]): TimelineStep[] {
  const complementAsked = status === 'complement_required' || actions.includes('kyc_complement_requested');
  const step = (label: string, state: TimelineState, hint?: string): TimelineStep => ({ label, state, hint });

  if (!status || status === 'pending') {
    return [
      step('Soumis', 'current', 'Ton dossier n’est pas encore envoyé'),
      step('En revue', 'upcoming'),
      step('Complément si nécessaire', 'upcoming'),
      step('Approuvé', 'upcoming'),
    ];
  }
  if (status === 'complement_required') {
    return [step('Soumis', 'done'), step('En revue', 'done'), step('Complément demandé', 'current', 'Envoie la pièce demandée par le contrôleur'), step('Approuvé', 'upcoming')];
  }
  if (status === 'submitted' || status === 'under_review') {
    if (complementAsked) {
      // Complément fourni : le dossier repasse en revue avant la décision.
      return [step('Soumis', 'done'), step('En revue', 'done'), step('Complément fourni', 'done'), step('Approuvé', 'current', 'Nouvelle revue de ton dossier')];
    }
    const hint = status === 'submitted' ? 'Contrôles automatiques en cours' : 'Un contrôleur examine ton dossier · délai moyen 24 h';
    return [step('Soumis', 'done'), step('En revue', 'current', hint), step('Complément si nécessaire', 'upcoming'), step('Approuvé', 'upcoming')];
  }
  const middle = complementAsked ? [step('Complément fourni', 'done')] : [];
  if (status === 'approved') return [step('Soumis', 'done'), step('En revue', 'done'), ...middle, step('Approuvé', 'done')];
  if (status === 'rejected') return [step('Soumis', 'done'), step('En revue', 'done'), ...middle, step('Refusé', 'failed')];
  // expired, ou statut inconnu : on n'invente pas de progression.
  return [step('Soumis', 'done'), step(status === 'expired' ? 'Expiré' : 'Statut inconnu', 'failed')];
}
