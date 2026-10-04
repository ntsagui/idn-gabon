import { cn } from "@repo/ui/lib/utils"

/** Logo de l'application (image hébergée par IDN) ou initiales. */
export function AppLogo({
  name,
  icon,
  size = 40,
  className,
}: {
  name: string
  icon?: string | null
  size?: number
  className?: string
}) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "A"
  if (icon) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL signée du stockage Convex
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-[10px] border border-idn-border object-cover", className)}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[10px] bg-idn-surface-2 font-semibold text-idn-ink-2",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials}
    </span>
  )
}
