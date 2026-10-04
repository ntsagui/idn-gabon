import { A, C, Callout, Code, H2, P, Table, UL } from "../_components/prose"

export default function ApiKeysArticle() {
  return (
    <>
      <P>
        Les clés API authentifient des appels de serveur à serveur, sans usager connecté. Elles sont distinctes du{" "}
        <C>client_secret</C> OAuth, qui ne sert qu’à l’échange de code.
      </P>
      <H2 id="creer">Créer une clé</H2>
      <UL>
        <li>Depuis <A href="/api-keys">Clés API</A> ou l’onglet « Identifiants et clés » d’une application.</li>
        <li>Chaque clé est rattachée à une application ; supprimer l’application révoque ses clés.</li>
        <li>Expiration facultative (1 à 365 jours) ; 25 clés actives au plus par compte.</li>
        <li>La clé (<C>idn_pat_…</C>) n’est affichée qu’une fois ; seul son préfixe reste visible.</li>
      </UL>
      <H2 id="utiliser">Utiliser une clé</H2>
      <Code
        title="Requête"
        code={`curl -H "Authorization: Bearer idn_pat_…" \\
  https://site.identite.ga/api/…`}
      />
      <H2 id="scopes">Scopes des clés</H2>
      <Table
        head={["Scope", "Autorise"]}
        rows={[
          ["citizens:resolve", "Résoudre un usager à partir de son identifiant."],
          ["idn:delegate:lookup · create · status", "Identités déléguées : consulter, créer, suivre."],
          ["idn:verification:list · claim · decide · media · join", "Traitement des demandes de vérification, scopes séparés et non hiérarchiques."],
          ["idn:iboite:letters:create", "Déposer des courriers iBoîte."],
        ]}
      />
      <Callout tone="attention" title="Habilitations">
        Ces scopes donnent accès à des données d’identité. Leur usage en production est soumis à l’accord de
        l’administration de l’Identité Numérique. Accordez à chaque clé le strict nécessaire.
      </Callout>
      <H2 id="rotation">Rotation et révocation</H2>
      <P>
        Pour remplacer une clé, créez la nouvelle, déployez-la, puis révoquez l’ancienne. La révocation est immédiate et
        irréversible. La colonne « Dernier usage » aide à repérer les clés inutilisées.
      </P>
    </>
  )
}
