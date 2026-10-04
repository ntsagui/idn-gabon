import { A, C, H2, P, UL } from "../_components/prose"

export default function SecurityArticle() {
  return (
    <>
      <H2 id="pkce">PKCE obligatoire</H2>
      <P>
        IDN exige PKCE avec la méthode <C>S256</C> (la méthode <C>plain</C> est refusée). Les SDK le gèrent ; si vous
        intégrez à la main, générez un <C>code_verifier</C> par connexion et vérifiez <C>state</C> et <C>nonce</C>.
      </P>
      <H2 id="secrets">Secrets</H2>
      <UL>
        <li>Le <C>client_secret</C> et les clés API restent côté serveur : jamais dans une application web ou mobile.</li>
        <li>Stockez-les dans un gestionnaire de secrets ; ils ne sont affichés qu’une fois.</li>
        <li>En cas de fuite, générez un nouveau secret ou révoquez la clé depuis le portail : l’effet est immédiat.</li>
      </UL>
      <H2 id="jetons">Jetons</H2>
      <UL>
        <li>L’ID token est signé en RS256 ; vérifiez la signature (JWKS), <C>iss</C>, <C>aud</C>, <C>exp</C> et <C>nonce</C>.</li>
        <li>Côté API, validez le jeton d’accès en appelant UserInfo plutôt qu’en faisant confiance au navigateur.</li>
        <li>Les URL de redirection sont comparées exactement : déclarez-les toutes, sans joker.</li>
      </UL>
      <H2 id="niveau">Contrôle du niveau côté serveur</H2>
      <P>
        Avant une démarche sensible, contrôlez <C>loa</C> ou <C>acr</C> côté serveur, à partir de UserInfo. Les
        composants <C>RequireLoA</C> et <C>SignedIn</C> ne protègent que l’interface. Voir{" "}
        <A href="/docs/niveaux-de-garantie">Niveaux de garantie</A>.
      </P>
      <H2 id="donnees">Données personnelles</H2>
      <P>
        Demandez le minimum de scopes ; l’usager voit chaque demande et peut retirer son consentement à tout moment
        depuis son espace Identité Numérique, ce qui interrompt aussi les webhooks qui en dépendent.
      </P>
    </>
  )
}
