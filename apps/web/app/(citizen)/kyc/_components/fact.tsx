/** Chiffre clé d'une présentation (durée, pièce, gratuité), comme le `Fact` du mobile. */
export function Fact({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-[14px] border border-idn-border bg-idn-surface p-3">
      <p className="text-[15px] font-semibold text-idn-ink">{value}</p>
      <p className="mt-0.5 text-xs text-idn-muted">{label}</p>
    </div>
  )
}

/** Rangée de trois chiffres clés. */
export function Facts({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex gap-2">{children}</div>
}
