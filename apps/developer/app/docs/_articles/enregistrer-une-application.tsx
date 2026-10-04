import { A, C, Callout, H2, OL, P, Table, UL } from "../_components/prose"

export default function RegisterAppArticle() {
  return (
    <>
      <H2 id="compte">1. Créer un compte développeur</H2>
      <P>
        Le portail utilise votre compte Identité Numérique. <A href="/sign-up">Créez un compte</A>, vérifiez votre
        adresse avec le code reçu par e-mail : le rôle développeur est activé à la première connexion.
      </P>

      <H2 id="application">2. Enregistrer l’application</H2>
      <P>L’assistant <A href="/applications/new">Nouvelle application</A> demande :</P>
      <Table
        head={["Champ", "Rôle"]}
        mono={[]}
        rows={[
          ["Nom et logo", "Présentés à l’usager sur l’écran de consentement. Logo PNG, JPEG ou WebP, 512 Ko au plus."],
          ["URL de redirection", "Correspondance exacte avec redirect_uri. http://localhost accepté en sandbox ; https obligatoire en production."],
          ["Scopes", "Données demandées à l’usager. Voir Scopes et claims."],
          ["Niveau de garantie exigé", "Niveau minimal de la session (eidas1, eidas2, eidas3)."],
          ["Environnement", "Sandbox immédiate ; demande de production possible si votre compte est validé."],
        ]}
      />
      <P>
        Vous obtenez un <C>client_id</C> (par exemple <C>mairie-libreville_sbx_…</C>) et un <C>client_secret</C>{" "}
        (<C>idn_sk_test_…</C>). Le secret est affiché une seule fois : IDN n’en conserve qu’une empreinte. En cas de
        perte, générez-en un nouveau depuis l’onglet « Identifiants et clés » ; l’ancien cesse aussitôt de fonctionner.
      </P>

      <H2 id="sandbox">3. Tester en sandbox</H2>
      <UL>
        <li>Seuls le propriétaire de l’application et ses comptes de test (25 au plus) peuvent s’y connecter.</li>
        <li>Les autres usagers sont refusés (<C>sandbox_access_denied</C>).</li>
        <li>
          Les claims renvoyés contiennent <C>env</C> : <C>sandbox</C> ou <C>production</C>.
        </li>
      </UL>

      <H2 id="production">4. Passer en production</H2>
      <OL>
        <li>Votre compte développeur doit être validé par un super-administrateur.</li>
        <li>Toutes les URL de redirection doivent être en https.</li>
        <li>
          La demande crée un second <C>client_id</C> (<C>…_prd_…</C>) et un secret <C>idn_sk_live_…</C>, inactifs jusqu’à la
          validation par l’administration.
        </li>
      </OL>
      <Callout title="Deux enregistrements, une application">
        Sandbox et production ont chacun leur <C>client_id</C>, leurs secrets, leurs URL de redirection, leurs clés API
        et leurs webhooks. Le portail les présente comme une seule application, avec un sélecteur d’environnement.
        Supprimer l’application supprime les deux.
      </Callout>
    </>
  )
}
