import { cn } from "@repo/ui/lib/utils"

/** Progression d'un parcours : barres de 4 px, étape courante en gras. */
export function Stepper({ steps, current, className }: { steps: string[]; current: number; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={current + 1}
      aria-valuetext={`Étape ${current + 1} sur ${steps.length} : ${steps[current]}`}
      className={cn("flex gap-1.5 pt-3", className)}
    >
      {steps.map((label, i) => (
        <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span aria-hidden className={cn("h-1 rounded-full", i <= current ? "bg-idn-green" : "bg-idn-border")} />
          <span aria-hidden className={cn("truncate text-[11px]", i === current ? "font-semibold text-idn-ink" : "text-idn-muted")}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}
