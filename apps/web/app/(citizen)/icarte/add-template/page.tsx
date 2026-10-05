"use client"

import { useRouter } from "next/navigation"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Card, Row, ScreenTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { CARD_TEMPLATES, TEMPLATE_LABELS } from "../_content/cards"

/** Choix du type de carte : transposition de apps/mobile/src/app/(tabs)/icarte/add-template.tsx. */
export default function ICarteAddTemplatePage() {
  const router = useRouter()
  return (
    <Screen header={<AppBar title="Ajouter une carte" back="/icarte" />}>
      <ScreenTitle title="Quel type de carte ?" lead="Les informations restent sur ton compte IDN. Tu pourras les modifier à tout moment." />
      <Card className="mt-5">
        {CARD_TEMPLATES.map((tp) => (
          <Row key={tp.id} icon={tp.icon} title={TEMPLATE_LABELS[tp.id]} chevron onClick={() => router.replace(`/icarte/add?template=${tp.id}`)} />
        ))}
        <Row icon="palette" tone="green" title="Carte personnalisée" sub="Fidélité, adhésion, badge…" chevron onClick={() => router.replace("/icarte/custom")} />
      </Card>
    </Screen>
  )
}
