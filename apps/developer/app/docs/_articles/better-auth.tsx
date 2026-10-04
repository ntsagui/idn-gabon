import { A, C, Callout, Code, H2, P, Table } from "../_components/prose"

export default function BetterAuthArticle() {
  return (
    <>
      <P>
        <C>@idn-ga/better-auth</C> fournit la fonction <C>idn()</C>, une configuration prête pour le plugin{" "}
        <C>genericOAuth</C> de Better Auth (comme <C>auth0()</C> ou <C>keycloak()</C>). Le secret reste sur votre
        serveur.
      </P>

      <H2 id="installation">Installation</H2>
      <Code title="Terminal" code={`npm install better-auth @idn-ga/better-auth`} />

      <H2 id="serveur">Serveur</H2>
      <Code
        title="auth.ts"
        code={`import { betterAuth } from "better-auth"
import { genericOAuth } from "better-auth/plugins"
import { idn } from "@idn-ga/better-auth"

export const auth = betterAuth({
  plugins: [
    genericOAuth({
      config: [
        idn({
          clientId: process.env.IDN_CLIENT_ID!,
          clientSecret: process.env.IDN_CLIENT_SECRET!,
          scopes: ["openid", "profile", "email"],
        }),
      ],
    }),
  ],
})`}
      />
      <P>
        Déclarez comme URL de redirection de l’application la route de rappel de Better Auth :{" "}
        <C>{"{votre domaine}"}/api/auth/oauth2/callback/idn</C>.
      </P>

      <H2 id="client">Client</H2>
      <Code
        title="auth-client.ts"
        code={`import { createAuthClient } from "better-auth/react"
import { genericOAuthClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [genericOAuthClient()],
})

// Au clic sur le bouton « Se connecter avec IDN »
await authClient.signIn.oauth2({ providerId: "idn", callbackURL: "/" })`}
      />

      <H2 id="options">Options de idn()</H2>
      <Table
        head={["Option", "Type", "Défaut", "Rôle"]}
        mono={[0, 1, 2]}
        rows={[
          ["clientId", "string", "—", "client_id de l’application (obligatoire)."],
          ["clientSecret", "string", "—", "client_secret, côté serveur uniquement (obligatoire)."],
          ["issuer", "string", "https://site.identite.ga", "Émetteur IDN."],
          ["discoveryUrl", "string", "{issuer}/api/auth/convex/.well-known/openid-configuration", "Document de découverte."],
          ["scopes", "string[]", '["openid", "profile", "email"]', "Scopes demandés."],
          ["acrValues", '("eidas1" | "eidas2" | "eidas3")[]', "—", "Niveau exigé, envoyé en acr_values."],
          ["providerId", "string", '"idn"', "Identifiant du fournisseur dans Better Auth."],
          ["mapProfileToUser", "(profile) => object", "voir ci-dessous", "Projection du profil IDN vers votre utilisateur."],
        ]}
      />
      <P>
        Le profil est toujours lu sur UserInfo (les claims d’état civil n’y figurent que là, pas dans l’ID token). La
        projection par défaut renseigne <C>email</C>, <C>emailVerified</C>, <C>name</C>, <C>image</C> et des champs{" "}
        <C>idnSub</C>, <C>idnLoA</C>, <C>idnAcr</C>, <C>idnProfileType</C>, <C>idnNationality</C>, <C>idnBirthdate</C>,{" "}
        <C>idnNip</C>, <C>idnEnvironment</C>, à déclarer dans votre schéma Better Auth si vous les conservez.
      </P>
      <Callout tone="attention" title="Données personnelles">
        Ne stockez que ce dont votre service a besoin. <C>idnNip</C> et la date de naissance ne sont renvoyés qu’avec le
        scope <C>idn:civil_status</C> : voir <A href="/docs/scopes">Scopes et claims</A>.
      </Callout>
    </>
  )
}
