import { AppBar } from "@/app/_components/idn/app-bar"
import { Card, Row } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

/**
 * Aide et contact : transposition de apps/mobile/src/app/settings/support.tsx.
 * Sur le web, les liens tel: et mailto: sont confiés au navigateur.
 */
export default function SupportPage() {
  return (
    <Screen header={<AppBar title="Aide et contact" back="/profile" />}>
      <p className="mt-4 text-sm leading-5 text-idn-muted">Une difficulté avec ton identité numérique ? Choisis le moyen qui te convient.</p>
      <Card className="mt-4">
        <Row icon="smartphone" tone="green" title="Appeler le centre d’appel" sub="1407" chevron href="tel:1407" />
        <Row icon="mail" title="Écrire au support" sub="support@identite.ga · réponse sous 48 heures ouvrées" chevron href="mailto:support@identite.ga" />
        <Row icon="globe" title="Consulter le centre d’aide" sub="Guides et questions fréquentes" chevron href="/help" />
      </Card>
    </Screen>
  )
}
