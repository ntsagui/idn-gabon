import { ButtonGenerator } from "../_components/button-generator"
import { A, C, H2, P, Table, UL } from "../_components/prose"

export default function ButtonArticle() {
  return (
    <>
      <P>
        Le bouton est la porte d’entrée de l’Identité Numérique chez vous. Ses valeurs sont celles du kit partenaire de
        la charte graphique : ne les modifiez pas.
      </P>
      <H2 id="generateur">Générateur</H2>
      <P>
        Choisissez l’apparence et le niveau exigé ; copiez le CSS et le composant. <C>IDNSignInButton</C> étant sans
        style, c’est la classe <C>.idn-btn</C> qui porte la charte.
      </P>
      <ButtonGenerator />
      <H2 id="libelles">Libellés validés</H2>
      <Table
        head={["Français", "English", "Usage"]}
        mono={[]}
        rows={[
          ["Se connecter avec IDN", "Sign in with IDN", "Connexion à un compte existant."],
          ["Continuer avec IDN", "Continue with IDN", "Parcours mixte (connexion ou inscription)."],
          ["S’inscrire avec IDN", "Sign up with IDN", "Création de compte chez vous."],
        ]}
      />
      <H2 id="variantes">Variantes et tailles</H2>
      <UL>
        <li>Plein : fond vert #0E7C3A, texte blanc, symbole inversé (carré blanc, traits verts).</li>
        <li>Contour : fond blanc, bordure verte, texte encre #16170F.</li>
        <li>Sombre : fond encre #16170F, texte blanc — jamais sur fond sombre.</li>
        <li>Tailles S 36 px, M 44 px (recommandée sur mobile), L 52 px. Rayon 10 px ou pilule.</li>
      </UL>
      <H2 id="regles">À faire</H2>
      <UL>
        <li>Garder le symbole IDN intact, à gauche du libellé.</li>
        <li>Utiliser l’un des trois libellés validés, en français ou en anglais.</li>
        <li>Laisser autour du bouton une zone de protection au moins égale à la hauteur du symbole.</li>
        <li>Respecter 36 px de hauteur minimum ; 44 px sur mobile.</li>
        <li>Placer le bouton au même niveau que les autres moyens de connexion.</li>
      </UL>
      <H2 id="interdits">À éviter</H2>
      <UL>
        <li>Recolorer, déformer, faire pivoter ou remplacer le symbole.</li>
        <li>Réduire le texte à « IDN » seul ou y ajouter un autre message.</li>
        <li>Changer les couleurs des variantes, ajouter ombre, dégradé ou transparence.</li>
        <li>Descendre sous 36 px de haut ou empiéter sur la zone de protection.</li>
        <li>Poser la variante Sombre sur un fond sombre : préférez Plein ou Contour.</li>
      </UL>
      <P>
        Pour exiger un niveau de garantie au clic, le générateur ajoute <C>acrValues</C> : voir{" "}
        <A href="/docs/niveaux-de-garantie">Niveaux de garantie</A>.
      </P>
    </>
  )
}
