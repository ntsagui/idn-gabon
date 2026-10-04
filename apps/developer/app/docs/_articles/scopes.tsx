import { A, C, Callout, H2, P, Table } from "../_components/prose"

export default function ScopesArticle() {
  return (
    <>
      <P>
        IDN accepte uniquement les scopes ci-dessous. Tout autre scope est refusé par le point d’autorisation (
        <C>invalid_scope</C>). Votre application doit les déclarer dans le portail ; l’usager les voit sur l’écran de
        consentement.
      </P>
      <H2 id="liste">Scopes acceptés</H2>
      <Table
        head={["Scope", "Claims UserInfo", "Usage"]}
        mono={[0, 1]}
        rows={[
          ["openid", "sub", "Obligatoire. Identifiant stable et opaque de l’usager pour votre application."],
          ["profile", "name, given_name, family_name, profile_type, loa, acr", "Identité affichable et niveau de garantie de la session."],
          ["email", "email, email_verified", "Contact de l’usager."],
          ["offline_access", "—", "Délivre un jeton de rafraîchissement."],
          ["idn:civil_status", "birthdate, birth_place, gender, nationality, nip", "État civil, pour les démarches qui l’exigent."],
          ["idn:iboite.read", "—", "API iBoîte : consultation du compte, des courriers, colis et messages."],
          ["idn:iboite.manage", "—", "API iBoîte : mise à jour des éléments."],
          ["idn:iboite.send", "—", "API iBoîte : envoi (messages, pièces jointes)."],
        ]}
      />
      <Callout tone="attention" title="Le NIP n’est pas un scope">
        Il n’existe pas de scope <C>nip</C>. Le NIP est un claim renvoyé avec <C>idn:civil_status</C>, lorsque
        l’identité de l’usager porte un NIP.
      </Callout>
      <H2 id="claims">Claims toujours présents</H2>
      <P>
        UserInfo renvoie aussi <C>env</C> (<C>sandbox</C> ou <C>production</C>). Les claims de profil et d’état civil
        proviennent de l’identité vérifiée de l’usager : ils peuvent être absents si l’usager n’a pas encore fait
        vérifier son identité.
      </P>
      <H2 id="loa">Niveau de garantie</H2>
      <P>
        <C>loa</C> (1, 2 ou 3) et <C>acr</C> (<C>eidas1</C>, <C>eidas2</C>, <C>eidas3</C>) ne sont renvoyés qu’avec le
        scope <C>profile</C>. Voir <A href="/docs/niveaux-de-garantie">Niveaux de garantie</A>.
      </P>
    </>
  )
}
