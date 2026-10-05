// Copie de apps/mobile/src/lib/activity-format.ts : même logique sur web et mobile.
// À extraire dans un paquet partagé (voir apps/web/CITIZEN_REDESIGN.md).
/**
 * Helpers de formatage pour la liste d'activité (audit logs).
 * Aligné sur apps/web/app/(citizen)/_content/fr.ts — duplication
 * volontaire pour éviter d'imposer un import cross-app au mobile.
 */

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  login_success: "Connexion réussie",
  login_failure: "Échec de connexion",
  login_lockout: "Compte temporairement verrouillé",
  otp_sent: "Code OTP envoyé",
  otp_verified: "Code OTP vérifié",
  otp_expired: "Code OTP expiré",
  account_created: "Compte IDN créé",
  account_modified: "Profil modifié",
  account_disabled: "Compte désactivé",
  password_changed: "Mot de passe modifié",
  email_changed: "Adresse email modifiée",
  pin_changed: "PIN modifié",
  kyc_submitted: "Vérification d'identité envoyée",
  kyc_under_review: "Vérification en cours d'examen",
  kyc_approved: "Niveau de garantie augmenté",
  kyc_rejected: "Vérification refusée",
  consent_granted: "Consentement accordé",
  consent_revoked: "Consentement révoqué",
  partner_token_exchanged: "Connexion à une application partenaire",
  oauth_app_created: "Application OAuth créée",
  oauth_app_modified: "Application OAuth modifiée",
  oauth_app_disabled: "Application OAuth désactivée",
  session_revoked: "Session révoquée",
  session_revoked_global: "Toutes les autres sessions révoquées",
  admin_action: "Action administrateur",
  role_assigned: "Rôle attribué",
  role_revoked: "Rôle révoqué",
  identity_check_performed: "Vérification d'identité effectuée",
  signature_verified: "Signature vérifiée",
  presentation_minted: "Présentation d'identité émise",
  kyc_complement_requested: "Complément demandé par un contrôleur",
  kyc_complement_provided: "Complément envoyé",
  level3_requested: "Demande de Niveau 3",
  level3_document_track_opened: "Pièces du Niveau 3 à fournir",
  level3_claimed: "Demande de Niveau 3 prise en charge",
  level3_availability_created: "Créneaux d'entretien publiés",
  level3_scheduled: "Entretien Niveau 3 réservé",
  level3_rescheduled: "Entretien Niveau 3 replanifié",
  level3_interview_started: "Entretien Niveau 3 démarré",
  level3_approved: "Niveau 3 accordé",
  level3_rejected: "Niveau 3 refusé",
  level3_cancelled: "Demande de Niveau 3 annulée",
  level3_appointment_cancelled: "Entretien Niveau 3 annulé",
  document_signed: "Document signé",
  delegated_identity_created: "Identité déléguée créée",
  delegated_identity_claimed: "Identité déléguée récupérée",
  delegated_claim_code_failed: "Code de récupération refusé",
  delegation_enabled: "Délégation activée",
  delegation_disabled: "Délégation désactivée",
  duplicate_flagged: "Doublon d'identité signalé",
  duplicate_flag_resolved: "Signalement de doublon traité",
  signup_blocked_duplicate: "Inscription bloquée (identité déjà vérifiée)",
  signup_abandoned: "Inscription abandonnée",
};

const SHORT_MONTHS_FR = [
  "janv.", "févr.", "mars", "avril", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * "Aujourd'hui HH:mm" / "Hier HH:mm" / "JJ mois"
 */
export function formatRelativeDate(timestamp: number): string {
  const d = new Date(timestamp);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (sameDay) return `Aujourd'hui ${time}`;
  if (isYesterday) return `Hier ${time}`;
  return `${pad(d.getDate())} ${SHORT_MONTHS_FR[d.getMonth()]}`;
}
