"use client"

/**
 * Rôles et habilitations : matrice des droits par rôle, titulaires,
 * attribution et révocation.
 *
 * Chaque rôle n'ouvre que son portail (`lib/auth.requireRole`) : un
 * administrateur n'accède pas au portail de contrôle sans le rôle contrôleur.
 */
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { Check, Minus } from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import { cn } from "@repo/ui/lib/utils"

import { AssignRoleDialog } from "../../_components/assign-role-dialog"
import { ConfirmDialog } from "../../_components/confirm-dialog"
import { CreateOperatorDialog } from "../../_components/create-operator-dialog"
import { EmptyState } from "../../_components/empty-state"
import { PageBody, PageHeader } from "../../_components/page-header"
import { Panel } from "../../_components/panel"
import { PersonCell } from "../../_components/person"
import { TableSkeleton } from "../../_components/skeleton"
import { StatusPill } from "../../_components/status-pill"
import { DataTable, Td, Th, Tr } from "../../_components/table"
import { fmtNumber, plural, since } from "../../_lib/format"
import { ROLE_LABEL, ROLES, type Role } from "../../_lib/labels"

const CAPABILITIES: Array<{ label: string; roles: Role[]; note?: string }> = [
  { label: "Console d'administration : comptes, applications, journal", roles: ["admin"] },
  { label: "Codes provisoires de mot de passe et de PIN", roles: ["admin"] },
  { label: "Attribution et révocation des rôles", roles: ["admin"] },
  { label: "Revue et suspension des applications OAuth", roles: ["admin"] },
  { label: "Portail de contrôle : file KYC, examen, vérification d'identité", roles: ["identity_controller"] },
  { label: "Portail développeur : applications, clés d'API, webhooks", roles: ["developer"] },
  {
    label: "Publication en production",
    roles: ["developer"],
    note: "Après validation du développeur par un administrateur",
  },
]

type Filter = "all" | Role

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : fallback
}

export default function RolesPage() {
  const summary = useQuery(api.admin.roles.listRolesSummary, {})
  const operators = useQuery(api.admin.roles.listOperators, { limit: 500 })
  const revoke = useMutation(api.admin.roles.revoke)
  const setVerified = useMutation(api.admin.roles.setDeveloperVerified)
  const [filter, setFilter] = useState<Filter>("all")
  const [pending, setPending] = useState<
    | { kind: "revoke"; userId: string; role: Role; label: string }
    | { kind: "verify"; userId: string; verified: boolean; label: string }
    | null
  >(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of summary ?? []) c[r.role] = r.count
    return c
  }, [summary])
  const totalAssignments = (summary ?? []).reduce((s, r) => s + r.count, 0)
  const rows = (operators ?? []).filter((o) => filter === "all" || o.role === filter)

  return (
    <>
      <PageHeader
        kicker={summary ? `Sécurité · ${plural(totalAssignments, "habilitation", "habilitations")}` : "Sécurité"}
        title="Rôles et habilitations"
        description="Qui peut faire quoi dans les portails professionnels d'IDN."
        actions={
          <>
            <CreateOperatorDialog />
            <AssignRoleDialog />
          </>
        }
      />
      <PageBody>
        <Panel id="matrix" title="Matrice des droits" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <caption className="sr-only">Droits accordés par chaque rôle</caption>
              <thead className="bg-idn-surface-2">
                <tr className="border-b border-idn-border">
                  <th scope="col" className="h-10 px-4 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-idn-muted">
                    Droit
                  </th>
                  {ROLES.map((r) => (
                    <th key={r} scope="col" className="h-10 px-4 text-center">
                      <span className="block text-[13px] font-semibold text-idn-ink">{ROLE_LABEL[r]}</span>
                      <span className="block font-mono text-[11px] font-normal text-idn-muted">
                        {summary ? plural(counts[r] ?? 0, "titulaire", "titulaires") : "…"}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap) => (
                  <tr key={cap.label} className="border-b border-idn-border-soft last:border-0">
                    <th scope="row" className="px-4 py-2.5 font-normal text-idn-ink">
                      {cap.label}
                      {cap.note ? <span className="block text-xs text-idn-muted">{cap.note}</span> : null}
                    </th>
                    {ROLES.map((r) => (
                      <td key={r} className="px-4 py-2.5 text-center">
                        {cap.roles.includes(r) ? (
                          <>
                            <Check aria-hidden className="mx-auto size-4 text-idn-green" />
                            <span className="sr-only">Oui</span>
                          </>
                        ) : (
                          <>
                            <Minus aria-hidden className="mx-auto size-4 text-idn-muted-soft" />
                            <span className="sr-only">Non</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          id="holders"
          title="Titulaires"
          className="mt-4"
          bodyClassName="p-0"
          actions={
            <div role="group" aria-label="Filtrer par rôle" className="flex flex-wrap gap-1">
              {(["all", ...ROLES] as Filter[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-idn-green",
                    filter === k
                      ? "bg-idn-green-soft text-idn-green-dark dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                      : "text-idn-muted hover:bg-idn-surface-2 hover:text-idn-ink",
                  )}
                >
                  {k === "all" ? "Tous" : ROLE_LABEL[k]}
                  <span className="font-mono text-[11px]">
                    {fmtNumber(k === "all" ? totalAssignments : (counts[k] ?? 0))}
                  </span>
                </button>
              ))}
            </div>
          }
        >
          {operators === undefined ? (
            <TableSkeleton rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              title="Aucun titulaire"
              description="Attribuez ce rôle à un compte existant ou créez un compte opérateur."
              action={<AssignRoleDialog defaultRole={filter === "all" ? undefined : filter} />}
            />
          ) : (
            <DataTable
              label="Titulaires des rôles"
              head={
                <>
                  <Th>Titulaire</Th>
                  <Th>Rôle</Th>
                  <Th>Ancienneté</Th>
                  <Th>Production</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {rows.map((o) => {
                const label = o.name ?? o.email
                return (
                  <Tr key={`${o.userId}-${o.role}`}>
                    <Td className="max-w-[260px]">
                      <PersonCell
                        person={{ userId: o.userId, name: o.name, email: o.email, exists: true }}
                        secondary="email"
                      />
                    </Td>
                    <Td>{ROLE_LABEL[o.role as Role] ?? o.role}</Td>
                    <Td className="whitespace-nowrap text-idn-muted">{since(o.assignedAt)}</Td>
                    <Td>
                      {o.role === "developer" ? (
                        <StatusPill tone={o.verified ? "green" : "neutral"}>
                          {o.verified ? "Validé" : "Sandbox uniquement"}
                        </StatusPill>
                      ) : (
                        <span className="text-idn-muted">Sans objet</span>
                      )}
                    </Td>
                    <Td align="right">
                      <span className="flex justify-end gap-1.5">
                        {o.role === "developer" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPending({ kind: "verify", userId: o.userId, verified: !o.verified, label })
                            }
                          >
                            {o.verified ? "Retirer la validation" : "Valider pour la production"}
                          </Button>
                        ) : null}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPending({ kind: "revoke", userId: o.userId, role: o.role as Role, label })
                          }
                          className="text-[#B3261E] hover:bg-[#FBE9E7] hover:text-[#B3261E] dark:text-[#F2A49E] dark:hover:bg-[#3A1513]"
                        >
                          Révoquer
                        </Button>
                      </span>
                    </Td>
                  </Tr>
                )
              })}
            </DataTable>
          )}
        </Panel>
      </PageBody>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.kind === "revoke"
            ? `Révoquer le rôle ${ROLE_LABEL[pending.role]} de ${pending.label}`
            : pending?.kind === "verify" && pending.verified
              ? `Valider ${pending.label} pour la production`
              : `Retirer la validation de ${pending?.label ?? ""}`
        }
        consequence={
          pending?.kind === "revoke"
            ? "L'accès au portail correspondant est retiré immédiatement. Le compte citoyen n'est pas modifié. L'action est journalisée."
            : pending?.kind === "verify" && pending.verified
              ? "Le développeur pourra demander la mise en production de ses applications. Chaque demande reste soumise à votre approbation."
              : "Le développeur ne pourra plus créer ni publier d'application hors Sandbox. Ses applications déjà en production ne sont pas suspendues."
        }
        confirmLabel={
          pending?.kind === "revoke"
            ? "Révoquer le rôle"
            : pending?.kind === "verify" && pending.verified
              ? "Valider"
              : "Retirer la validation"
        }
        destructive={pending?.kind === "revoke" || (pending?.kind === "verify" && !pending.verified)}
        onConfirm={async () => {
          if (!pending) return
          try {
            if (pending.kind === "revoke") {
              await revoke({ userId: pending.userId, role: pending.role })
              toast.success(`Rôle ${ROLE_LABEL[pending.role]} révoqué pour ${pending.label}.`)
            } else {
              await setVerified({ userId: pending.userId, verified: pending.verified })
              toast.success(
                pending.verified
                  ? `${pending.label} est validé pour la production.`
                  : `Validation production retirée pour ${pending.label}.`,
              )
            }
          } catch (err) {
            toast.error(errorMessage(err, "Action impossible."))
            throw err
          }
        }}
      />
    </>
  )
}
