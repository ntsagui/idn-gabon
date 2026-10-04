"use client"

import { useState } from "react"
import { notFound, useParams, useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { LoABadge } from "@repo/ui/components/loa-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select"

import { ConfirmDialog } from "../../../_components/confirm-dialog"
import { EmptyState } from "../../../_components/empty-state"
import { PageBody, PageHeader } from "../../../_components/page-header"
import { Field, Panel } from "../../../_components/panel"
import { PasswordRecoveryCard } from "../../../_components/password-recovery-card"
import { PersonCell } from "../../../_components/person"
import { PinRecoveryCard } from "../../../_components/pin-recovery-card"
import { PanelSkeleton, Skeleton } from "../../../_components/skeleton"
import { StatusPill } from "../../../_components/status-pill"
import { DataTable, Td, Th, Tr } from "../../../_components/table"
import { UserRowActions } from "../../../_components/user-row-actions"
import {
  fmtDate,
  fmtDateTime,
  fmtIsoDay,
  relativeTime,
} from "../../../_lib/format"
import {
  DOCUMENT_LABEL,
  KYC_STATUS,
  PROFILE_LABEL,
  ROLE_LABEL,
  ROLES,
  eventLabel,
  eventTone,
  type KycStatus,
  type Role,
} from "../../../_lib/labels"

type RecoveryBlocker =
  | "account_deleted"
  | "email_not_verified"
  | "missing_phone"
  | "missing_identity_key"
  | "shared_identity"
  | "shared_nip"
  | "shared_phone"
  | "registry_scan_limit"
  | "phone_index_incomplete"

const GENDER_LABEL: Record<"M" | "F" | "O" | "N", string> = {
  M: "Masculin",
  F: "Féminin",
  O: "Autre",
  N: "Non renseigné",
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
  phone_index_incomplete: "L'index des numéros mobiles est en cours de mise à jour.",
}

function YesNo({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return <StatusPill tone={ok ? "green" : "yellow"}>{ok ? yes : no}</StatusPill>
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : fallback
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const userId = decodeURIComponent(id)
  const router = useRouter()
  const account = useQuery(api.admin.users.getProfile, { userId })
  const basics = useQuery(
    api.admin.directory.getAccountBasics,
    account === null ? { userId } : "skip",
  )

  if (account === undefined || (account === null && basics === undefined)) {
    return (
      <>
        <PageHeader
          kicker="Fiche du compte"
          title={<Skeleton className="h-7 w-56" />}
          breadcrumb={[{ label: "Comptes IDN", href: "/users" }, { label: "Chargement…" }]}
        />
        <PageBody>
          <div className="grid gap-4 xl:grid-cols-2">
            <PanelSkeleton className="h-64" />
            <PanelSkeleton className="h-64" />
          </div>
        </PageBody>
      </>
    )
  }
  if (account === null) {
    if (!basics) notFound()
    return <OperatorAccount account={basics} />
  }

  const displayName = account.pivot
    ? `${account.pivot.firstName} ${account.pivot.lastName}`
    : (account.authName ?? account.email ?? "Compte IDN")
  const latestKyc = account.kycRequests[0]
  const hasAdminRole = account.roles.some((r) => r.role === "admin")

  return (
    <>
      <PageHeader
        kicker="Fiche du compte"
        title={displayName}
        breadcrumb={[{ label: "Comptes IDN", href: "/users" }, { label: displayName }]}
        description={
          <span className="font-mono text-xs">
            {[account.email || null, account.idnId ?? null].filter(Boolean).join(" · ") ||
              account.userId}
          </span>
        }
        actions={
          <UserRowActions
            userId={account.userId}
            idnId={account.idnId}
            email={account.email}
            deletedAt={account.deletedAt}
            showDetails={false}
            onDeleted={() => router.push("/users")}
          />
        }
      />
      <PageBody>
        <div className="adm-panel mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-[13px]">
          <LoABadge level={account.loa} />
          <span className="text-idn-ink-2">{PROFILE_LABEL[account.profileType]}</span>
          {account.deletedAt !== undefined ? (
            <StatusPill tone="neutral">Anonymisé {relativeTime(account.deletedAt)}</StatusPill>
          ) : account.deletionScheduledAt !== undefined ? (
            <StatusPill tone="yellow">
              Suppression prévue le {fmtDate(account.deletionScheduledAt)}
            </StatusPill>
          ) : (
            <StatusPill tone="green">Actif</StatusPill>
          )}
          {latestKyc ? (
            <span className="flex items-center gap-2 text-idn-muted">
              Dossier KYC
              <StatusPill tone={KYC_STATUS[latestKyc.status as KycStatus].tone}>
                {KYC_STATUS[latestKyc.status as KycStatus].label}
              </StatusPill>
            </span>
          ) : (
            <span className="text-idn-muted">Aucun dossier KYC</span>
          )}
          <span className="text-idn-muted">
            Inscrit {relativeTime(account.createdAt)} · le {fmtDate(account.createdAt)}
          </span>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Panel id="identity" title="Identité déclarée">
              {account.pivot ? (
                <dl>
                  <Field label="Prénom">{account.pivot.firstName}</Field>
                  <Field label="Nom">{account.pivot.lastName}</Field>
                  <Field label="Date de naissance">{fmtIsoDay(account.pivot.dateOfBirth)}</Field>
                  <Field label="Genre">{GENDER_LABEL[account.pivot.gender]}</Field>
                  <Field label="Lieu de naissance">{account.pivot.birthPlace}</Field>
                  <Field label="Nationalité">{account.pivot.nationality}</Field>
                  <Field label="Téléphone" mono>{account.pivot.phone}</Field>
                  <Field label="NIP" mono>{account.pivot.nip}</Field>
                </dl>
              ) : (
                <p className="text-[13px] text-idn-muted">
                  Identité pivot non renseignée : le compte est resté au Niveau 1
                  sans compléter son profil.
                </p>
              )}
            </Panel>

            <Panel id="kyc" title="Parcours de vérification" bodyClassName="p-0">
              {account.kycRequests.length === 0 ? (
                <EmptyState
                  title="Aucun dossier de vérification"
                  description="Le titulaire n'a pas encore soumis de pièce d'identité."
                />
              ) : (
                <DataTable
                  label="Dossiers de vérification"
                  minWidth={600}
                  head={
                    <>
                      <Th>Document</Th>
                      <Th>Statut</Th>
                      <Th align="right">OCR</Th>
                      <Th align="right">Visage</Th>
                      <Th>Doublon</Th>
                      <Th>Créé</Th>
                    </>
                  }
                >
                  {account.kycRequests.map((r) => (
                    <Tr key={r._id}>
                      <Td>{DOCUMENT_LABEL[r.documentType] ?? r.documentType}</Td>
                      <Td>
                        <StatusPill tone={KYC_STATUS[r.status as KycStatus].tone}>
                          {KYC_STATUS[r.status as KycStatus].label}
                        </StatusPill>
                      </Td>
                      <Td align="right" className="font-mono text-xs">{r.score ?? "–"}</Td>
                      <Td align="right" className="font-mono text-xs">{r.faceMatchScore ?? "–"}</Td>
                      <Td>
                        {r.duplicateFlagged ? (
                          <StatusPill tone="yellow">Signalé</StatusPill>
                        ) : (
                          <span className="text-idn-muted">Non</span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-idn-muted">
                        <time title={fmtDateTime(r.createdAt)}>{relativeTime(r.createdAt)}</time>
                      </Td>
                    </Tr>
                  ))}
                </DataTable>
              )}
            </Panel>

            <AuditHistory userId={account.userId} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <Panel id="auth" title="Compte et authentification">
              <dl>
                <Field label="ID IDN" mono>{account.idnId}</Field>
                <Field label="E-mail" mono>{account.email}</Field>
                <Field label="E-mail vérifié">
                  <YesNo ok={account.emailVerified} yes="Vérifié" no="Non vérifié" />
                </Field>
                <Field label="Compte d'authentification">
                  <YesNo ok={account.authExists} yes="Présent" no="Absent" />
                </Field>
                <Field label="PIN">
                  <YesNo ok={account.pinConfigured} yes="Configuré" no="Non configuré" />
                </Field>
                <Field label="Double authentification">
                  {account.twoFactorEnabled ? "Activée" : "Désactivée"}
                </Field>
                <Field label="Photo de profil">
                  {account.hasProfilePhoto ? "Présente" : "Absente"}
                </Field>
                <Field label="Identifiant technique" mono>{account.userId}</Field>
              </dl>
            </Panel>

            <RolesPanel
              userId={account.userId}
              roles={account.roles}
              disabled={account.deletedAt !== undefined}
            />

            <DevicesPanel userId={account.userId} />

            {/* Seules les voies de récupération du moyen de connexion réel du
                compte sont proposées : un code de mot de passe ne débloque pas
                le PIN d'un citoyen, et inversement. */}
            {account.recoveryMethods.pin || account.recoveryMethods.password ? (
              <Panel
                id="support"
                title="Assistance à la connexion"
                description="Codes provisoires remis de la main à la main, après vérification d'identité."
                bodyClassName="space-y-4"
              >
                {account.recoveryMethods.pin ? (
                  <div className="rounded-lg border border-idn-border-soft p-4">
                    <h3 className="text-[13px] font-semibold text-idn-ink">
                      Récupération du PIN par SMS
                    </h3>
                    <dl className="mt-3">
                      <Field label="État">
                        <StatusPill tone={account.smsRecovery.eligible ? "green" : "yellow"}>
                          {account.smsRecovery.eligible
                            ? "Envoi automatique autorisé"
                            : "Vérification supplémentaire requise"}
                        </StatusPill>
                      </Field>
                      <Field label="Numéro normalisé" mono>
                        {account.smsRecovery.normalizedPhone}
                      </Field>
                    </dl>
                    {!account.smsRecovery.eligible ? (
                      <div className="mt-3 rounded-md bg-idn-yellow-soft px-3 py-2.5 text-xs text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
                        <p className="font-medium">Motif du blocage</p>
                        <ul className="mt-1 list-disc space-y-0.5 pl-4">
                          {account.smsRecovery.blockers.map((b) => (
                            <li key={b}>{RECOVERY_BLOCKER_LABEL[b as RecoveryBlocker] ?? b}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {account.recoveryMethods.pin ? (
                  <PinRecoveryCard
                    userId={account.userId}
                    idnId={account.idnId}
                    email={account.email}
                    authExists={account.authExists}
                    deletedAt={account.deletedAt}
                    hasAdminRole={hasAdminRole}
                  />
                ) : null}
                {account.recoveryMethods.password ? (
                  <PasswordRecoveryCard
                    userId={account.userId}
                    idnId={account.idnId}
                    email={account.email}
                    authExists={account.authExists}
                    deletedAt={account.deletedAt}
                    hasAdminRole={hasAdminRole}
                  />
                ) : null}
              </Panel>
            ) : null}

            <Panel id="lifecycle" title="Cycle de vie">
              <dl>
                <Field label="Inscription">{fmtDateTime(account.createdAt)}</Field>
                <Field label="Dernière modification">{fmtDateTime(account.updatedAt)}</Field>
                <Field label="Suppression demandée">
                  {account.deletionRequestedAt ? fmtDateTime(account.deletionRequestedAt) : "Non"}
                </Field>
                <Field label="Suppression prévue">
                  {account.deletionScheduledAt ? fmtDateTime(account.deletionScheduledAt) : "Non"}
                </Field>
                <Field label="Anonymisation">
                  {account.deletedAt ? fmtDateTime(account.deletedAt) : "Non"}
                </Field>
              </dl>
            </Panel>
          </div>
        </div>
      </PageBody>
    </>
  )
}

/**
 * Compte sans profil citoyen (opérateur créé depuis la console) : ni niveau
 * de garantie, ni dossier KYC, ni code provisoire — seulement l'accès.
 */
function OperatorAccount({
  account,
}: {
  account: {
    userId: string
    email: string
    name?: string
    emailVerified: boolean
    createdAt?: number
    roles: Array<{ role: string; assignedAt: number }>
  }
}) {
  const displayName = account.name ?? account.email
  return (
    <>
      <PageHeader
        kicker="Fiche du compte opérateur"
        title={displayName}
        breadcrumb={[{ label: "Comptes IDN", href: "/users" }, { label: displayName }]}
        description={<span className="font-mono text-xs">{account.email}</span>}
      />
      <PageBody>
        <p className="adm-panel mb-4 px-5 py-4 text-[13px] text-idn-muted">
          Ce compte n&apos;a pas de profil citoyen : il sert uniquement à
          accéder aux portails professionnels. Il n&apos;a ni niveau de
          garantie, ni dossier KYC, et ne figure pas dans l&apos;annuaire des
          comptes IDN.
        </p>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <AuditHistory userId={account.userId} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Panel id="auth" title="Compte et authentification">
              <dl>
                <Field label="E-mail" mono>{account.email}</Field>
                <Field label="E-mail vérifié">
                  <YesNo ok={account.emailVerified} yes="Vérifié" no="Non vérifié" />
                </Field>
                <Field label="Création">
                  {account.createdAt ? fmtDateTime(account.createdAt) : undefined}
                </Field>
                <Field label="Identifiant technique" mono>{account.userId}</Field>
              </dl>
            </Panel>
            <RolesPanel userId={account.userId} roles={account.roles} disabled={false} />
            <DevicesPanel userId={account.userId} />
          </div>
        </div>
      </PageBody>
    </>
  )
}

function RolesPanel({
  userId,
  roles,
  disabled,
}: {
  userId: string
  roles: Array<{ role: string; assignedAt: number }>
  disabled: boolean
}) {
  const assign = useMutation(api.admin.roles.assign)
  const revoke = useMutation(api.admin.roles.revoke)
  const available = ROLES.filter((r) => !roles.some((x) => x.role === r))
  const [choice, setChoice] = useState<Role | "">("")
  const [pending, setPending] = useState<
    { kind: "assign" | "revoke"; role: Role } | null
  >(null)

  return (
    <Panel
      id="roles"
      title="Rôles"
      description="Habilitations d'accès aux portails professionnels."
    >
      {roles.length === 0 ? (
        <p className="text-[13px] text-idn-muted">Aucun rôle : compte citoyen uniquement.</p>
      ) : (
        <ul className="divide-y divide-idn-border-soft">
          {roles.map((r) => (
            <li key={r.role} className="flex items-center justify-between gap-3 py-2 first:pt-0">
              <span>
                <span className="block text-[13px] font-medium text-idn-ink">
                  {ROLE_LABEL[r.role as Role] ?? r.role}
                </span>
                <span className="block text-xs text-idn-muted">
                  Attribué {relativeTime(r.assignedAt)}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPending({ kind: "revoke", role: r.role as Role })}
              >
                Révoquer
              </Button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && !disabled ? (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-idn-border-soft pt-4">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <label htmlFor="role-to-assign" className="adm-kicker">
              Attribuer un rôle
            </label>
            <Select value={choice} onValueChange={(v) => setChoice(v as Role)}>
              <SelectTrigger id="role-to-assign" className="!h-9 text-[13px]">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent className="shadow-none">
                {available.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            className="h-9"
            disabled={!choice}
            onClick={() => choice && setPending({ kind: "assign", role: choice })}
          >
            Attribuer
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === "revoke"
            ? `Révoquer le rôle ${pending ? ROLE_LABEL[pending.role] : ""}`
            : `Attribuer le rôle ${pending ? ROLE_LABEL[pending.role] : ""}`
        }
        consequence={
          pending?.kind === "revoke"
            ? "Le titulaire perd immédiatement l'accès au portail correspondant. L'action est journalisée."
            : pending?.role === "admin"
              ? "Le titulaire obtient un accès complet à la console d'administration : comptes, applications, rôles et journaux. L'action est journalisée."
              : "Le titulaire obtient l'accès au portail correspondant dès sa prochaine connexion. L'action est journalisée."
        }
        confirmLabel={pending?.kind === "revoke" ? "Révoquer le rôle" : "Attribuer le rôle"}
        destructive={pending?.kind === "revoke"}
        onConfirm={async () => {
          if (!pending) return
          try {
            if (pending.kind === "revoke") {
              await revoke({ userId, role: pending.role })
              toast.success(`Rôle ${ROLE_LABEL[pending.role]} révoqué.`)
            } else {
              await assign({ userId, role: pending.role })
              toast.success(`Rôle ${ROLE_LABEL[pending.role]} attribué.`)
              setChoice("")
            }
          } catch (err) {
            toast.error(errorMessage(err, "Action impossible."))
            throw err
          }
        }}
      />
    </Panel>
  )
}

function DevicesPanel({ userId }: { userId: string }) {
  const data = useQuery(api.admin.accountDevices.listForUser, { userId })
  return (
    <Panel id="devices" title="Sessions et appareils" description="Sessions actives et appareils inscrits aux alertes.">
      {data === undefined ? (
        <Skeleton className="h-16 w-full" />
      ) : data.sessions.length === 0 && data.devices.length === 0 ? (
        <p className="text-[13px] text-idn-muted">
          Aucune session active ni appareil inscrit aux alertes.
        </p>
      ) : (
        <div className="space-y-4">
          {data.sessions.length > 0 ? (
            <div>
              <h3 className="adm-kicker mb-2">Sessions actives · {data.sessions.length}</h3>
              <ul className="divide-y divide-idn-border-soft">
                {data.sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="min-w-0">
                      <span className="block font-medium text-idn-ink">{s.device}</span>
                      <span className="block font-mono text-[11px] text-idn-muted">
                        {s.ipAddress ?? "Adresse IP inconnue"}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-idn-muted">
                      Active {relativeTime(s.lastSeenAt)}
                      <span className="block">ouverte le {fmtDate(s.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {data.devices.length > 0 ? (
            <div>
              <h3 className="adm-kicker mb-2">Appareils inscrits aux alertes · {data.devices.length}</h3>
              <ul className="divide-y divide-idn-border-soft">
                {data.devices.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="font-medium text-idn-ink">{d.label}</span>
                    <span className="text-xs text-idn-muted">
                      {d.kind === "web" ? "Navigateur" : d.kind === "ios" ? "Application iOS" : "Application Android"}
                      {" · "}inscrit {relativeTime(d.registeredAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Panel>
  )
}

function AuditHistory({ userId }: { userId: string }) {
  const rows = useQuery(api.admin.auditExplorer.listForUser, { userId, limit: 50 })
  return (
    <Panel
      id="history"
      title="Historique d'audit"
      description="Actions du titulaire et actions menées sur son compte, du plus récent au plus ancien."
      bodyClassName="p-0"
    >
      {rows === undefined ? (
        <div className="space-y-3 p-5">
          <Skeleton className="w-full" />
          <Skeleton className="w-2/3" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="Aucun événement" description="Rien n'a encore été journalisé pour ce compte." />
      ) : (
        <DataTable
          label="Historique d'audit du compte"
          minWidth={480}
          head={
            <>
              <Th>Événement</Th>
              <Th>Par</Th>
              <Th>Quand</Th>
            </>
          }
        >
          {rows.map((e) => (
            <Tr key={e._id}>
              <Td>
                <span className="flex items-center gap-2">
                  {eventTone(e.action) !== "neutral" ? (
                    <span
                      aria-hidden
                      className={
                        eventTone(e.action) === "red"
                          ? "size-1.5 rounded-full bg-[#B3261E]"
                          : "size-1.5 rounded-full bg-idn-yellow"
                      }
                    />
                  ) : null}
                  {eventLabel(e.action, e.metadata)}
                </span>
              </Td>
              <Td>
                {e.actor?.userId === userId ? (
                  <span className="text-idn-muted">Le titulaire</span>
                ) : (
                  <PersonCell person={e.actor} />
                )}
              </Td>
              <Td className="whitespace-nowrap text-idn-muted">
                <time dateTime={new Date(e.createdAt).toISOString()} title={fmtDateTime(e.createdAt)}>
                  {relativeTime(e.createdAt)}
                </time>
              </Td>
            </Tr>
          ))}
        </DataTable>
      )}
    </Panel>
  )
}
