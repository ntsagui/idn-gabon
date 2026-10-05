import { Badge } from "@/app/_components/idn/badge"

const LEVELS = {
  Expert: { label: "Niveau expert", desc: "Ton profil est attractif pour les recruteurs.", tone: "green" },
  Bon: { label: "Bon niveau", desc: "Bon profil : quelques améliorations sont possibles.", tone: "blue" },
  Débutant: { label: "À compléter", desc: "Complète ton CV pour gagner en visibilité.", tone: "yellow" },
} as const

/** Anneau de score (`cv.score.get`, 0 à 100) ; apps/mobile/src/components/cv/score-ring.tsx. */
export function ScoreRing({ score, level }: { score: number; level: "Débutant" | "Bon" | "Expert" }) {
  const size = 76
  const stroke = 8
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const meta = LEVELS[level]
  return (
    <div role="img" aria-label={`Score du CV : ${clamped} sur 100, ${meta.label}`} className="flex items-center gap-4 py-3.5">
      <span className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="absolute inset-0" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-idn-surface-2" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - clamped / 100)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="stroke-idn-green"
          />
        </svg>
        <span className="text-[22px] font-semibold text-idn-ink">{clamped}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-[13px] leading-[18px] text-idn-muted">{meta.desc}</span>
      </span>
    </div>
  )
}
