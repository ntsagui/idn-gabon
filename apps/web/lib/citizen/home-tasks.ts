// Copie de apps/mobile/src/lib/home-tasks.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Section « À traiter » de l'accueil : ce qui attend une action du citoyen,
 * calculé à partir de ses données réelles. Rien n'y figure par défaut — une
 * liste vide masque la section plutôt que d'afficher un exemple.
 */

export type HomeTask = {
  id: string;
  title: string;
  sub: string;
  route: string;
  tone: 'green' | 'blue' | 'yellow' | 'red';
  icon: 'alert' | 'calendarCheck' | 'video' | 'mail' | 'trash' | 'clock';
};

export type HomeTaskInput = {
  now: number;
  kycStatus?: string | null;
  level3?: { status: string; scheduledAt?: number; canJoin: boolean } | null;
  unreadLetters?: number;
  deletionScheduledAt?: number | null;
};

const TIME = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Libreville' });
const DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Libreville' });

export function homeTasks(input: HomeTaskInput): HomeTask[] {
  const tasks: HomeTask[] = [];
  // L'entretien qui s'ouvre passe avant tout : c'est le seul élément à heure fixe.
  const l3 = input.level3;
  if (l3 && (l3.status === 'waiting_controller' || l3.status === 'claimed' || l3.status === 'in_interview')) {
    if (l3.canJoin || l3.status === 'in_interview') {
      tasks.push({ id: 'l3-join', title: 'Ton entretien Niveau 3 est ouvert', sub: 'Rejoins la salle d’attente maintenant', route: '/kyc/level3', tone: 'green', icon: 'video' });
    } else if (l3.scheduledAt && l3.scheduledAt > input.now) {
      tasks.push({ id: 'l3-slot', title: 'Entretien Niveau 3 réservé', sub: TIME.format(l3.scheduledAt), route: '/kyc/level3', tone: 'blue', icon: 'calendarCheck' });
    } else {
      tasks.push({ id: 'l3-wait', title: 'Demande Niveau 3 en attente', sub: 'Choisis un créneau d’entretien', route: '/kyc/level3', tone: 'blue', icon: 'clock' });
    }
  }
  if (input.kycStatus === 'complement_required') {
    tasks.push({ id: 'kyc-complement', title: 'Complément demandé', sub: 'Un contrôleur attend une pièce pour ta vérification', route: '/kyc/review', tone: 'yellow', icon: 'alert' });
  } else if (input.kycStatus === 'submitted' || input.kycStatus === 'under_review') {
    tasks.push({ id: 'kyc-review', title: 'Vérification d’identité en revue', sub: 'Délai moyen : 24 h', route: '/kyc/review', tone: 'blue', icon: 'clock' });
  }
  if (input.unreadLetters && input.unreadLetters > 0) {
    const n = input.unreadLetters;
    tasks.push({ id: 'letters', title: `${n} courrier${n > 1 ? 's' : ''} officiel${n > 1 ? 's' : ''} non lu${n > 1 ? 's' : ''}`, sub: 'Dans ton iBoîte', route: '/iboite', tone: 'blue', icon: 'mail' });
  }
  if (input.deletionScheduledAt) {
    tasks.push({ id: 'deletion', title: 'Suppression du compte programmée', sub: `Le ${DAY.format(input.deletionScheduledAt)} · tu peux encore l’annuler`, route: '/settings/privacy', tone: 'red', icon: 'trash' });
  }
  return tasks;
}
