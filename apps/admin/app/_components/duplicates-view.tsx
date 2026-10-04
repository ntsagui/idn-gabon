"use client"

/**
 * Vue « Doublons » des comptes — même nom, même prénom, même date de
 * naissance — précédée de la file des signalements à arbitrer.
 *
 * La vue inventorie, elle ne décide pas : elle marque le compte le plus
 * ancien et le mieux vérifié à titre indicatif et laisse l'admin trancher.
 * Un rapprochement automatique sur ce triplet suffirait à faire supprimer le
 * compte d'un homonyme.
 */
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { LoABadge } from "@repo/ui/components/loa-badge"

import { fr } from "../_content/fr"
import { fmtDate, fmtIsoDay } from "../_lib/format"
import { DuplicateSignals } from "./duplicate-signals"
import { EmptyState } from "./empty-state"
import { PersonCell } from "./person"
import { TableSkeleton } from "./skeleton"
import { DataTable, Td, Th, Tr } from "./table"
import { UserRowActions } from "./user-row-actions"

const t = fr.duplicates

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded bg-idn-surface-2 px-1.5 text-[11px] font-medium text-idn-ink-2">
      {children}
    </span>
  )
}

export function DuplicatesView() {
  const data = useQuery(api.admin.duplicates.listDuplicateGroups, {})

  return (
    <div className="space-y-4">
      <DuplicateSignals />

      <section aria-labelledby="dup-groups-title" className="adm-panel">
        <div className="border-b border-idn-border-soft px-5 py-4">
          <h2 id="dup-groups-title" className="text-[15px] font-semibold text-idn-ink">
            Identités portées par plusieurs comptes
          </h2>
          <p className="mt-0.5 text-[13px] text-idn-muted">
            Même nom, prénom et date de naissance. Les repères « plus ancien » et
            « mieux vérifié » sont indicatifs : vérifiez avant de supprimer.
          </p>
        </div>

        {data === undefined ? (
          <TableSkeleton rows={4} />
        ) : data.groups.length === 0 ? (
          <EmptyState title={t.emptyTitle} description={t.emptyBody} />
        ) : (
          <div className="divide-y divide-idn-border">
            {data.truncated ? (
              <p className="bg-idn-yellow-soft px-5 py-2 text-[13px] text-[#6B5400] dark:bg-[#2E2708] dark:text-[#F2D45C]">
                {t.truncated}
              </p>
            ) : null}
            {data.groups.map((g) => {
              const bestLoa = Math.max(...g.accounts.map((a) => a.loa))
              return (
                <div key={g.key}>
                  <h3 className="flex flex-wrap items-baseline gap-x-2 px-5 pb-2 pt-4 text-[13px] font-semibold text-idn-ink">
                    {g.lastName.toUpperCase()} {g.firstName}
                    <span className="font-normal text-idn-muted">
                      · {t.bornOn} {fmtIsoDay(g.dateOfBirth)} · {t.groupCount(g.accounts.length)}
                    </span>
                  </h3>
                  <DataTable
                    label={`Comptes de ${g.firstName} ${g.lastName}`}
                    head={
                      <>
                        <Th>Compte</Th>
                        <Th>Niveau</Th>
                        <Th>Repères</Th>
                        <Th>Création</Th>
                        <Th align="right">Actions</Th>
                      </>
                    }
                  >
                    {g.accounts.map((a, i) => (
                      <Tr key={a.userId}>
                        <Td>
                          <PersonCell
                            person={{
                              userId: a.userId,
                              email: a.email || undefined,
                              idnId: a.idnId,
                              exists: true,
                            }}
                          />
                        </Td>
                        <Td>
                          <LoABadge level={a.loa as 1 | 2 | 3} compact />
                        </Td>
                        <Td>
                          <span className="flex flex-wrap gap-1">
                            {i === 0 ? <Chip>{t.oldest}</Chip> : null}
                            {a.loa === bestLoa ? <Chip>{t.bestLoa}</Chip> : null}
                            {a.hasKyc ? <Chip>Dossier KYC</Chip> : null}
                          </span>
                        </Td>
                        <Td className="whitespace-nowrap text-idn-muted">{fmtDate(a.createdAt)}</Td>
                        <Td align="right">
                          <UserRowActions userId={a.userId} idnId={a.idnId} email={a.email} />
                        </Td>
                      </Tr>
                    ))}
                  </DataTable>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
