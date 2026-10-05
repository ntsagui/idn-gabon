import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"

import { AppBar } from "@/app/_components/idn/app-bar"
import { Card, Row, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import pkg from "../../../../package.json"

/** À propos : transposition de apps/mobile/src/app/settings/about.tsx (version du site web). */
export default function AboutPage() {
  return (
    <Screen header={<AppBar title="À propos" back="/profile" />}>
      <Card padded className="mt-4 flex flex-col items-center py-[22px]">
        <IdnMark size={56} aria-hidden />
        <p className="mt-3 text-lg font-semibold text-idn-ink">Identité Numérique</p>
        <p className="mt-0.5 text-[13px] text-idn-muted">Ntsagui digital</p>
        <p className="mt-3 font-mono text-xs text-idn-muted">Version {pkg.version}</p>
      </Card>
      <p className="mt-4 text-sm leading-[21px] text-idn-ink-2">
        IDN est l’infrastructure de confiance qui relie chaque citoyen, résident et visiteur aux services administratifs en ligne. Opérée par Ntsagui digital.
      </p>

      <SectionTitle>Informations légales</SectionTitle>
      <Card>
        <Row icon="doc" title="Conditions d’utilisation" chevron href="/legal/terms" />
        <Row icon="shieldPlain" title="Politique de confidentialité" chevron href="/legal/privacy" />
        <Row icon="scale" title="Mentions légales" chevron href="/legal/mentions" />
        <Row icon="eye" title="Accessibilité (RGAA)" chevron href="/legal/accessibilite" />
        <Row icon="file" title="Licences open source" chevron href="/legal/licenses" />
      </Card>

      <SectionTitle>Service</SectionTitle>
      <Card>
        <Row icon="activity" title="État de la plateforme" sub="Composants du service et transparence" chevron href="/status" />
        <Row icon="chat" title="Aide et contact" chevron href="/settings/support" />
      </Card>

      <div className="flex justify-center pt-6">
        <IdnFlagBars width={42} height={3} />
      </div>
    </Screen>
  )
}
