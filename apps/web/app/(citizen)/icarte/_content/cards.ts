/**
 * Catalogue iCarte : transposition de apps/mobile/src/data/cards.ts, des
 * modèles de apps/mobile/src/app/(tabs)/icarte/add.tsx et de
 * apps/mobile/src/lib/wallet-adapter.ts (mêmes couleurs, mêmes champs).
 */

import type { IconName } from "@/app/_components/idn/icons"

/** Aplats de la charte (prototype iCarte), contraste du texte blanc ≥ 4,5:1. */
export const CARD_COLORS = {
  green: "#0E7C3A",
  orange: "#C2410C",
  blue: "#2563AC",
  rose: "#BE185D",
  black: "#16170F",
  purple: "#6D28D9",
  amber: "#A35A06",
  yellow: "#8A6A00",
  indigo: "#3730A3",
} as const

export type GradKey = keyof typeof CARD_COLORS

export type UiCard = {
  id: string
  type: string
  name: string
  sub: string
  grad: GradKey | "white"
  icon: IconName
  featured: boolean
  official: boolean
}

export type CardTemplate = { id: TemplateType; label: string; icon: IconName; grad: GradKey }

export const CARD_TEMPLATES: CardTemplate[] = [
  { id: "cni", label: "CNI", icon: "fingerprint", grad: "green" },
  { id: "driving", label: "Permis", icon: "car", grad: "orange" },
  { id: "transport", label: "Transport", icon: "bus", grad: "blue" },
  { id: "health", label: "Santé", icon: "heart", grad: "rose" },
  { id: "bank", label: "Bancaire", icon: "cc", grad: "black" },
  { id: "business", label: "Visite", icon: "briefcase", grad: "purple" },
]

/** Libellés de l’écran « Quel type de carte ? » (add-template du mobile). */
export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  cni: "Carte nationale d’identité",
  driving: "Permis de conduire",
  transport: "Carte de transport",
  health: "Carte santé (CNAMGS)",
  bank: "Carte bancaire",
  business: "Carte de visite",
}

export const CUSTOM_COLORS: { id: GradKey; label: string }[] = [
  { id: "green", label: "Vert" },
  { id: "orange", label: "Orange" },
  { id: "blue", label: "Bleu" },
  { id: "rose", label: "Rose" },
  { id: "black", label: "Noir" },
  { id: "purple", label: "Violet" },
]

/** `id` = clé stockée (`iconKey`), identique au mobile. */
export const CUSTOM_ICONS: { id: string; label: string }[] = [
  { id: "cc", label: "Carte" },
  { id: "car", label: "Voiture" },
  { id: "bus", label: "Bus" },
  { id: "heart", label: "Cœur" },
  { id: "briefcase", label: "Valise" },
  { id: "users", label: "Groupe" },
]

// ─── Modèles de saisie (apps/mobile/src/app/(tabs)/icarte/add.tsx) ──────

export type TemplateType = "cni" | "driving" | "transport" | "health" | "bank" | "business"
export type FieldSpec = { key: string; label: string; placeholder?: string; type?: "date" }
export type TemplateSpec = {
  type: TemplateType
  defaultName: string
  defaultSubtitle: string
  grad: GradKey
  /** Clé stockée en base (`iconKey`), la même que celle du mobile. */
  iconKey: string
  isOfficialStyle: boolean
  data: FieldSpec[]
  backData: FieldSpec[]
}

export const TEMPLATES: Record<TemplateType, TemplateSpec> = {
  cni: {
    type: "cni",
    defaultName: "Carte d'Identité",
    defaultSubtitle: "République Gabonaise",
    grad: "green",
    iconKey: "seal",
    isOfficialStyle: false,
    data: [
      { key: "nom", label: "Nom complet", placeholder: "DUPONT Jean" },
      { key: "numero", label: "Numéro CNI", placeholder: "GA-XXXX-XXXX" },
      { key: "validite", label: "Validité", placeholder: "MM/AAAA" },
    ],
    backData: [
      { key: "naissance", label: "Date de naissance", type: "date" },
      { key: "lieu", label: "Lieu de naissance" },
    ],
  },
  driving: {
    type: "driving",
    defaultName: "Permis de Conduire",
    defaultSubtitle: "Catégories",
    grad: "orange",
    iconKey: "car",
    isOfficialStyle: false,
    data: [
      { key: "nom", label: "Nom complet" },
      { key: "numero", label: "Numéro de permis" },
      { key: "categories", label: "Catégories", placeholder: "A, B, C" },
    ],
    backData: [
      { key: "delivrance", label: "Date de délivrance", type: "date" },
      { key: "prefecture", label: "Préfecture" },
    ],
  },
  transport: {
    type: "transport",
    defaultName: "Carte Transport",
    defaultSubtitle: "STLG Libreville",
    grad: "blue",
    iconKey: "bus",
    isOfficialStyle: false,
    data: [
      { key: "numero", label: "Numéro de carte" },
      { key: "zone", label: "Zone", placeholder: "Toutes zones" },
      { key: "validite", label: "Validité", placeholder: "MM/AAAA" },
    ],
    backData: [
      { key: "type", label: "Type abonnement" },
      { key: "solde", label: "Solde" },
    ],
  },
  health: {
    type: "health",
    defaultName: "CNAMGS",
    defaultSubtitle: "Assurance Maladie",
    grad: "rose",
    iconKey: "heart",
    isOfficialStyle: true,
    data: [
      { key: "regime", label: "Régime" },
      { key: "numero", label: "Numéro assuré" },
      { key: "validite", label: "Validité" },
    ],
    backData: [
      { key: "employeur", label: "Employeur" },
      { key: "couverture", label: "Couverture" },
    ],
  },
  bank: {
    type: "bank",
    defaultName: "Carte Bancaire",
    defaultSubtitle: "",
    grad: "black",
    iconKey: "cc",
    isOfficialStyle: false,
    data: [
      { key: "titulaire", label: "Titulaire" },
      { key: "numero", label: "Numéro (masqué)", placeholder: "•••• •••• •••• 1234" },
      { key: "expiration", label: "Expiration", placeholder: "MM/AA" },
    ],
    backData: [],
  },
  business: {
    type: "business",
    defaultName: "Carte de Visite",
    defaultSubtitle: "",
    grad: "purple",
    iconKey: "briefcase",
    isOfficialStyle: false,
    data: [
      { key: "titre", label: "Titre" },
      { key: "entreprise", label: "Entreprise" },
    ],
    backData: [
      { key: "email", label: "Email" },
      { key: "tel", label: "Téléphone" },
      { key: "site", label: "Site web" },
    ],
  },
}

export function isTemplateType(v: string | null): v is TemplateType {
  return v !== null && v in TEMPLATES
}

// ─── Adaptateur (apps/mobile/src/lib/wallet-adapter.ts) ─────────────────

/** Clé stockée → icône de la charte (`seal` = empreinte, comme le mobile). */
const ICON_BY_KEY: Record<string, IconName> = {
  seal: "fingerprint",
  cc: "cc",
  car: "car",
  bus: "bus",
  heart: "heart",
  briefcase: "briefcase",
  globe: "globe",
  vote: "vote",
  gift: "gift",
  users: "users",
  flag: "flag",
  palette: "palette",
  user: "user",
  wallet: "wallet",
}

export function cardIcon(iconKey: string): IconName {
  return ICON_BY_KEY[iconKey] ?? "cc"
}

export function gradientToGradKey(gradient: string): GradKey | "white" {
  const g = gradient.toLowerCase().trim()
  // Correspondance exacte d’abord : l’heuristique du mobile confond « blue »
  // (…to-indigo-700) avec « indigo » et « yellow » (from-amber-400…) avec
  // « amber ». Écart signalé au lot mobile.
  const exact = (Object.keys(GRAD_KEY_TO_TAILWIND) as GradKey[]).find((k) => GRAD_KEY_TO_TAILWIND[k] === g)
  if (exact) return exact
  if (g.includes("slate") || g.includes("zinc") || g.includes("black")) return "black"
  if (g.includes("emerald") || g.includes("green")) return "green"
  if (g.includes("red") && !g.includes("rose")) return "orange"
  if (g.includes("orange")) return "orange"
  if (g.includes("pink") || g.includes("rose")) return "rose"
  if (g.includes("purple") || g.includes("violet")) return "purple"
  if (g.includes("amber")) return "amber"
  if (g.includes("yellow")) return "yellow"
  if (g.includes("indigo")) return "indigo"
  if (g.includes("blue")) return "blue"
  if (g.includes("white")) return "white"
  return "green"
}

/** Le backend stocke des classes Tailwind (format partagé avec le mobile). */
const GRAD_KEY_TO_TAILWIND: Record<GradKey, string> = {
  green: "from-green-600 via-green-700 to-emerald-800",
  orange: "from-orange-500 via-orange-600 to-red-600",
  blue: "from-blue-500 via-blue-600 to-indigo-700",
  rose: "from-rose-500 via-rose-600 to-pink-600",
  black: "from-slate-800 via-slate-900 to-black",
  purple: "from-purple-600 via-purple-700 to-violet-800",
  amber: "from-amber-500 via-amber-600 to-yellow-700",
  yellow: "from-amber-400 via-yellow-500 to-yellow-700",
  indigo: "from-indigo-500 via-indigo-600 to-blue-700",
}

export function gradKeyToGradient(grad: GradKey): string {
  return GRAD_KEY_TO_TAILWIND[grad]
}

export function walletCardToUi(card: {
  _id: string
  type: string
  name: string
  subtitle?: string
  gradient: string
  iconKey: string
  isOfficialStyle: boolean
  featured: boolean
}): UiCard {
  return {
    id: card._id,
    type: card.type,
    name: card.name,
    sub: card.subtitle ?? "",
    grad: gradientToGradKey(card.gradient),
    icon: cardIcon(card.iconKey),
    featured: card.featured,
    official: card.isOfficialStyle,
  }
}

/** Libellé d’un champ libre (« date_naissance » → « Date naissance »). */
export function formatLabel(key: string): string {
  if (!key) return ""
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")
}

/** Couleur de fond d’une carte ; la carte « officielle » blanche passe au vert sur les grands visuels. */
export function cardColor(grad: GradKey | "white"): string {
  return grad === "white" ? CARD_COLORS.green : CARD_COLORS[grad]
}
