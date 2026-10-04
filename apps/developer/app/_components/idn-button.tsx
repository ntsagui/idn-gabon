/**
 * Bouton « Se connecter avec IDN » — valeurs reprises à l'identique du kit
 * partenaire de la charte (apps/web/.../identite-graphique/_components/
 * partner-kit.tsx). Sert d'aperçu sur l'accueil et dans le guide ; le code
 * généré est celui que le partenaire copie.
 */

export type ButtonVariant = "plein" | "contour" | "sombre"
export type ButtonSize = "s" | "m" | "l"
export type ButtonShape = "arrondi" | "pilule"
export type ButtonLabel = "signin" | "continue" | "signup"
export type ButtonLevel = "none" | "2" | "3"

export const BUTTON_LABELS: Record<ButtonLabel, { fr: string; en: string }> = {
  signin: { fr: "Se connecter avec IDN", en: "Sign in with IDN" },
  continue: { fr: "Continuer avec IDN", en: "Continue with IDN" },
  signup: { fr: "S’inscrire avec IDN", en: "Sign up with IDN" },
}

export const BUTTON_VARIANTS: Record<
  ButtonVariant,
  {
    label: string
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
    label: "Plein",
    bg: "#0E7C3A",
    fg: "#FFFFFF",
    border: "#0E7C3A",
    hoverBg: "#0A5C2C",
    hoverBorder: "#0A5C2C",
    markFill: "#FFFFFF",
    markStroke: "#0E7C3A",
  },
  contour: {
    label: "Contour",
    bg: "#FFFFFF",
    fg: "#16170F",
    border: "#0E7C3A",
    hoverBg: "#E6F2EA",
    hoverBorder: "#0E7C3A",
    markFill: "#0E7C3A",
    markStroke: "#FFFFFF",
  },
  sombre: {
    label: "Sombre",
    bg: "#16170F",
    fg: "#FFFFFF",
    border: "#16170F",
    hoverBg: "#3A3D2E",
    hoverBorder: "#3A3D2E",
    markFill: "#0E7C3A",
    markStroke: "#FFFFFF",
  },
}

export const BUTTON_SIZES: Record<
  ButtonSize,
  { label: string; height: number; padX: number; gap: number; font: number; mark: number }
> = {
  s: { label: "S · 36 px", height: 36, padX: 14, gap: 8, font: 14, mark: 18 },
  m: { label: "M · 44 px", height: 44, padX: 18, gap: 10, font: 15, mark: 20 },
  l: { label: "L · 52 px", height: 52, padX: 22, gap: 12, font: 16, mark: 24 },
}

const LEVEL_ACR: Record<ButtonLevel, "eidas2" | "eidas3" | null> = {
  none: null,
  "2": "eidas2",
  "3": "eidas3",
}

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

export type ButtonConfig = {
  variant: ButtonVariant
  size: ButtonSize
  shape: ButtonShape
  label: ButtonLabel
  lang: "fr" | "en"
  level: ButtonLevel
}

export const DEFAULT_BUTTON: ButtonConfig = {
  variant: "plein",
  size: "m",
  shape: "arrondi",
  label: "signin",
  lang: "fr",
  level: "none",
}

/** Aperçu non interactif (rendu `<span>`), conforme au kit. */
export function IdnButtonPreview({ config }: { config: ButtonConfig }) {
  const v = BUTTON_VARIANTS[config.variant]
  const s = BUTTON_SIZES[config.size]
  return (
    <span
      className="inline-flex max-w-full items-center justify-center whitespace-nowrap font-semibold leading-none"
      style={{
        gap: s.gap,
        height: s.height,
        padding: `0 ${s.padX}px`,
        border: `1px solid ${v.border}`,
        borderRadius: config.shape === "pilule" ? 9999 : 10,
        background: v.bg,
        color: v.fg,
        fontSize: s.font,
      }}
    >
      <svg width={s.mark} height={s.mark} viewBox="0 0 32 32" fill="none" aria-hidden focusable="false">
        <rect x="2" y="2" width="28" height="28" rx="7" fill={v.markFill} />
        <g
          transform="translate(4 4)"
          stroke={v.markStroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {MARK_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </svg>
      <span>{BUTTON_LABELS[config.label][config.lang]}</span>
    </span>
  )
}

const markSvg = (cfg: ButtonConfig, indent: string) => {
  const v = BUTTON_VARIANTS[cfg.variant]
  const s = BUTTON_SIZES[cfg.size].mark
  return [
    `<svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">`,
    `  <rect x="2" y="2" width="28" height="28" rx="7" fill="${v.markFill}" />`,
    `  <g transform="translate(4 4)" stroke="${v.markStroke}" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">`,
    ...MARK_PATHS.map((d) => `    <path d="${d}" />`),
    `  </g>`,
    `</svg>`,
  ].map((line) => indent + line)
}

export function buttonCss(cfg: ButtonConfig): string {
  const v = BUTTON_VARIANTS[cfg.variant]
  const s = BUTTON_SIZES[cfg.size]
  return [
    `/* Bouton « ${BUTTON_LABELS[cfg.label].fr} » — charte IDN */`,
    `.idn-btn {`,
    `  display: inline-flex;`,
    `  align-items: center;`,
    `  justify-content: center;`,
    `  gap: ${s.gap}px;`,
    `  height: ${s.height}px;`,
    `  padding: 0 ${s.padX}px;`,
    `  border: 1px solid ${v.border};`,
    `  border-radius: ${cfg.shape === "pilule" ? "9999px" : "10px"};`,
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
  ].join("\n")
}

/** Composant React prêt à copier (IDNSignInButton est headless). */
export function buttonReactCode(cfg: ButtonConfig): string {
  const acr = LEVEL_ACR[cfg.level]
  return [
    `"use client"`,
    ``,
    `import { IDNSignInButton } from "@idn-ga/react"`,
    `import "./bouton-idn.css" // CSS ci-dessus (classe .idn-btn)`,
    ``,
    `export function BoutonIDN() {`,
    `  return (`,
    acr
      ? `    <IDNSignInButton className="idn-btn" acrValues={["${acr}"]}>`
      : `    <IDNSignInButton className="idn-btn">`,
    ...markSvg(cfg, "      "),
    `      <span>${BUTTON_LABELS[cfg.label][cfg.lang]}</span>`,
    `    </IDNSignInButton>`,
    `  )`,
    `}`,
  ].join("\n")
}
