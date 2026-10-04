import { C, Code, H2, P, Table } from "../_components/prose"

export default function SdkCoreArticle() {
  return (
    <>
      <Code title="Terminal" code={`npm install @idn-ga/core`} />
      <H2 id="options">createIDNClient(options)</H2>
      <Table
        head={["Option", "Type", "Défaut", "Rôle"]}
        mono={[0, 1, 2]}
        rows={[
          ["clientId", "string", "—", "client_id (obligatoire)."],
          ["redirectUri", "string", "—", "URL de rappel déclarée (obligatoire)."],
          ["issuer", "string", "https://site.identite.ga", "Émetteur IDN."],
          ["discoveryUrl", "string", "{issuer}/api/auth/convex/.well-known/openid-configuration", "Document de découverte."],
          ["scopes", "string[]", '["openid", "profile", "email"]', "Scopes demandés."],
          ["acrValues", '("eidas1" | "eidas2" | "eidas3")[]', "—", "Niveau exigé à chaque connexion."],
          ["storage", '"localStorage" | "sessionStorage" | "memory" | adaptateur', '"localStorage"', "Persistance de la session (mémoire hors navigateur)."],
          ["refreshThreshold", "number (s)", "60", "Rafraîchit le jeton s’il expire dans moins de N secondes."],
        ]}
      />
      <H2 id="methodes">Méthodes</H2>
      <Table
        head={["Méthode", "Effet"]}
        mono={[0]}
        rows={[
          ["signIn(opts?)", "Redirige vers l’autorisation (PKCE S256). opts : scopes, acrValues, extraParams."],
          ["handleCallback(url?)", "Échange le code, vérifie l’ID token, lit UserInfo, enregistre et renvoie la session."],
          ["getSession() / getUser()", "Session ou usager courant, ou null."],
          ["isAuthenticated()", "Présence d’une session (synchrone)."],
          ["getAccessToken()", "Jeton d’accès, rafraîchi automatiquement si besoin."],
          ["refreshToken()", "Force le rafraîchissement (requiert offline_access)."],
          ["getVerificationStatus()", "État actuel de vérification : loa, acr, verified, verification."],
          ["requestIdentityVerification(2 | 3)", "Relance la connexion en exigeant ce niveau."],
          ["revoke()", "Révoque les jetons d’accès et de rafraîchissement."],
          ["signOut(opts?)", "Vide la session ; redirectTo, localOnly."],
          ["on(event, cb) / off(event, cb)", "Événements : signIn, signOut, session:expired, token:refreshed, error."],
        ]}
      />
      <H2 id="utilitaires">Utilitaires exportés</H2>
      <P>
        <C>fetchDiscovery</C>, <C>buildDiscoveryUrl</C>, <C>clearDiscoveryCache</C>, <C>generateVerifier</C>,{" "}
        <C>challengeS256</C>, <C>randomString</C>, <C>verifyIdToken</C>, <C>clearJwksCache</C>, <C>resolveStorage</C>{" "}
        ainsi que les types <C>IDNUser</C>, <C>IDNSession</C>, <C>IDNTokens</C>, <C>IDNVerificationStatus</C>,{" "}
        <C>IDNClientConfig</C> (aussi via <C>@idn-ga/core/types</C>).
      </P>
      <Code
        title="Type IDNUser (extrait)"
        code={`interface IDNUser {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  given_name?: string
  family_name?: string
  birthdate?: string
  nationality?: string
  profile_type?: "citizen" | "resident" | "visitor" | "developer"
  acr?: "eidas1" | "eidas2" | "eidas3"
  loa?: 1 | 2 | 3
}`}
      />
    </>
  )
}
