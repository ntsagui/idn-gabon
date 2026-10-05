import { Card, IconTile, Row, ScreenTitle, SectionTitle } from "@/app/_components/idn/list"

import { Fact, Facts } from "./fact"

/** Ce que le Niveau 3 permet, tel que présenté par la charte. */
export const LEVEL3_UNLOCKS = [
  { icon: "edit", title: "Signature électronique qualifiée", sub: "Même valeur qu’une signature manuscrite" },
  { icon: "scrollText", title: "Procurations et actes notariés", sub: "Sans te déplacer au guichet" },
  { icon: "plane", title: "Passeport et titres sécurisés", sub: "Demande et renouvellement en ligne" },
  { icon: "landmark", title: "Ouverture de compte bancaire", sub: "Entrée en relation à distance" },
] as const

/** Présentation du Niveau 3 (prototype « l3-intro »). */
export function Level3Intro({ durationMin, needsLevel2 }: { durationMin?: number; needsLevel2?: boolean }) {
  return (
    <>
      <div className="mt-4">
        <IconTile icon="shield" tone="green" />
      </div>
      <ScreenTitle
        title="Passe au Niveau 3"
        lead={
          needsLevel2
            ? "Le niveau de garantie le plus élevé. Il faut d’abord faire vérifier ta pièce d’identité et ton visage (Niveau 2)."
            : "Le niveau de garantie le plus élevé : un contrôleur de l’État confirme ton identité lors d’un entretien vidéo."
        }
      />
      <Facts>
        <Fact value={durationMin ? `${durationMin} min` : "Court"} label="Durée" />
        <Fact value="Visio" label="Avec un agent" />
        <Fact value="Gratuit" label="Service public" />
      </Facts>
      <SectionTitle>Ce que ça débloque</SectionTitle>
      <Card>
        {LEVEL3_UNLOCKS.map((u) => (
          <Row key={u.title} icon={u.icon} tone="green" title={u.title} sub={u.sub} />
        ))}
      </Card>
      <SectionTitle>À préparer</SectionTitle>
      <Card>
        <Row icon="idCard" title="Ta CNI originale" sub="En cours de validité, à montrer face caméra" />
        <Row icon="home" title="Un endroit calme et éclairé" sub="Seul, visage bien visible" />
        <Row icon="wifi" title="Une connexion stable" sub="Wi-Fi ou 4G" />
      </Card>
    </>
  )
}
