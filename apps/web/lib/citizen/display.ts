import type { IconName } from "@/app/_components/idn/icons"
import type { RowTone } from "@/app/_components/idn/list"

/** Libellé du profil accordé au genre (accueil mobile). */
export function profileLabel(type: string | undefined, gender: string | undefined): string {
  const f = gender === "F"
  if (type === "citizen") return f ? "Citoyenne gabonaise" : "Citoyen gabonais"
  if (type === "resident") return f ? "Résidente" : "Résident"
  if (type === "visitor") return f ? "Visiteuse" : "Visiteur"
  if (type === "developer") return "Développeur"
  return ""
}

/** AAAA-MM-JJ → JJ/MM/AAAA. */
export function frDate(iso?: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ""
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/** Icône et couleur d'un événement du journal (mêmes règles que le mobile). */
export function activityVisual(action: string): { icon: IconName; tone: RowTone } {
  if (action.startsWith("login") || action === "partner_token_exchanged") return { icon: "logOut", tone: "green" }
  if (action.startsWith("consent")) return { icon: "keyRound", tone: "green" }
  if (action.startsWith("kyc") || action.startsWith("level3") || action === "identity_check_performed") return { icon: "shield", tone: "blue" }
  if (action.startsWith("session")) return { icon: "smartphone", tone: "yellow" }
  if (action.includes("pin") || action.includes("password")) return { icon: "lock", tone: "neutral" }
  if (action === "presentation_minted") return { icon: "qr", tone: "green" }
  return { icon: "activity", tone: "neutral" }
}

/** Icône d'appareil déduite de son libellé. */
export function deviceIcon(device: string): "smartphone" | "laptop" | "tablet" {
  const d = device.toLowerCase()
  if (d.includes("ipad") || d.includes("tablet")) return "tablet"
  if (d.includes("iphone") || d.includes("android") || d.includes("mobile")) return "smartphone"
  return "laptop"
}
