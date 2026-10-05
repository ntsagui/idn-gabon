import Link from "next/link"

import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"
import { IdnMark } from "@repo/ui/components/idn-mark"
import { cn } from "@repo/ui/lib/utils"

import { Icon, type IconName } from "@/app/_components/idn/icons"

const POINTS: { icon: IconName; text: string }[] = [
  // Uniquement des faits vérifiables du service (le prototype annonçait un
  // coffre chiffré de bout en bout, aujourd'hui en sommeil).
  { icon: "shield", text: "Niveaux de garantie 1 à 3, confirmés par un contrôleur" },
  { icon: "qr", text: "Ta carte d’identité numérique, présentée par QR code" },
  { icon: "mailbox", text: "Adresse souveraine @idn.ga et courriers officiels" },
]

/**
 * Colonne verte des écrans d'accès sur grand écran (prototype web, écran
 * « Connexion ») : rappel du service à gauche, parcours à droite.
 */
export function AuthAside({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Identité Numérique du Gabon"
      className={cn(
        "sticky top-0 h-svh w-[40%] max-w-[560px] shrink-0 flex-col justify-between bg-idn-green-dark p-10 text-white lg:p-12",
        className
      )}
    >
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-3 rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <IdnMark size={36} />
        <span className="text-[15px] font-semibold">Identité Numérique</span>
      </Link>
      <div className="flex flex-col gap-4">
        <IdnFlagBars width={66} />
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#d6e6dc]">République gabonaise</p>
        <p className="max-w-[24ch] text-[28px] font-semibold leading-[1.25] tracking-[-0.01em]">
          Ton identité, tes documents et ton courrier officiel, en un seul endroit.
        </p>
        <ul className="mt-2 flex flex-col gap-3">
          {POINTS.map((p) => (
            <li key={p.text} className="flex items-start gap-2.5 text-[15px] leading-[22px]">
              <Icon name={p.icon} size={18} className="mt-0.5 shrink-0 text-idn-yellow" />
              {p.text}
            </li>
          ))}
        </ul>
      </div>
      <p className="font-mono text-[11px] text-[#d6e6dc]">Service public numérique · identite.ga</p>
    </aside>
  )
}
