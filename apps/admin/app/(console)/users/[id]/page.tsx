"use client"

import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { LoABadge } from "@repo/ui/components/loa-badge"

import { IdnIcons } from "../../../_components/icons"
import { OpHeader } from "../../../_components/op-header"
import { PasswordRecoveryCard } from "../../../_components/password-recovery-card"
import { PinRecoveryCard } from "../../../_components/pin-recovery-card"
import { UserRowActions } from "../../../_components/user-row-actions"

type RecoveryBlocker =
  | "account_deleted"
  | "email_not_verified"
  | "missing_phone"
  | "missing_identity_key"
  | "shared_identity"
  | "shared_nip"
  | "shared_phone"
  | "registry_scan_limit"

type AccountDetail = {
  profileId: string
  userId: string
  authExists: boolean
  email: string
  authName?: string
  emailVerified: boolean
  twoFactorEnabled: boolean
  idnId?: string
  profileType: "citizen" | "resident" | "visitor" | "developer"
  loa: 1 | 2 | 3
  pivot?: {
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: "M" | "F" | "O" | "N"
    birthPlace: string
    nationality: string
    phone?: string
    nip?: string
  }
  pinConfigured: boolean
  hasProfilePhoto: boolean
  smsRecovery: {
    eligible: boolean
    normalizedPhone: string | null
    blockers: RecoveryBlocker[]
  }
  roles: Array<{ role: string; assignedAt: number }>
  kycRequests: Array<{
    _id: string
    documentType: string
    status: string
    score?: number
    faceMatchScore?: number
    livenessVerdict?: "real" | "spoof" | "uncertain"
    duplicateFlagged: boolean
    submittedAt?: number
    reviewedAt?: number
    rejectionReason?: string
    createdAt: number
    updatedAt: number
  }>
  recentActivity: Array<{
    _id: string
    action: string
    targetType: string
    createdAt: number
  }>
  deletionRequestedAt?: number
  deletionScheduledAt?: number
  deletedAt?: number
  createdAt: number
  updatedAt: number
}

const PROFILE_LABEL = {
  citizen: "Citoyen",
  resident: "Résident",
  visitor: "Visiteur",
  developer: "Développeur",
} satisfies Record<AccountDetail["profileType"], string>

const GENDER_LABEL: Record<
  NonNullable<AccountDetail["pivot"]>["gender"],
  string
> = {
  M: "Masculin",
  F: "Féminin",
  O: "Autre",
  N: "Non renseigné",
}

const KYC_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  submitted: "Soumis",
  under_review: "En cours de revue",
  complement_required: "Complément demandé",
  approved: "Approuvé",
  rejected: "Rejeté",
  expired: "Expiré",
}

const DOCUMENT_LABEL: Record<string, string> = {
  cni_gabon: "Carte nationale d’identité",
  birth_certificate: "Acte de naissance",
  residence_card: "Carte de résident",
  passport: "Passeport",
  visa: "Visa",
}

const RECOVERY_BLOCKER_LABEL: Record<RecoveryBlocker, string> = {
  account_deleted: "Le compte est anonymisé.",
  email_not_verified: "L’adresse email n’est pas vérifiée.",
  missing_phone: "Aucun numéro mobile compatible n’est renseigné.",
  missing_identity_key: "L’ancien profil n’a pas de clé d’identité.",
  shared_identity:
    "La même identité est utilisée par plusieurs comptes actifs.",
  shared_nip: "Le même NIP est utilisé par plusieurs comptes actifs.",
  shared_phone:
    "Le même numéro mobile est utilisé par plusieurs comptes actifs.",
  registry_scan_limit: "Le registre dépasse la limite du contrôle automatique.",
}

const ACTION_LABEL: Record<string, string> = {
  account_created: "Compte créé",
  account_modified: "Compte modifié",
  account_disabled: "Compte anonymisé",
  login_success: "Connexion réussie",
  login_failure: "Échec de connexion",
  login_lockout: "Connexion bloquée",
  otp_sent: "Code envoyé",
  otp_verified: "Code vérifié",
  pin_changed: "PIN modifié",
  password_changed: "Mot de passe modifié",
  email_changed: "Email modifié",
  kyc_submitted: "Dossier KYC soumis",
  kyc_under_review: "Dossier KYC en revue",
  kyc_approved: "Dossier KYC approuvé",
  kyc_rejected: "Dossier KYC rejeté",
  session_revoked: "Session révoquée",
  session_revoked_global: "Toutes les sessions révoquées",
}

function formatDate(timestamp: number | undefined, withTime = false) {
  if (timestamp === undefined) return "—"
  return new Date(timestamp).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  })
}

function initials(profile: AccountDetail) {
  const source = profile.pivot
    ? `${profile.pivot.firstName} ${profile.pivot.lastName}`
    : (profile.authName ?? profile.email)
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function DetailCard({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`portal-panel p-5 ${className}`}>
      <h2 className="mb-4 text-[13px] font-semibold text-idn-ink">{title}</h2>
      {children}
    </section>
  )
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[minmax(130px,0.8fr)_minmax(0,1.2fr)] gap-4 border-b border-idn-border-soft py-2.5 first:pt-0 last:border-0 last:pb-0">
      <dt className="text-xs text-idn-muted">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right text-xs text-idn-ink ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  )
}

function StatePill({
  ok,
  children,
}: {
  ok: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium " +
        (ok
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300")
      }
    >
      {children}
    </span>
  )
}

export default function UserDetailPage() {
  const { id: userId } = useParams<{ id: string }>()
  const account = useQuery(api.admin.users.getProfile, { userId }) as
    | AccountDetail
    | null
    | undefined

  if (account === undefined) {
    return (
      <>
        <OpHeader sub="COMPTES" title="Chargement du compte…" />
        <div className="portal-canvas flex-1 text-sm text-idn-muted">
          Chargement…
        </div>
      </>
    )
  }
  if (account === null) notFound()

  const displayName = account.pivot
    ? `${account.pivot.firstName} ${account.pivot.lastName}`
    : (account.authName ?? account.email.split("@")[0] ?? "Compte IDN")

  return (
    <>
      <OpHeader
        sub={`COMPTES · ${account.idnId ?? account.userId}`}
        title={displayName}
        right={
          <UserRowActions
            userId={account.userId}
            idnId={account.idnId}
            email={account.email}
            deletedAt={account.deletedAt}
            showDetails={false}
          />
        }
      />

      <div className="portal-canvas flex-1 overflow-auto">
        <div className="portal-limit">
          <Link
            href="/users"
            className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-idn-green outline-none hover:underline focus-visible:ring-2 focus-visible:ring-idn-green"
          >
            {IdnIcons.arrowL}
            Retour aux comptes
          </Link>

          <section className="portal-panel mb-5 flex flex-wrap items-center gap-4 p-5">
            <div
              aria-hidden
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-idn-green to-idn-green-dark text-lg font-semibold text-white"
            >
              {initials(account)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-idn-ink">
                  {displayName}
                </h2>
                <LoABadge level={account.loa} compact />
                <span className="rounded-full bg-idn-surface-2 px-2 py-0.5 text-[11px] font-medium text-idn-muted">
                  {PROFILE_LABEL[account.profileType]}
                </span>
                {account.deletedAt !== undefined ? (
                  <StatePill ok={false}>Anonymisé</StatePill>
                ) : (
                  <StatePill ok>Actif</StatePill>
                )}
              </div>
              <p className="mt-1 truncate font-mono text-xs text-idn-muted">
                {account.email || "Compte Better Auth absent"}
              </p>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <DetailCard title="Identité déclarée">
              <dl>
                <DetailRow label="Prénom" value={account.pivot?.firstName} />
                <DetailRow label="Nom" value={account.pivot?.lastName} />
                <DetailRow
                  label="Date de naissance"
                  value={account.pivot?.dateOfBirth}
                />
                <DetailRow
                  label="Genre"
                  value={
                    account.pivot
                      ? GENDER_LABEL[account.pivot.gender]
                      : undefined
                  }
                />
                <DetailRow
                  label="Lieu de naissance"
                  value={account.pivot?.birthPlace}
                />
                <DetailRow
                  label="Nationalité"
                  value={account.pivot?.nationality}
                />
                <DetailRow
                  label="Téléphone"
                  value={account.pivot?.phone}
                  mono
                />
                <DetailRow label="NIP" value={account.pivot?.nip} mono />
              </dl>
            </DetailCard>

            <DetailCard title="Compte et authentification">
              <dl>
                <DetailRow label="ID IDN" value={account.idnId} mono />
                <DetailRow
                  label="Compte d’authentification"
                  value={
                    <StatePill ok={account.authExists}>
                      {account.authExists ? "Présent" : "Absent"}
                    </StatePill>
                  }
                />
                <DetailRow label="Email" value={account.email} mono />
                <DetailRow
                  label="Email vérifié"
                  value={
                    <StatePill ok={account.emailVerified}>
                      {account.emailVerified ? "Oui" : "Non"}
                    </StatePill>
                  }
                />
                <DetailRow
                  label="PIN configuré"
                  value={
                    <StatePill ok={account.pinConfigured}>
                      {account.pinConfigured ? "Oui" : "Non"}
                    </StatePill>
                  }
                />
                <DetailRow
                  label="Double authentification"
                  value={account.twoFactorEnabled ? "Activée" : "Désactivée"}
                />
                <DetailRow
                  label="Photo de profil"
                  value={account.hasProfilePhoto ? "Présente" : "Absente"}
                />
                <DetailRow
                  label="Rôles actifs"
                  value={
                    account.roles.length
                      ? account.roles.map((role) => role.role).join(", ")
                      : "Aucun"
                  }
                />
                <DetailRow label="ID technique" value={account.userId} mono />
              </dl>
            </DetailCard>

            <DetailCard title="Récupération du PIN par SMS">
              <dl>
                <DetailRow
                  label="État"
                  value={
                    <StatePill ok={account.smsRecovery.eligible}>
                      {account.smsRecovery.eligible
                        ? "Envoi automatique autorisé"
                        : "Vérification supplémentaire requise"}
                    </StatePill>
                  }
                />
                <DetailRow
                  label="Numéro normalisé"
                  value={account.smsRecovery.normalizedPhone}
                  mono
                />
              </dl>
              {!account.smsRecovery.eligible ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="font-medium">Motif du blocage</p>
                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                    {account.smsRecovery.blockers.map((blocker) => (
                      <li key={blocker}>{RECOVERY_BLOCKER_LABEL[blocker]}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </DetailCard>

            <PinRecoveryCard
              userId={account.userId}
              idnId={account.idnId}
              email={account.email}
              authExists={account.authExists}
              deletedAt={account.deletedAt}
              hasAdminRole={account.roles.some((role) => role.role === "admin")}
            />

            <PasswordRecoveryCard
              userId={account.userId}
              idnId={account.idnId}
              email={account.email}
              authExists={account.authExists}
              deletedAt={account.deletedAt}
              hasAdminRole={account.roles.some((role) => role.role === "admin")}
            />

            <DetailCard title="Cycle de vie du compte">
              <dl>
                <DetailRow
                  label="Inscription"
                  value={formatDate(account.createdAt, true)}
                />
                <DetailRow
                  label="Dernière modification"
                  value={formatDate(account.updatedAt, true)}
                />
                <DetailRow
                  label="Suppression demandée"
                  value={formatDate(account.deletionRequestedAt, true)}
                />
                <DetailRow
                  label="Suppression prévue"
                  value={formatDate(account.deletionScheduledAt, true)}
                />
                <DetailRow
                  label="Anonymisation"
                  value={formatDate(account.deletedAt, true)}
                />
              </dl>
            </DetailCard>

            <DetailCard
              title="Parcours de vérification"
              className="xl:col-span-2"
            >
              {account.kycRequests.length === 0 ? (
                <p className="text-xs text-idn-muted">
                  Aucun dossier de vérification pour ce compte.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-xs">
                    <thead>
                      <tr className="border-b border-idn-border-soft text-[11px] uppercase tracking-[0.05em] text-idn-muted">
                        <th className="pb-2 pr-4 font-medium">Document</th>
                        <th className="pb-2 pr-4 font-medium">Statut</th>
                        <th className="pb-2 pr-4 font-medium">Score OCR</th>
                        <th className="pb-2 pr-4 font-medium">Visage</th>
                        <th className="pb-2 pr-4 font-medium">Doublon</th>
                        <th className="pb-2 font-medium">Créé le</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.kycRequests.map((request) => (
                        <tr
                          key={request._id}
                          className="border-b border-idn-border-soft last:border-0"
                        >
                          <td className="py-3 pr-4 text-idn-ink">
                            {DOCUMENT_LABEL[request.documentType] ??
                              request.documentType}
                          </td>
                          <td className="py-3 pr-4 text-idn-ink">
                            {KYC_STATUS_LABEL[request.status] ?? request.status}
                          </td>
                          <td className="py-3 pr-4 text-idn-ink">
                            {request.score ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-idn-ink">
                            {request.faceMatchScore ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-idn-ink">
                            {request.duplicateFlagged ? "Signalé" : "Non"}
                          </td>
                          <td className="py-3 text-idn-muted">
                            {formatDate(request.createdAt, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailCard>

            <DetailCard title="Activité récente" className="xl:col-span-2">
              {account.recentActivity.length === 0 ? (
                <p className="text-xs text-idn-muted">
                  Aucune activité journalisée pour ce compte.
                </p>
              ) : (
                <div>
                  {account.recentActivity.map((activity) => (
                    <div
                      key={activity._id}
                      className="flex items-center justify-between gap-4 border-b border-idn-border-soft py-2.5 text-xs last:border-0"
                    >
                      <span className="text-idn-ink">
                        {ACTION_LABEL[activity.action] ??
                          activity.action.replaceAll("_", " ")}
                      </span>
                      <time className="shrink-0 text-idn-muted">
                        {formatDate(activity.createdAt, true)}
                      </time>
                    </div>
                  ))}
                </div>
              )}
            </DetailCard>
          </div>
        </div>
      </div>
    </>
  )
}
