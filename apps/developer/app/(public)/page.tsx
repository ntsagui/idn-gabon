import Link from "next/link"

import { LoABadge } from "@repo/ui/components/loa-badge"

import { CodeBlock } from "../_components/code-block"
import { Icon } from "../_components/icons"
import { IdnButtonPreview, DEFAULT_BUTTON } from "../_components/idn-button"
import { RedirectIfSignedIn } from "./redirect-if-signed-in"

const QUICKSTART = `import { IDNProvider, IDNSignInButton } from "@idn-ga/react"

export function App() {
  return (
    <IDNProvider
      clientId={process.env.NEXT_PUBLIC_IDN_CLIENT_ID!}
      redirectUri="https://votre-service.ga/callback"
    >
      <IDNSignInButton className="idn-btn" />
    </IDNProvider>
  )
}`

const STEPS = [
  {
    title: "Enregistrez votre application",
    body: "Nom, logo, URL de redirection, scopes et niveau de garantie exigé. Vous obtenez un client_id et un secret, en sandbox, immédiatement.",
    icon: "apps" as const,
  },
  {
    title: "Intégrez le SDK",
    body: "OpenID Connect standard, PKCE obligatoire. @idn-ga/react, @idn-ga/core ou le plugin Better Auth : quelques lignes suffisent.",
    icon: "code" as const,
  },
  {
    title: "Passez en production",
    body: "Testez avec vos comptes de test, puis demandez la mise en production. L'administration valide l'application avant son ouverture au public.",
    icon: "shield" as const,
  },
]

const SCOPES = [
  ["openid", "Identifiant stable de l'usager (sub). Obligatoire."],
  ["profile", "Nom, type de profil et niveau de garantie (loa, acr)."],
  ["email", "Adresse e-mail et sa vérification."],
  ["idn:civil_status", "État civil : date et lieu de naissance, sexe, nationalité, NIP."],
  ["offline_access", "Jeton de rafraîchissement pour les sessions longues."],
]

export default function HomePage() {
  return (
    <>
      <RedirectIfSignedIn />
      <section className="border-b border-idn-border bg-idn-surface">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 py-14 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              Portail des développeurs partenaires
            </p>
            <h1 className="mt-3 max-w-[18ch] text-[40px] font-semibold leading-[44px] tracking-[-0.02em] text-idn-ink">
              Proposez « Se connecter avec IDN » dans votre service
            </h1>
            <p className="mt-4 max-w-[56ch] text-[15px] leading-6 text-idn-ink-2">
              L&apos;Identité Numérique du Gabon permet aux usagers de s&apos;identifier chez vous
              avec une identité vérifiée par l&apos;État, au niveau de garantie que votre démarche
              exige. Enregistrez votre application, intégrez le SDK, puis demandez la mise en
              production.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-idn-green px-5 text-[15px] font-medium text-white hover:bg-idn-green-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
              >
                Créer un compte développeur
                <Icon name="arrowRight" size={16} />
              </Link>
              <Link
                href="/docs/demarrage-rapide"
                className="inline-flex h-11 items-center rounded-[10px] border border-idn-border bg-idn-surface px-5 text-[15px] font-medium text-idn-ink hover:bg-idn-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-idn-green"
              >
                Démarrage rapide
              </Link>
            </div>
          </div>
          <div className="rounded-[20px] border border-idn-border bg-idn-bg p-6">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              Le bouton, selon la charte
            </p>
            <div className="mt-4 grid gap-3">
              <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-idn-border bg-white p-5">
                <IdnButtonPreview config={DEFAULT_BUTTON} />
                <IdnButtonPreview config={{ ...DEFAULT_BUTTON, variant: "contour" }} />
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-idn-border bg-[#F4F3EE] p-5">
                <IdnButtonPreview config={{ ...DEFAULT_BUTTON, variant: "sombre", label: "continue" }} />
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-5 text-idn-muted">
              Trois variantes, trois libellés validés, 36 px de hauteur minimum. Symbole intact,
              sans ombre ni dégradé.{" "}
              <Link href="/docs/bouton-idn" className="font-medium text-idn-green underline-offset-2 hover:underline dark:text-idn-green-on-dark">
                Lire le guide du bouton
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="etapes" className="mx-auto w-full max-w-[1200px] px-6 py-14">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
          Parcours d&apos;intégration
        </p>
        <h2 id="etapes" className="mt-2 text-[22px] font-semibold leading-7 text-idn-ink">
          Trois étapes, de la sandbox à la production
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-[14px] border border-idn-border bg-idn-surface p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-[10px] bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark">
                  <Icon name={step.icon} size={18} />
                </span>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
                  Étape {index + 1}
                </span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold leading-6 text-idn-ink">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-6 text-idn-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-idn-border bg-idn-surface">
        <div className="mx-auto grid w-full max-w-[1200px] gap-10 px-6 py-14 lg:grid-cols-2">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              Données transmises
            </p>
            <h2 className="mt-2 text-[22px] font-semibold leading-7 text-idn-ink">
              Des scopes explicites, consentis par l&apos;usager
            </h2>
            <p className="mt-2 text-sm leading-6 text-idn-muted">
              Votre application ne reçoit que les données des scopes déclarés et acceptés par
              l&apos;usager sur l&apos;écran de consentement.
            </p>
            <dl className="mt-5 divide-y divide-idn-border-soft rounded-[14px] border border-idn-border">
              {SCOPES.map(([scope, description]) => (
                <div key={scope} className="grid gap-1 px-4 py-3 sm:grid-cols-[160px_1fr] sm:gap-4">
                  <dt className="font-mono text-[13px] text-idn-ink">{scope}</dt>
                  <dd className="text-[13px] leading-5 text-idn-muted">{description}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/docs/scopes"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-idn-green underline-offset-2 hover:underline dark:text-idn-green-on-dark"
            >
              Référence complète des scopes <Icon name="arrowRight" size={14} />
            </Link>
          </div>
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
              Niveaux de garantie
            </p>
            <h2 className="mt-2 text-[22px] font-semibold leading-7 text-idn-ink">
              Exigez le niveau adapté à votre démarche
            </h2>
            <p className="mt-2 text-sm leading-6 text-idn-muted">
              Chaque session porte un niveau aligné sur eIDAS, transmis dans les claims{" "}
              <code className="font-mono text-[13px]">acr</code> et{" "}
              <code className="font-mono text-[13px]">loa</code>. Si l&apos;usager n&apos;a pas le
              niveau exigé, IDN lui propose de vérifier son identité.
            </p>
            <ul className="mt-5 space-y-3">
              {(
                [
                  [1, "eidas1", "Compte avec e-mail vérifié. Services d'information."],
                  [2, "eidas2", "Identité vérifiée sur pièce et selfie. Démarches courantes."],
                  [3, "eidas3", "Identité vérifiée en présence d'un agent. Actes sensibles."],
                ] as const
              ).map(([level, acr, text]) => (
                <li key={acr} className="flex items-start gap-3 rounded-[14px] border border-idn-border p-4">
                  <LoABadge level={level} />
                  <div className="min-w-0">
                    <p className="font-mono text-[13px] text-idn-ink">acr = {acr}</p>
                    <p className="text-[13px] leading-5 text-idn-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1200px] gap-8 px-6 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
            SDK officiel
          </p>
          <h2 className="mt-2 text-[22px] font-semibold leading-7 text-idn-ink">
            Une intégration standard, sans dépendance propriétaire
          </h2>
          <p className="mt-2 text-sm leading-6 text-idn-muted">
            IDN est un fournisseur OpenID Connect. Les paquets{" "}
            <code className="font-mono text-[13px]">@idn-ga/react</code>,{" "}
            <code className="font-mono text-[13px]">@idn-ga/core</code> et{" "}
            <code className="font-mono text-[13px]">@idn-ga/better-auth</code>{" "}
            gèrent PKCE, la
            vérification de l&apos;ID token et le rafraîchissement des jetons.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center rounded-[10px] border border-idn-border bg-idn-surface px-4 text-sm font-medium text-idn-ink hover:bg-idn-surface-2"
            >
              Parcourir la documentation
            </Link>
            <Link
              href="/docs/webhooks"
              className="inline-flex h-10 items-center rounded-[10px] px-2 text-sm font-medium text-idn-green underline-offset-2 hover:underline dark:text-idn-green-on-dark"
            >
              Guide des webhooks
            </Link>
          </div>
        </div>
        <CodeBlock title="app.tsx" code={QUICKSTART} />
      </section>
    </>
  )
}
