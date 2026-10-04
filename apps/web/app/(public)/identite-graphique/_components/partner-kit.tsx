"use client"

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react"
import {
  ArrowLeftRight,
  Check,
  CircleCheck,
  Copy,
  Info,
  Landmark,
  Lock,
  RotateCcw,
  ShieldCheck,
  Video,
  X,
} from "lucide-react"

import { IdnMark } from "@repo/ui/components/idn-mark"

import { LottiePlayer } from "./lottie-player"
import styles from "./partner-kit.module.css"

/* ---------- Configuration du bouton ---------- */

type Variant = "plein" | "contour" | "sombre"
type Size = "s" | "m" | "l"
type Shape = "arrondi" | "pilule"
type Width = "auto" | "full"
type LabelKey = "signin" | "continue" | "signup"
type Lang = "fr" | "en"
type Level = "none" | "2" | "3"

interface ButtonConfig {
  variant: Variant
  size: Size
  shape: Shape
  width: Width
  label: LabelKey
  lang: Lang
  level: Level
}

const DEFAULT_CONFIG: ButtonConfig = {
  variant: "plein",
  size: "m",
  shape: "arrondi",
  width: "auto",
  label: "signin",
  lang: "fr",
  level: "none",
}

const LABELS: Record<LabelKey, Record<Lang, string>> = {
  signin: { fr: "Se connecter avec IDN", en: "Sign in with IDN" },
  continue: { fr: "Continuer avec IDN", en: "Continue with IDN" },
  signup: { fr: "S’inscrire avec IDN", en: "Sign up with IDN" },
}

// Valeurs reprises à l'identique dans partner-kit.module.css (.btn).
const VARIANTS: Record<
  Variant,
  {
    bg: string
    fg: string
    border: string
    hoverBg: string
    hoverBorder: string
    markFill: string
    markStroke: string
  }
> = {
  plein: {
    bg: "#0E7C3A",
    fg: "#FFFFFF",
    border: "#0E7C3A",
    hoverBg: "#0A5C2C",
    hoverBorder: "#0A5C2C",
    markFill: "#FFFFFF",
    markStroke: "#0E7C3A",
  },
  contour: {
    bg: "#FFFFFF",
    fg: "#16170F",
    border: "#0E7C3A",
    hoverBg: "#E6F2EA",
    hoverBorder: "#0E7C3A",
    markFill: "#0E7C3A",
    markStroke: "#FFFFFF",
  },
  sombre: {
    bg: "#16170F",
    fg: "#FFFFFF",
    border: "#16170F",
    hoverBg: "#3A3D2E",
    hoverBorder: "#3A3D2E",
    markFill: "#0E7C3A",
    markStroke: "#FFFFFF",
  },
}

const SIZES: Record<
  Size,
  { height: number; padX: number; gap: number; font: number; mark: number }
> = {
  s: { height: 36, padX: 14, gap: 8, font: 14, mark: 18 },
  m: { height: 44, padX: 18, gap: 10, font: 15, mark: 20 },
  l: { height: 52, padX: 22, gap: 12, font: 16, mark: 24 },
}

const LEVEL_ACR: Record<Level, "eidas2" | "eidas3" | null> = {
  none: null,
  "2": "eidas2",
  "3": "eidas3",
}

// Scopes réellement acceptés par le fournisseur (allowlist oidcProvider) :
// le NIP est un claim de /userinfo, pas un scope.
const SCOPES = ["openid", "profile", "email"]

// Tracés de packages/ui/src/components/idn-mark.tsx.
const MARK_PATHS = [
  "M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4",
  "M14 13.12c0 2.38 0 6.38-1 8.88",
  "M17.29 21.02c.12-.6.43-2.3.5-3.02",
  "M2 12a10 10 0 0 1 18-6",
  "M2 16h.01",
  "M21.8 16c.2-2 .131-5.354 0-6",
  "M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2",
  "M8.65 22c.21-.66.45-1.32.57-2",
  "M9 6.8a6 6 0 0 1 9 5.2v2",
]

/* ---------- Génération du code ---------- */

const markSvg = (cfg: ButtonConfig, jsx: boolean, indent: string) => {
  const v = VARIANTS[cfg.variant]
  const s = SIZES[cfg.size].mark
  const attr = jsx
    ? { sw: "strokeWidth", lc: "strokeLinecap", lj: "strokeLinejoin" }
    : { sw: "stroke-width", lc: "stroke-linecap", lj: "stroke-linejoin" }
  return [
    `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">`,
    `  <rect x="2" y="2" width="28" height="28" rx="7" fill="${v.markFill}" />`,
    `  <g transform="translate(4 4)" stroke="${v.markStroke}" ${attr.sw}="1.8" ${attr.lc}="round" ${attr.lj}="round">`,
    ...MARK_PATHS.map((d) => `    <path d="${d}" />`),
    `  </g>`,
    `</svg>`,
  ].map((line) => indent + line)
}

const buttonCss = (cfg: ButtonConfig) => {
  const v = VARIANTS[cfg.variant]
  const s = SIZES[cfg.size]
  const radius = cfg.shape === "pilule" ? "9999px" : "10px"
  return [
    `/* Bouton « ${LABELS[cfg.label].fr} » — charte IDN */`,
    `.idn-btn {`,
    `  display: inline-flex;`,
    `  align-items: center;`,
    `  justify-content: center;`,
    `  gap: ${s.gap}px;`,
    cfg.width === "full" ? `  width: 100%;` : null,
    `  height: ${s.height}px;`,
    `  padding: 0 ${s.padX}px;`,
    `  border: 1px solid ${v.border};`,
    `  border-radius: ${radius};`,
    `  background: ${v.bg};`,
    `  color: ${v.fg};`,
    `  font-family: "IBM Plex Sans", system-ui, sans-serif;`,
    `  font-size: ${s.font}px;`,
    `  font-weight: 600;`,
    `  line-height: 1;`,
    `  white-space: nowrap;`,
    `  cursor: pointer;`,
    `}`,
    `.idn-btn:hover {`,
    `  background: ${v.hoverBg};`,
    `  border-color: ${v.hoverBorder};`,
    `}`,
    `.idn-btn:focus-visible {`,
    `  outline: 2px solid #2563AC;`,
    `  outline-offset: 2px;`,
    `}`,
    `.idn-btn:disabled {`,
    `  opacity: 0.6;`,
    `  cursor: progress;`,
    `}`,
    `.idn-btn svg {`,
    `  flex: none;`,
    `}`,
  ].filter((line): line is string => line !== null)
}

const htmlCode = (cfg: ButtonConfig) => {
  const acr = LEVEL_ACR[cfg.level]
  return [
    `<style>`,
    ...buttonCss(cfg).map((line) => `  ${line}`),
    `</style>`,
    ``,
    acr
      ? `<!-- Au clic : signIn({ acrValues: ["${acr}"] }) de @idn-ga/core (createIDNClient), ou ta route de connexion serveur. -->`
      : `<!-- Au clic : signIn() de @idn-ga/core (createIDNClient), ou ta route de connexion serveur. -->`,
    `<button type="button" class="idn-btn">`,
    ...markSvg(cfg, false, "  "),
    `  <span>${LABELS[cfg.label][cfg.lang]}</span>`,
    `</button>`,
  ].join("\n")
}

const reactCode = (cfg: ButtonConfig) => {
  const acr = LEVEL_ACR[cfg.level]
  const level = cfg.level === "none" ? null : cfg.level
  const lines: (string | null)[] = [
    `// 1. app/providers.tsx — monte <Providers> dans le layout racine`,
    `"use client"`,
    ``,
    `import { IDNProvider } from "@idn-ga/react"`,
    ``,
    `export function Providers({ children }: { children: React.ReactNode }) {`,
    `  return (`,
    `    <IDNProvider`,
    `      clientId={process.env.NEXT_PUBLIC_IDN_CLIENT_ID!}`,
    `      redirectUri="https://ton-service.ga/callback"`,
    `      scopes={${JSON.stringify(SCOPES).replace(/,/g, ", ")}}`,
    `    >`,
    `      {children}`,
    `    </IDNProvider>`,
    `  )`,
    `}`,
    ``,
    `// 2. components/bouton-idn.tsx`,
    `//    IDNSignInButton est headless : l'apparence vient du CSS`,
    `//    de l'onglet « HTML + CSS » (classe .idn-btn).`,
    `"use client"`,
    ``,
    `import { IDNSignInButton } from "@idn-ga/react"`,
    `import "./bouton-idn.css"`,
    ``,
    `export function BoutonIDN() {`,
    `  return (`,
    acr ? `    // acrValues : niveau de garantie exigé, envoyé en acr_values` : null,
    acr
      ? `    <IDNSignInButton className="idn-btn" acrValues={["${acr}"]}>`
      : `    <IDNSignInButton className="idn-btn">`,
    ...markSvg(cfg, true, "      "),
    `      <span>${LABELS[cfg.label][cfg.lang]}</span>`,
    `    </IDNSignInButton>`,
    `  )`,
    `}`,
    ``,
    `// 3. app/callback/page.tsx — la route déclarée en redirectUri`,
    `"use client"`,
    ``,
    `import { useRouter } from "next/navigation"`,
    `import { IDNCallback } from "@idn-ga/react"`,
    ``,
    `export default function Callback() {`,
    `  const router = useRouter()`,
    `  return (`,
    `    <IDNCallback`,
    `      onSuccess={() => router.push("/")}`,
    `      loading={<p>Connexion en cours…</p>}`,
    `    />`,
    `  )`,
    `}`,
  ]
  if (level) {
    lines.push(
      ``,
      `// 4. La démarche n'est affichée que si la session atteint le niveau`,
      `//    (claim loa). Contrôle d'interface : revérifie-le côté serveur.`,
      `import { RequireLoA } from "@idn-ga/react"`,
      ``,
      `export function Demarche({ children }: { children: React.ReactNode }) {`,
      `  return (`,
      `    <RequireLoA level={${level}} fallback={<BoutonIDN />}>`,
      `      {children}`,
      `    </RequireLoA>`,
      `  )`,
      `}`,
    )
  }
  return lines.filter((line): line is string => line !== null).join("\n")
}

const betterAuthCode = (cfg: ButtonConfig) => {
  const acr = LEVEL_ACR[cfg.level]
  return [
    `// 1. auth.ts (serveur)`,
    `import { betterAuth } from "better-auth"`,
    `import { genericOAuth } from "better-auth/plugins"`,
    `import { idn } from "@idn-ga/better-auth"`,
    ``,
    `export const auth = betterAuth({`,
    `  plugins: [`,
    `    genericOAuth({`,
    `      config: [`,
    `        idn({`,
    `          clientId: process.env.IDN_CLIENT_ID!,`,
    `          clientSecret: process.env.IDN_CLIENT_SECRET!,`,
    `          scopes: ${JSON.stringify(SCOPES).replace(/,/g, ", ")},`,
    acr
      ? `          acrValues: ["${acr}"], // acr_values (Better Auth 1.6+)`
      : null,
    `        }),`,
    `      ],`,
    `    }),`,
    `  ],`,
    `})`,
    ``,
    `// 2. auth-client.ts`,
    `import { createAuthClient } from "better-auth/react"`,
    `import { genericOAuthClient } from "better-auth/client/plugins"`,
    ``,
    `export const authClient = createAuthClient({`,
    `  plugins: [genericOAuthClient()],`,
    `})`,
    ``,
    `// 3. components/bouton-idn.tsx — CSS de l'onglet « HTML + CSS »`,
    `"use client"`,
    ``,
    `import { authClient } from "@/lib/auth-client"`,
    `import "./bouton-idn.css"`,
    ``,
    `export function BoutonIDN() {`,
    `  return (`,
    `    <button`,
    `      type="button"`,
    `      className="idn-btn"`,
    `      onClick={() =>`,
    `        authClient.signIn.oauth2({ providerId: "idn", callbackURL: "/" })`,
    `      }`,
    `    >`,
    ...markSvg(cfg, true, "      "),
    `      <span>${LABELS[cfg.label][cfg.lang]}</span>`,
    `    </button>`,
    `  )`,
    `}`,
  ]
    .filter((line): line is string => line !== null)
    .join("\n")
}

/* ---------- Petits composants ---------- */

function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
  hint,
}: {
  legend: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (next: T) => void
  hint?: string
}) {
  const name = useId()
  const hintId = useId()
  return (
    <fieldset
      className={styles.fieldset}
      aria-describedby={hint ? hintId : undefined}
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.segmented}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </fieldset>
  )
}

function IdnButton({
  cfg,
  onClick,
}: {
  cfg: ButtonConfig
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={styles.btn}
      data-variant={cfg.variant}
      data-size={cfg.size}
      data-shape={cfg.shape}
      data-width={cfg.width}
      lang={cfg.lang}
      onClick={onClick}
    >
      <IdnMark
        size={SIZES[cfg.size].mark}
        aria-hidden="true"
        className={cfg.variant === "plein" ? styles.markInverse : undefined}
      />
      <span>{LABELS[cfg.label][cfg.lang]}</span>
    </button>
  )
}

/* ---------- Section 1 : générateur ---------- */

type CodeTab = "react" | "html" | "better-auth"

const CODE_TABS: readonly { id: CodeTab; label: string }[] = [
  { id: "react", label: "React (@idn-ga/react)" },
  { id: "html", label: "HTML + CSS" },
  { id: "better-auth", label: "Better Auth (@idn-ga/better-auth)" },
]

function CodeTabs({ cfg }: { cfg: ButtonConfig }) {
  const baseId = useId()
  const [active, setActive] = useState<CodeTab>("react")
  const [copyStatus, setCopyStatus] = useState("")
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const copyTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copyTimer.current), [])

  const codes: Record<CodeTab, string> = {
    react: reactCode(cfg),
    html: htmlCode(cfg),
    "better-auth": betterAuthCode(cfg),
  }

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const index = CODE_TABS.findIndex((tab) => tab.id === active)
    let next = index
    if (event.key === "ArrowRight") next = (index + 1) % CODE_TABS.length
    else if (event.key === "ArrowLeft")
      next = (index - 1 + CODE_TABS.length) % CODE_TABS.length
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = CODE_TABS.length - 1
    else return
    event.preventDefault()
    const target = CODE_TABS[next]
    if (!target) return
    setActive(target.id)
    tabRefs.current[next]?.focus()
  }

  const copy = async () => {
    window.clearTimeout(copyTimer.current)
    try {
      await navigator.clipboard.writeText(codes[active])
      setCopyStatus("Copié")
    } catch {
      setCopyStatus("Copie impossible : sélectionne le code manuellement")
    }
    copyTimer.current = window.setTimeout(() => setCopyStatus(""), 2000)
  }

  const activeLabel = CODE_TABS.find((tab) => tab.id === active)?.label ?? ""

  return (
    <div className={styles.codeBox}>
      <div className={styles.codeBar}>
        <div
          role="tablist"
          aria-label="Langage du code d'intégration"
          className={styles.tablist}
          onKeyDown={onTabKeyDown}
        >
          {CODE_TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              className={styles.tab}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => void copy()}
          aria-label={`Copier le code ${activeLabel}`}
        >
          {copyStatus === "Copié" ? (
            <Check size={14} aria-hidden />
          ) : (
            <Copy size={14} aria-hidden />
          )}
          {copyStatus === "Copié" ? "Copié" : "Copier"}
        </button>
        <span role="status" className={styles.srOnly}>
          {copyStatus}
        </span>
      </div>
      {CODE_TABS.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {/* Zone défilante atteignable au clavier (RGAA 7.3) */}
          <pre
            className={styles.pre}
            tabIndex={0}
            aria-label={`Code ${tab.label}`}
          >
            <code>{codes[tab.id]}</code>
          </pre>
        </div>
      ))}
      <p className={styles.codeNote}>
        Le SDK n’expose ni variante, ni taille, ni forme :{" "}
        <code className={styles.code}>IDNSignInButton</code> est headless
        (props <code className={styles.code}>className</code>,{" "}
        <code className={styles.code}>style</code>,{" "}
        <code className={styles.code}>scopes</code>,{" "}
        <code className={styles.code}>acrValues</code>,{" "}
        <code className={styles.code}>children</code>). Ces options sont donc
        portées par le CSS fourni ; seul le niveau de garantie passe par le
        SDK, en <code className={styles.code}>acr_values</code>.
      </p>
    </div>
  )
}

function Generator({
  cfg,
  setCfg,
}: {
  cfg: ButtonConfig
  setCfg: (next: ButtonConfig) => void
}) {
  const set = <K extends keyof ButtonConfig>(key: K, value: ButtonConfig[K]) =>
    setCfg({ ...cfg, [key]: value })
  const acr = LEVEL_ACR[cfg.level]

  return (
    <section className={styles.section} aria-labelledby="partner-kit-generator">
      <div className={styles.sectionHead}>
        <h3 id="partner-kit-generator" className={styles.h3}>
          Générateur du bouton « Se connecter avec IDN »
        </h3>
        <p className={styles.lead}>
          Choisis l’apparence et le niveau de garantie : l’aperçu et le code
          d’intégration se mettent à jour en direct.
        </p>
      </div>

      <div className={styles.generator}>
        <div className={styles.options}>
          <Choice
            legend="Variante"
            value={cfg.variant}
            onChange={(v) => set("variant", v)}
            options={[
              { value: "plein", label: "Plein vert" },
              { value: "contour", label: "Contour" },
              { value: "sombre", label: "Sombre" },
            ]}
          />
          <Choice
            legend="Taille"
            value={cfg.size}
            onChange={(v) => set("size", v)}
            options={[
              { value: "s", label: "S · 36 px" },
              { value: "m", label: "M · 44 px" },
              { value: "l", label: "L · 52 px" },
            ]}
          />
          <Choice
            legend="Forme"
            value={cfg.shape}
            onChange={(v) => set("shape", v)}
            options={[
              { value: "arrondi", label: "Arrondi 10 px" },
              { value: "pilule", label: "Pilule" },
            ]}
          />
          <Choice
            legend="Largeur"
            value={cfg.width}
            onChange={(v) => set("width", v)}
            options={[
              { value: "auto", label: "Auto" },
              { value: "full", label: "Pleine largeur" },
            ]}
          />
          <Choice
            legend="Libellé"
            value={cfg.label}
            onChange={(v) => set("label", v)}
            options={[
              { value: "signin", label: LABELS.signin[cfg.lang] },
              { value: "continue", label: LABELS.continue[cfg.lang] },
              { value: "signup", label: LABELS.signup[cfg.lang] },
            ]}
          />
          <Choice
            legend="Langue"
            value={cfg.lang}
            onChange={(v) => set("lang", v)}
            options={[
              { value: "fr", label: "Français" },
              { value: "en", label: "English" },
            ]}
          />
          <Choice
            legend="Niveau de garantie exigé"
            value={cfg.level}
            onChange={(v) => set("level", v)}
            options={[
              { value: "none", label: "Aucun" },
              { value: "2", label: "Niveau 2 · Substantiel" },
              { value: "3", label: "Niveau 3 · Élevé" },
            ]}
            hint={
              acr
                ? `Le code envoie acr_values=${acr} à l’autorisation IDN.`
                : "Aucun acr_values : le niveau du compte est seulement transmis (claim loa)."
            }
          />
        </div>

        <div className={styles.workspace}>
          <div className={styles.previews}>
            <div className={styles.previewPane} data-bg="light">
              <p className={styles.previewCaption}>Aperçu sur fond clair</p>
              <div className={styles.previewStage}>
                <IdnButton cfg={cfg} />
              </div>
            </div>
            <div className={styles.previewPane} data-bg="dark">
              <p className={styles.previewCaption}>Aperçu sur fond sombre</p>
              <div className={styles.previewStage}>
                <IdnButton cfg={cfg} />
              </div>
            </div>
          </div>
          <CodeTabs cfg={cfg} />
        </div>
      </div>

      <div className={styles.rules}>
        <div className={styles.ruleCard} data-kind="do">
          <h4 className={styles.ruleTitle}>
            <Check size={18} aria-hidden />À faire
          </h4>
          <ul className={styles.ruleList}>
            <li>Garde le symbole IDN intact, à gauche du libellé.</li>
            <li>
              Utilise l’un des trois libellés validés, en français ou en anglais.
            </li>
            <li>
              Laisse autour du bouton une zone de protection au moins égale à la
              hauteur du symbole.
            </li>
            <li>
              Respecte 36 px de hauteur minimum (taille S) ; 44 px sont
              recommandés sur mobile.
            </li>
            <li>
              Place le bouton au même niveau que les autres moyens de connexion.
            </li>
          </ul>
        </div>
        <div className={styles.ruleCard} data-kind="dont">
          <h4 className={styles.ruleTitle}>
            <X size={18} aria-hidden />À éviter
          </h4>
          <ul className={styles.ruleList}>
            <li>
              Recolorer, déformer, faire pivoter ou remplacer le symbole.
            </li>
            <li>
              Réduire le texte à « IDN » seul ou y ajouter un autre message.
            </li>
            <li>
              Changer les couleurs des variantes ou ajouter ombre, dégradé ou
              transparence.
            </li>
            <li>
              Descendre sous 36 px de haut ou empiéter sur la zone de
              protection.
            </li>
            <li>
              Poser la variante Sombre sur un fond sombre : préfère Plein ou
              Contour.
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

/* ---------- Section 2 : démo d'intégration ---------- */

type Phase =
  | "form"
  | "consent"
  | "level3"
  | "success"
  | "filled"
  | "denied"
  | "submitted"

const FIELDS = [
  { key: "nom", label: "Nom", value: "MBOUMBA", type: "text" },
  { key: "prenom", label: "Prénom", value: "Awa", type: "text" },
  {
    key: "naissance",
    label: "Date de naissance (JJ/MM/AAAA)",
    value: "12/03/1990",
    type: "text",
  },
  { key: "lieu", label: "Lieu de naissance", value: "Libreville", type: "text" },
  {
    key: "nip",
    label: "NIP (numéro d’identification personnel)",
    value: "1990 0312 0045 87",
    type: "text",
  },
  {
    key: "email",
    label: "Adresse e-mail",
    value: "awa.mboumba@idn.ga",
    type: "email",
  },
] as const

type FieldKey = (typeof FIELDS)[number]["key"]

const EMPTY_VALUES = Object.fromEntries(
  FIELDS.map((field) => [field.key, ""]),
) as Record<FieldKey, string>

const FILLED_VALUES = Object.fromEntries(
  FIELDS.map((field) => [field.key, field.value]),
) as Record<FieldKey, string>

const DOSSIER = "LBV-2026-118204"
const MAIRIE_URL = "mairie-libreville.ga/actes/demande"

const ANNOUNCEMENTS: Record<Phase, string> = {
  form: "Démo réinitialisée : formulaire de la mairie vide.",
  consent: "Écran de consentement IDN affiché.",
  level3: "IDN : cette démarche exige le Niveau 3.",
  success: "Autorisation accordée. Retour vers le site de la mairie.",
  filled: "Formulaire rempli avec tes informations vérifiées par IDN.",
  denied: "Partage refusé. Retour sur le site de la mairie.",
  submitted: `Demande envoyée. Numéro de dossier ${DOSSIER}.`,
}

const authorizeUrl = (level: Level) => {
  const acr = LEVEL_ACR[level]
  return (
    `identite.ga/oauth/authorize?client_id=mairie-libreville&scope=${SCOPES.join(" ")}` +
    (acr ? `&acr_values=${acr}` : "")
  )
}

function Demo({ cfg }: { cfg: ButtonConfig }) {
  const fieldBaseId = useId()
  const [phase, setPhase] = useState<Phase>("form")
  const [values, setValues] = useState<Record<FieldKey, string>>(EMPTY_VALUES)
  const [announcement, setAnnouncement] = useState("")
  const [bookingNote, setBookingNote] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const moved = useRef(false)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Le bouton cliqué disparaît à chaque étape : on ramène le focus sur le
  // titre du nouvel écran (pas au premier rendu).
  useEffect(() => {
    if (!moved.current) return
    headingRef.current?.focus()
  }, [phase])

  const go = (next: Phase) => {
    moved.current = true
    setPhase(next)
    setAnnouncement(ANNOUNCEMENTS[next])
  }

  const startSignIn = () => {
    setBookingNote(false)
    go(cfg.level === "3" ? "level3" : "consent")
  }

  const authorize = () => {
    go("success")
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setValues(FILLED_VALUES)
      go("filled")
    }, 1600)
  }

  const replay = () => {
    window.clearTimeout(timer.current)
    setValues(EMPTY_VALUES)
    setBookingNote(false)
    go("form")
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    go("submitted")
  }

  const url =
    phase === "consent" || phase === "level3"
      ? authorizeUrl(cfg.level)
      : phase === "success"
        ? "mairie-libreville.ga/auth/callback?code=…&state=…"
        : MAIRIE_URL

  const onIdnSide = phase === "consent" || phase === "level3" || phase === "success"
  const filled = phase === "filled"

  return (
    <section className={styles.section} aria-labelledby="partner-kit-demo">
      <div className={styles.sectionHead}>
        <h3 id="partner-kit-demo" className={styles.h3}>
          Démo d’intégration : Mairie de Libreville
        </h3>
        <p className={styles.lead}>
          Le parcours vu par l’usager chez un partenaire, de la demande d’acte
          de naissance au formulaire prérempli. Personnage fictif : Awa
          Mboumba.
        </p>
      </div>

      <div className={styles.demoBar}>
        <p>Le bouton reprend les réglages du générateur ci-dessus.</p>
        <button type="button" className={styles.secondaryBtn} onClick={replay}>
          <RotateCcw size={16} aria-hidden />
          Rejouer la démo
        </button>
      </div>

      <p role="status" aria-live="polite" className={styles.srOnly}>
        {announcement}
      </p>

      <div className={styles.browser}>
        <div className={styles.chrome}>
          <div className={styles.dots} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className={styles.address}>
            <Lock size={13} aria-hidden />
            <span className={styles.srOnly}>Adresse : </span>
            <span className={styles.addressText}>{url}</span>
          </p>
        </div>

        <div className={styles.viewport}>
          {onIdnSide ? (
            <div className={styles.idnScreen}>
              <div className={styles.idnCard}>
                {phase === "consent" ? (
                  <>
                    <div className={styles.pair}>
                      <span className={styles.mairieLogo}>
                        <Landmark size={20} aria-hidden />
                      </span>
                      <ArrowLeftRight size={16} aria-hidden />
                      <IdnMark size={36} />
                    </div>
                    <h4
                      ref={headingRef}
                      tabIndex={-1}
                      className={styles.screenHeading}
                    >
                      La Mairie de Libreville demande l’accès à ton identité IDN
                    </h4>
                    <div className={styles.account}>
                      <span className={styles.avatar} aria-hidden="true">
                        AM
                      </span>
                      <span className={styles.accountId}>
                        <strong>Awa Mboumba</strong>
                        <span>awa.mboumba@idn.ga</span>
                      </span>
                      <span className={styles.badge}>
                        <ShieldCheck size={13} aria-hidden />
                        Niveau 2 · Substantiel
                      </span>
                    </div>
                    <div>
                      <p className={styles.dataTitle}>Données transmises</p>
                      <ul className={styles.dataList}>
                        <li>
                          <Check size={16} aria-hidden />
                          <span>
                            Identité
                            <span>nom, prénom, date et lieu de naissance</span>
                          </span>
                        </li>
                        <li>
                          <Check size={16} aria-hidden />
                          <span>
                            NIP
                            <span>numéro d’identification personnel</span>
                          </span>
                        </li>
                        <li>
                          <Check size={16} aria-hidden />
                          <span>
                            Adresse e-mail vérifiée
                            <span>awa.mboumba@idn.ga</span>
                          </span>
                        </li>
                        {cfg.level === "2" ? (
                          <li>
                            <Check size={16} aria-hidden />
                            <span>
                              Niveau de garantie
                              <span>exigé par la mairie : Niveau 2</span>
                            </span>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={authorize}
                      >
                        Autoriser
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => go("denied")}
                      >
                        Refuser
                      </button>
                    </div>
                    <p className={styles.fine}>
                      Tu peux retirer cet accès à tout moment depuis ton espace
                      IDN.
                    </p>
                  </>
                ) : null}

                {phase === "level3" ? (
                  <>
                    <span className={styles.levelIcon}>
                      <Video size={22} aria-hidden />
                    </span>
                    <h4
                      ref={headingRef}
                      tabIndex={-1}
                      className={styles.screenHeading}
                    >
                      Cette démarche exige le Niveau 3
                    </h4>
                    <p className={styles.idnText}>
                      Ton compte est au Niveau 2 · Substantiel. Pour atteindre
                      le Niveau 3 · Élevé, un agent IDN confirme ton identité
                      lors d’un court entretien vidéo.
                    </p>
                    <div className={styles.actions}>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        onClick={() => setBookingNote(true)}
                      >
                        Réserver l’entretien vidéo
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        onClick={() => go("denied")}
                      >
                        Revenir à la mairie
                      </button>
                    </div>
                    <p className={styles.fine} role="status">
                      {bookingNote
                        ? "Dans la démo, la prise de rendez-vous s’arrête ici. Repasse le niveau exigé à 2 ou à « Aucun » pour voir la suite du parcours."
                        : ""}
                    </p>
                  </>
                ) : null}

                {phase === "success" ? (
                  <div className={styles.successBox}>
                    <LottiePlayer
                      animation="success"
                      label="Autorisation accordée"
                      className={styles.lottie}
                    />
                    <h4
                      ref={headingRef}
                      tabIndex={-1}
                      className={styles.screenHeading}
                    >
                      Autorisation accordée
                    </h4>
                    <p className={styles.idnText}>
                      Retour vers mairie-libreville.ga…
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className={styles.mairie}>
              <div className={styles.mairieHeader}>
                <span className={styles.mairieLogo}>
                  <Landmark size={20} aria-hidden />
                </span>
                <span className={styles.mairieName}>
                  <strong>Mairie de Libreville</strong>
                  <span>Service de l’état civil</span>
                </span>
              </div>

              <div className={styles.mairieBody}>
                {phase === "submitted" ? (
                  <div className={styles.confirm}>
                    <CircleCheck size={28} aria-hidden />
                    <h4
                      ref={headingRef}
                      tabIndex={-1}
                      className={styles.screenHeading}
                    >
                      Demande envoyée
                    </h4>
                    <p>Numéro de dossier</p>
                    <p className={styles.folio}>{DOSSIER}</p>
                    <p>
                      Un récapitulatif a été envoyé à awa.mboumba@idn.ga.
                      Conserve ce numéro pour suivre ta demande d’acte de
                      naissance.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className={styles.crumbs}>Actes › Demande en ligne</p>
                      <h4
                        ref={headingRef}
                        tabIndex={-1}
                        className={styles.screenHeading}
                      >
                        Demande d’acte de naissance
                      </h4>
                      <p className={styles.mairieIntro}>
                        Copie intégrale ou extrait, délivré par le service de
                        l’état civil.
                      </p>
                    </div>

                    {phase === "denied" ? (
                      <p className={styles.notice}>
                        <Info size={18} aria-hidden />
                        Aucune information n’a été transmise par IDN. Tu peux
                        réessayer quand tu le souhaites.
                      </p>
                    ) : null}

                    {filled ? (
                      <p className={styles.verified}>
                        <ShieldCheck size={18} aria-hidden />
                        Informations vérifiées par IDN · Niveau 2
                      </p>
                    ) : (
                      <>
                        <div className={styles.idnBlock}>
                          <p>
                            Gagne du temps : remplis ce formulaire avec ton
                            identité numérique.
                          </p>
                          <IdnButton cfg={cfg} onClick={startSignIn} />
                        </div>
                        <p className={styles.or} aria-hidden="true">
                          ou
                        </p>
                      </>
                    )}

                    <form
                      className={filled ? styles.filled : undefined}
                      onSubmit={submit}
                      aria-label="Demande d’acte de naissance"
                    >
                      <div className={styles.formGrid}>
                        {FIELDS.map((field, index) => {
                          const id = `${fieldBaseId}-${field.key}`
                          return (
                            <div key={field.key} className={styles.field}>
                              <label htmlFor={id}>{field.label}</label>
                              <input
                                id={id}
                                type={field.type}
                                className={styles.input}
                                // Données fictives : pas d'autoremplissage
                                // navigateur avec celles du visiteur.
                                autoComplete="off"
                                value={values[field.key]}
                                readOnly={filled}
                                style={{ "--i": index } as CSSProperties}
                                onChange={(event) =>
                                  setValues({
                                    ...values,
                                    [field.key]: event.target.value,
                                  })
                                }
                              />
                            </div>
                          )
                        })}
                      </div>
                      {filled ? (
                        <div style={{ marginTop: 18 }}>
                          <button type="submit" className={styles.slateBtn}>
                            Envoyer la demande
                          </button>
                        </div>
                      ) : null}
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------- Export ---------- */

export function PartnerKit() {
  const [cfg, setCfg] = useState<ButtonConfig>(DEFAULT_CONFIG)
  return (
    <div className={styles.root}>
      <Generator cfg={cfg} setCfg={setCfg} />
      <Demo cfg={cfg} />
    </div>
  )
}
