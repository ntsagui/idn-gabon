"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Card, DetailRow, ErrorNote, Row, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"
import { cardNumberLabel, cardValidity } from "@/lib/citizen/wallet-display"
import { moveItem } from "@/lib/citizen/wallet-order"

import { CardFace, CardSwatch } from "./_components/card-face"
import { CARD_TEMPLATES, walletCardToUi, type UiCard } from "./_content/cards"
import { errorMessage } from "./_lib/nav"

const PEEK = 64
const CARD_H = 200

type WalletItem = UiCard & { data: Record<string, string> }

/**
 * iCarte : transposition de apps/mobile/src/app/(tabs)/icarte/index.tsx.
 * Téléphone : pile de cartes, détail de la carte touchée, « Mes cartes ».
 * Grand écran : grille de cartes et panneau de détail à droite.
 */
export default function ICartePage() {
  const router = useRouter()
  const wallet = useQuery(api.wallet.listMine)
  const setFeatured = useMutation(api.wallet.setFeatured)
  const reorderFeatured = useMutation(api.wallet.reorderFeatured)
  const removeCard = useMutation(api.wallet.remove)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [organize, setOrganize] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [toDelete, setToDelete] = React.useState<WalletItem | null>(null)

  const cards: WalletItem[] = (wallet?.cards ?? []).map((c) => ({ ...walletCardToUi(c), data: c.data }))
  // Les cartes du profil d’abord (dans leur ordre), puis les autres.
  const ordered = [...cards.filter((c) => c.featured), ...cards.filter((c) => !c.featured)]
  const featured = ordered.filter((c) => c.featured)
  const selected = ordered.find((c) => c.id === selectedId) ?? ordered[ordered.length - 1]
  const limit = wallet?.featuredLimit ?? 6

  async function run(fn: () => Promise<unknown>, title: string) {
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError(`${title}. ${errorMessage(err, "Réessaie.")}`)
    }
  }

  const detail = selected ? (
    <>
      <Card as="section" className="mt-3 lg:mt-0">
        <dl className="divide-y divide-idn-border">
          <DetailRow label="Carte" value={selected.name} />
          {selected.sub ? <DetailRow label="Mention" value={selected.sub} /> : null}
          {cardNumberLabel(selected.data) ? <DetailRow label="Numéro" value={cardNumberLabel(selected.data)} mono /> : null}
          {cardValidity(selected.data) ? <DetailRow label="Validité" value={cardValidity(selected.data)} /> : null}
          <DetailRow label="Profil public" value={selected.featured ? "Affichée" : "Masquée"} />
        </dl>
      </Card>
      <IdnButton variant="secondary" full href={`/icarte/${selected.id}`} leadIcon={<Icon name="qr" size={16} />} className="mt-3">
        Présenter cette carte
      </IdnButton>
    </>
  ) : null

  return (
    <Screen
      width="wide"
      header={<AppBar title="iCarte" right={<IconButton icon="plus" label="Ajouter une carte" href="/icarte/add-template" />} />}
    >
      {wallet === undefined ? (
        <p role="status" className="mt-6 text-sm text-idn-muted">
          Chargement…
        </p>
      ) : ordered.length === 0 ? (
        <div className="mt-8 flex flex-col items-center text-center">
          <IdnLottie name="icarte" size={140} label="Portefeuille de cartes" />
          <h2 className="mt-2 text-lg font-semibold text-idn-ink">Ton portefeuille est vide</h2>
          <p className="mt-1 max-w-md text-sm leading-5 text-idn-muted">
            Ajoute ta CNI, ton permis, ta carte CNAMGS ou une carte de fidélité pour les présenter depuis ton téléphone.
          </p>
        </div>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <div className="min-w-0">
            <p className="mt-3 text-[13px] text-idn-muted">
              {ordered.length} carte{ordered.length > 1 ? "s" : ""} · <span className="lg:hidden">touche une carte pour l’afficher</span>
              <span className="hidden lg:inline">choisis une carte pour l’afficher</span>
            </p>

            {/* Téléphone : pile de cartes (carte repliée = bande visible de 64 px). */}
            <ul className="mt-3 lg:hidden" aria-label="Mes cartes">
              {ordered.map((card, i) => {
                const isSel = card.id === selected?.id
                const collapsed = !isSel && i !== ordered.length - 1
                return (
                  <li key={card.id} className="relative" style={{ height: collapsed ? PEEK : CARD_H, marginBottom: collapsed ? 0 : 12, zIndex: i }}>
                    <button
                      type="button"
                      onClick={() => (isSel ? router.push(`/icarte/${card.id}`) : setSelectedId(card.id))}
                      aria-label={isSel ? `${card.name}, ouvrir la carte` : `Afficher ${card.name}`}
                      className="absolute inset-x-0 top-0 block h-full overflow-visible rounded-[20px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-idn-bg"
                    >
                      <CardFace card={card} data={card.data} selected={isSel} className="absolute inset-x-0 top-0" />
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Grand écran : grille de cartes. */}
            <ul className="mt-3 hidden gap-4 lg:grid lg:grid-cols-2" aria-label="Mes cartes">
              {ordered.map((card) => {
                const isSel = card.id === selected?.id
                return (
                  <li key={card.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(card.id)}
                      aria-pressed={isSel}
                      aria-label={`Afficher ${card.name}`}
                      className="block w-full rounded-[20px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-idn-bg"
                    >
                      <CardFace card={card} data={card.data} selected={isSel} />
                    </button>
                  </li>
                )
              })}
            </ul>

            <div className="lg:hidden">{detail}</div>

            <SectionTitle action={organize ? "Terminé" : "Organiser"} onAction={() => setOrganize((v) => !v)}>
              Mes cartes
            </SectionTitle>
            <ErrorNote className="mb-3 mt-0">{actionError}</ErrorNote>
            {organize ? (
              <>
                <p className="mb-2 text-[13px] text-idn-muted">
                  {`${featured.length}/${limit} cartes affichées sur ton profil public. Les flèches règlent leur ordre.`}
                </p>
                <Card as="ul">
                  {ordered.map((card) => {
                    const fi = featured.findIndex((f) => f.id === card.id)
                    const iconBtn =
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full outline-none hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                    return (
                      <li key={card.id} className="flex min-h-14 items-center gap-2">
                        <CardSwatch grad={card.grad} />
                        <span className="min-w-0 flex-1 truncate text-sm text-idn-ink">{card.name}</span>
                        {card.featured ? (
                          <>
                            <button
                              type="button"
                              aria-label={`Descendre ${card.name}`}
                              disabled={fi >= featured.length - 1}
                              onClick={() =>
                                void run(
                                  () => reorderFeatured({ orderedIds: moveItem(featured.map((f) => f.id), fi, 1) as Id<"walletCard">[] }),
                                  "Ordre non enregistré"
                                )
                              }
                              className={cn(iconBtn, "text-idn-ink")}
                            >
                              <Icon name="chevDn" size={20} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Masquer ${card.name} du profil`}
                              onClick={() => void run(() => setFeatured({ cardId: card.id as Id<"walletCard">, featured: false }), "Action impossible")}
                              className={cn(iconBtn, "text-c-green-text")}
                            >
                              <Icon name="eye" size={20} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Afficher ${card.name} sur le profil`}
                            onClick={() =>
                              featured.length >= limit
                                ? // Limite connue d’avance : même message que le backend, sans requête vouée à l’échec.
                                  setActionError(`Action impossible. Maximum ${limit} cartes dans le profil. Masque d’abord une autre carte.`)
                                : void run(() => setFeatured({ cardId: card.id as Id<"walletCard">, featured: true }), "Action impossible")
                            }
                            className={cn(iconBtn, "text-idn-muted")}
                          >
                            <Icon name="eyeOff" size={20} />
                          </button>
                        )}
                        <IconButton icon="edit" label={`Modifier ${card.name}`} plain size={36} href={`/icarte/edit/${card.id}`} />
                        <button type="button" aria-label={`Supprimer ${card.name}`} onClick={() => setToDelete(card)} className={cn(iconBtn, "text-c-red-text")}>
                          <Icon name="trash" size={20} />
                        </button>
                      </li>
                    )
                  })}
                </Card>
              </>
            ) : null}

            <AddSection />
          </div>

          <aside className="hidden lg:block" aria-label="Carte sélectionnée">
            <div className="sticky top-6 mt-3">
              {selected ? <CardFace card={selected} data={selected.data} /> : null}
              {detail}
            </div>
          </aside>
        </div>
      )}

      {ordered.length === 0 && wallet !== undefined ? <AddSection /> : null}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Supprimer la carte ?"
        description={toDelete ? `« ${toDelete.name} » sera retirée de ton iCarte.` : undefined}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (!toDelete) return
          await removeCard({ cardId: toDelete.id as Id<"walletCard"> })
          if (selectedId === toDelete.id) setSelectedId(null)
        }}
      />
    </Screen>
  )
}

function AddSection() {
  return (
    <>
      <SectionTitle>Ajouter une carte</SectionTitle>
      <Card>
        {CARD_TEMPLATES.map((tp) => (
          <Row
            key={tp.id}
            icon={tp.icon}
            tone="neutral"
            title={tp.label === "Visite" ? "Carte de visite" : tp.label}
            chevron
            href={`/icarte/add?template=${tp.id}`}
          />
        ))}
        <Row icon="palette" tone="green" title="Carte personnalisée" sub="Fidélité, adhésion, badge…" chevron href="/icarte/custom" />
      </Card>
    </>
  )
}
