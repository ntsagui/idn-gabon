import { C, Code, H2, H3, P, Table } from "../_components/prose"

export default function SdkReactArticle() {
  return (
    <>
      <Code title="Terminal" code={`npm install @idn-ga/react`} />
      <H2 id="composants">Composants</H2>
      <H3>IDNProvider</H3>
      <P>
        Crée le client et partage la session. Accepte toutes les options de <C>createIDNClient</C> (voir @idn-ga/core),
        plus :
      </P>
      <Table
        head={["Prop", "Type", "Défaut", "Rôle"]}
        mono={[0, 1, 2]}
        rows={[
          ["clientId", "string", "—", "client_id de l’application (obligatoire)."],
          ["redirectUri", "string", "—", "URL de rappel déclarée (obligatoire)."],
          ["autoHydrate", "boolean", "true", "Charge la session existante au montage."],
          ["children", "ReactNode", "—", "Votre application."],
        ]}
      />
      <H3>IDNSignInButton</H3>
      <P>Bouton sans style qui lance la connexion. Désactivé pendant le chargement de la session.</P>
      <Table
        head={["Prop", "Type", "Rôle"]}
        mono={[0, 1]}
        rows={[
          ["children", "ReactNode", "Contenu ; « Se connecter avec IDN » par défaut."],
          ["className, style", "string, CSSProperties", "Apparence (voir le guide du bouton)."],
          ["scopes", "string[]", "Remplace les scopes pour ce clic."],
          ["acrValues", "string[]", "Niveau exigé pour ce clic (acr_values)."],
        ]}
      />
      <H3>IDNCallback</H3>
      <Table
        head={["Prop", "Type", "Rôle"]}
        mono={[0, 1]}
        rows={[
          ["onSuccess", "(sub: string) => void", "Appelée après l’échange du code."],
          ["onError", "(error: Error) => void", "Appelée en cas d’échec ; le message d’erreur est aussi rendu."],
          ["loading", "ReactNode", "Rendu pendant le traitement."],
          ["done", "ReactNode", "Rendu après succès."],
        ]}
      />
      <H3>SignedIn, SignedOut, RequireLoA</H3>
      <P>
        Rendu conditionnel. <C>SignedIn</C> et <C>SignedOut</C> acceptent <C>fallback</C> ; <C>RequireLoA</C> prend{" "}
        <C>{"level={1 | 2 | 3}"}</C> et compare au claim <C>loa</C> de la session.
      </P>
      <H2 id="hooks">Hooks</H2>
      <Table
        head={["Hook", "Renvoie"]}
        mono={[0, 1]}
        rows={[
          ["useIDN()", "{ isAuthenticated, isLoading, error, signIn(opts?), signOut(opts?) }"],
          ["useUser()", "{ user, isLoading, error }"],
          ["useSession()", "{ session, accessToken, isLoading }"],
          ["useAccessToken()", "string | null"],
          ["useLoA()", "{ loa, acr, hasMinimum(level) }"],
          ["useIDNClient()", "le client @idn-ga/core sous-jacent"],
        ]}
      />
      <Code
        title="Exemple"
        code={`const { signIn, signOut, isAuthenticated } = useIDN()
const { user } = useUser()
const token = useAccessToken()

await fetch("/api/demarches", { headers: { Authorization: \`Bearer \${token}\` } })`}
      />
    </>
  )
}
