import { LoABadge } from "@repo/ui/components/loa-badge"

import { A, C, Callout, Code, H2, P, Table } from "../_components/prose"

export default function LoaArticle() {
  return (
    <>
      <P>
        Chaque session IDN porte un niveau de garantie aligné sur eIDAS. Il est transmis dans les claims <C>acr</C> et{" "}
        <C>loa</C> (scope <C>profile</C>).
      </P>
      <H2 id="niveaux">Les trois niveaux</H2>
      <Table
        head={["Niveau", "acr", "Ce qui a été vérifié"]}
        mono={[1]}
        rows={[
          [<LoABadge key="1" level={1} compact />, "eidas1", "Compte Identité Numérique, adresse e-mail vérifiée."],
          [<LoABadge key="2" level={2} compact />, "eidas2", "Identité vérifiée sur pièce d’identité et selfie."],
          [<LoABadge key="3" level={3} compact />, "eidas3", "Identité vérifiée en présence d’un agent habilité."],
        ]}
      />
      <H2 id="exiger">Exiger un niveau</H2>
      <P>Deux mécanismes, cumulables — le niveau appliqué est le plus élevé des deux :</P>
      <Table
        head={["Où", "Comment", "Portée"]}
        mono={[]}
        rows={[
          ["Portail développeur", "« Niveau de garantie exigé » de l’application", "Toutes les connexions à l’application."],
          ["Requête d’autorisation", "acr_values=eidas2 (ou eidas3)", "Cette connexion seulement (par exemple une démarche sensible)."],
        ]}
      />
      <Code
        title="React"
        code={`<IDNSignInButton className="idn-btn" acrValues={["eidas2"]} />`}
      />
      <P>
        Si l’usager n’a pas le niveau exigé, l’écran de consentement d’IDN le lui indique et lui propose de faire
        vérifier son identité.
      </P>
      <H2 id="lire">Lire le niveau</H2>
      <Code
        title="React"
        code={`import { RequireLoA, useLoA } from "@idn-ga/react"

function Demarche() {
  const { loa, acr, hasMinimum } = useLoA()
  return (
    <RequireLoA level={2} fallback={<p>Cette démarche exige une identité vérifiée.</p>}>
      <Formulaire />
    </RequireLoA>
  )
}`}
      />
      <P>
        Le claim <C>loa</C> est figé au moment de la connexion. Pour l’état actuel (par exemple après une vérification
        en cours), le client <C>@idn-ga/core</C> expose <C>getVerificationStatus()</C>, qui renvoie <C>loa</C>,{" "}
        <C>acr</C>, <C>verified</C> et l’avancement de la vérification ; <C>requestIdentityVerification(2)</C> relance la
        connexion avec <C>acr_values</C>.
      </P>
      <Callout tone="attention" title="À revérifier côté serveur">
        <C>RequireLoA</C> ne fait que masquer l’interface. Votre serveur doit contrôler le niveau à partir de UserInfo
        avant de traiter une démarche. Voir <A href="/docs/securite">Bonnes pratiques de sécurité</A>.
      </Callout>
    </>
  )
}
