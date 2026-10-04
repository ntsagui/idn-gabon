import { A, C, Callout, Code, H2, OL, P } from "../_components/prose"

export default function QuickstartArticle() {
  return (
    <>
      <H2 id="prerequis">Prérequis</H2>
      <OL>
        <li>
          Un compte développeur et une application enregistrée : voir <A href="/docs/enregistrer-une-application">Enregistrer une application</A>.
          Notez son <C>client_id</C> sandbox.
        </li>
        <li>
          Une URL de redirection déclarée, par exemple <C>http://localhost:3000/callback</C> en sandbox.
        </li>
        <li>Un compte de test ajouté à l’application (ou votre propre compte, propriétaire de l’application).</li>
      </OL>

      <H2 id="installation">1. Installer le SDK</H2>
      <Code title="Terminal" code={`npm install @idn-ga/react`} />
      <P>
        <C>@idn-ga/react</C> s’appuie sur <C>@idn-ga/core</C> : flux Authorization Code avec PKCE (S256), découverte
        automatique, vérification de l’ID token (signature, <C>iss</C>, <C>aud</C>, <C>nonce</C>) et rafraîchissement
        des jetons.
      </P>

      <H2 id="provider">2. Monter le fournisseur</H2>
      <Code
        title="app/providers.tsx"
        code={`"use client"

import { IDNProvider } from "@idn-ga/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <IDNProvider
      clientId={process.env.NEXT_PUBLIC_IDN_CLIENT_ID!}
      redirectUri="http://localhost:3000/callback"
      scopes={["openid", "profile", "email"]}
    >
      {children}
    </IDNProvider>
  )
}`}
      />
      <P>
        Sans option <C>issuer</C>, le SDK vise la production (<C>https://site.identite.ga</C>). Pour un autre
        environnement, passez <C>issuer</C> : la découverte est lue sur{" "}
        <C>{"{issuer}"}/api/auth/convex/.well-known/openid-configuration</C>.
      </P>

      <H2 id="bouton">3. Ajouter le bouton</H2>
      <Code
        title="components/bouton-idn.tsx"
        code={`"use client"

import { IDNSignInButton, SignedIn, SignedOut, useIDN, useUser } from "@idn-ga/react"

export function Connexion() {
  const { signOut } = useIDN()
  const { user } = useUser()
  return (
    <>
      <SignedOut>
        <IDNSignInButton className="idn-btn" />
      </SignedOut>
      <SignedIn>
        <p>Bonjour {user?.name}</p>
        <button type="button" onClick={() => signOut()}>Se déconnecter</button>
      </SignedIn>
    </>
  )
}`}
      />
      <P>
        <C>IDNSignInButton</C> est sans style : appliquez le CSS de la charte fourni par le{" "}
        <A href="/docs/bouton-idn">guide du bouton</A>. Son libellé par défaut est « Se connecter avec IDN ».
      </P>

      <H2 id="callback">4. Traiter le retour</H2>
      <Code
        title="app/callback/page.tsx"
        code={`"use client"

import { useRouter } from "next/navigation"
import { IDNCallback } from "@idn-ga/react"

export default function Callback() {
  const router = useRouter()
  return (
    <IDNCallback
      onSuccess={() => router.push("/")}
      onError={(error) => console.error(error)}
      loading={<p>Connexion en cours…</p>}
    />
  )
}`}
      />
      <P>
        <C>IDNCallback</C> échange le code, vérifie l’ID token, lit UserInfo et enregistre la session (par défaut dans{" "}
        <C>localStorage</C>).
      </P>

      <Callout tone="attention" title="Le contrôle d’accès se fait côté serveur">
        Les composants React masquent l’interface ; ils ne protègent pas vos données. Votre API doit valider le jeton
        d’accès (par exemple en appelant UserInfo) et vérifier le niveau de garantie. Voir{" "}
        <A href="/docs/securite">Bonnes pratiques de sécurité</A>.
      </Callout>
    </>
  )
}
