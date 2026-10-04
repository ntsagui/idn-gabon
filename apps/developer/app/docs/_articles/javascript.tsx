import { A, C, Code, H2, P } from "../_components/prose"

export default function JavascriptArticle() {
  return (
    <>
      <P>
        <C>@idn-ga/core</C> fonctionne sans framework, dans le navigateur. Il gère PKCE, l’état et le nonce, vérifie
        l’ID token et persiste la session. Référence complète : <A href="/docs/sdk-core">@idn-ga/core</A>.
      </P>
      <H2 id="client">Créer le client</H2>
      <Code
        title="idn.js"
        code={`import { createIDNClient } from "@idn-ga/core"

export const idn = createIDNClient({
  clientId: "votre-app_sbx_xxxxxxxx",
  redirectUri: "https://votre-service.ga/callback",
  scopes: ["openid", "profile", "email"],
})`}
      />
      <H2 id="connexion">Connexion</H2>
      <Code
        title="login.js"
        code={`document.querySelector(".idn-btn").addEventListener("click", () => {
  idn.signIn() // redirige vers IDN
})`}
      />
      <H2 id="rappel">Page de rappel</H2>
      <Code
        title="callback.js"
        code={`const session = await idn.handleCallback()
console.log(session.user.sub, session.user.loa)
window.location.replace("/")`}
      />
      <H2 id="session">Session et déconnexion</H2>
      <Code
        title="app.js"
        code={`if (idn.isAuthenticated()) {
  const user = await idn.getUser()
  const token = await idn.getAccessToken() // rafraîchi si besoin
}

idn.on("session:expired", () => idn.signIn())

await idn.signOut({ redirectTo: "https://votre-service.ga/" })`}
      />
      <P>
        <C>signOut()</C> vide la session locale puis redirige vers le point de fin de session s’il est annoncé ;{" "}
        <C>{"signOut({ localOnly: true })"}</C> s’arrête à la session locale.
      </P>
    </>
  )
}
