/**
 * Libellés métier de la console : actions d'audit, statuts, rôles, profils.
 * Une seule source pour que le tableau de bord, le journal et les fiches
 * disent la même chose du même événement.
 */

import type { Tone } from "../_components/status-pill"

export type Role = "admin" | "identity_controller" | "developer"
export type ProfileType = "citizen" | "resident" | "visitor" | "developer"
export type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "complement_required"
  | "approved"
  | "rejected"
  | "expired"

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrateur",
  identity_controller: "Contrôleur d'identité",
  developer: "Développeur",
}

export const ROLES: Role[] = ["admin", "identity_controller", "developer"]

export const PROFILE_LABEL: Record<ProfileType, string> = {
  citizen: "Citoyen",
  resident: "Résident",
  visitor: "Visiteur",
  developer: "Développeur",
}

export const KYC_STATUS: Record<KycStatus, { label: string; tone: Tone }> = {
  pending: { label: "Brouillon", tone: "neutral" },
  submitted: { label: "Soumis", tone: "blue" },
  under_review: { label: "En revue", tone: "blue" },
  complement_required: { label: "Complément demandé", tone: "yellow" },
  approved: { label: "Approuvé", tone: "green" },
  rejected: { label: "Refusé", tone: "red" },
  expired: { label: "Expiré", tone: "neutral" },
}

export const DOCUMENT_LABEL: Record<string, string> = {
  cni_gabon: "Carte nationale d'identité",
  birth_certificate: "Acte de naissance",
  residence_card: "Carte de résident",
  passport: "Passeport",
  visa: "Visa",
}

export const ACTION_LABEL: Record<string, string> = {
  login_success: "Connexion réussie",
  login_failure: "Échec de connexion",
  login_lockout: "Connexion bloquée",
  otp_sent: "Code envoyé",
  otp_verified: "Code vérifié",
  otp_expired: "Code expiré",
  account_created: "Compte créé",
  account_modified: "Compte modifié",
  account_disabled: "Compte anonymisé",
  password_changed: "Mot de passe modifié",
  email_changed: "E-mail modifié",
  pin_changed: "PIN modifié",
  kyc_submitted: "Dossier KYC soumis",
  kyc_under_review: "Dossier KYC en revue",
  kyc_complement_requested: "Complément KYC demandé",
  kyc_complement_provided: "Complément KYC fourni",
  kyc_approved: "Dossier KYC approuvé",
  kyc_rejected: "Dossier KYC refusé",
  level3_requested: "Niveau 3 demandé",
  level3_document_track_opened: "Piste documentaire ouverte",
  level3_claimed: "Demande Niveau 3 prise en charge",
  level3_availability_created: "Créneau Niveau 3 ouvert",
  level3_scheduled: "Entretien Niveau 3 planifié",
  level3_rescheduled: "Entretien Niveau 3 replanifié",
  level3_interview_started: "Entretien Niveau 3 commencé",
  level3_approved: "Niveau 3 approuvé",
  level3_rejected: "Niveau 3 refusé",
  level3_cancelled: "Demande Niveau 3 annulée",
  level3_appointment_cancelled: "Rendez-vous Niveau 3 annulé",
  consent_granted: "Consentement accordé",
  consent_revoked: "Consentement retiré",
  oauth_app_created: "Application créée",
  oauth_app_modified: "Application modifiée",
  oauth_app_disabled: "Application désactivée",
  partner_token_exchanged: "Jeton partenaire émis",
  session_revoked: "Session révoquée",
  session_revoked_global: "Toutes les sessions révoquées",
  admin_action: "Action administrateur",
  role_assigned: "Rôle attribué",
  role_revoked: "Rôle révoqué",
  identity_check_performed: "Contrôle d'identité",
  signature_verified: "Signature vérifiée",
  document_signed: "Document signé",
  presentation_minted: "Présentation d'identité émise",
  delegated_identity_created: "Identité déléguée créée",
  delegated_identity_claimed: "Identité déléguée réclamée",
  delegated_claim_code_failed: "Code de réclamation refusé",
  delegation_enabled: "Délégation activée",
  delegation_disabled: "Délégation désactivée",
  duplicate_flagged: "Doublon signalé",
  duplicate_flag_resolved: "Signalement de doublon arbitré",
  signup_blocked_duplicate: "Inscription refusée (doublon)",
  signup_abandoned: "Inscription abandonnée",
}

const ADMIN_KIND_LABEL: Record<string, string> = {
  password_reset_code_issued: "Code provisoire de mot de passe remis",
  pin_reset_code_issued: "Code provisoire de PIN remis",
  developer_verified: "Développeur validé pour la production",
  developer_unverified: "Validation production retirée",
  account_hard_deleted: "Compte supprimé définitivement",
  data_export_requested: "Export de données demandé",
  deletion_cancelled: "Suppression annulée",
  embedded_signup_orphan_deleted: "Inscription orpheline nettoyée",
}

export type AuditCategory =
  | "auth"
  | "otp"
  | "account"
  | "kyc"
  | "apps"
  | "admin"
  | "duplicates"
  | "controller"

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  auth: "Connexions et sessions",
  otp: "Codes de vérification",
  account: "Comptes",
  kyc: "Vérification d'identité",
  apps: "Applications et consentements",
  admin: "Administration et rôles",
  duplicates: "Doublons",
  controller: "Contrôle et signature",
}

/** Libellé d'un événement, précisé par ses métadonnées quand elles l'éclairent. */
export function eventLabel(
  action: string,
  metadata?: Record<string, unknown>,
): string {
  const kind = typeof metadata?.kind === "string" ? metadata.kind : undefined
  if (action === "admin_action" && kind && ADMIN_KIND_LABEL[kind]) {
    return ADMIN_KIND_LABEL[kind]
  }
  if (action === "oauth_app_disabled" && kind === "suspended") {
    return "Application suspendue"
  }
  if (action === "oauth_app_modified" && kind === "reactivated") {
    return "Application réactivée"
  }
  if (
    (action === "role_assigned" || action === "role_revoked") &&
    typeof metadata?.role === "string"
  ) {
    const role = ROLE_LABEL[metadata.role as Role] ?? metadata.role
    return action === "role_assigned"
      ? `Rôle ${role} attribué`
      : `Rôle ${role} révoqué`
  }
  return ACTION_LABEL[action] ?? action.replaceAll("_", " ")
}

/** Ton de la pastille d'un événement : rouge = échec, jaune = attention. */
export function eventTone(action: string): Tone {
  if (
    action === "login_failure" ||
    action === "login_lockout" ||
    action === "delegated_claim_code_failed" ||
    action === "signup_blocked_duplicate"
  )
    return "red"
  if (
    action === "otp_expired" ||
    action === "kyc_rejected" ||
    action === "account_disabled" ||
    action === "role_revoked" ||
    action === "oauth_app_disabled" ||
    action === "duplicate_flagged" ||
    action === "consent_revoked"
  )
    return "yellow"
  return "neutral"
}
