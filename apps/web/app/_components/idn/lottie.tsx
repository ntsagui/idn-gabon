"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import type { LottieHandle } from "lottie-react"

import { cn } from "@repo/ui/lib/utils"

import {
  brandAnimations,
  type BrandAnimation,
} from "../../(public)/identite-graphique/_components/lottie-player"

import { Pause, Play } from "lucide-react"

// lottie-web lit `navigator` au chargement du module : rendu client uniquement.
const LottieLight = dynamic(() => import("lottie-react").then((m) => m.LottieLight), { ssr: false })

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Animation de la charte à taille fixe (`IdnLottie` du mobile). Avec
 * `prefers-reduced-motion`, l'image finale s'affiche sans mouvement. Une
 * boucle reçoit un bouton pause placé hors de l'image, donc atteignable au
 * clavier et au lecteur d'écran (WCAG 2.2.2).
 */
export function IdnLottie({
  name,
  size = 120,
  loop,
  label,
  className,
}: {
  name: BrandAnimation
  size?: number
  loop?: boolean
  label: string
  className?: string
}) {
  const handle = React.useRef<LottieHandle>(null)
  const [paused, setPaused] = React.useState(false)
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div role="img" aria-label={label} className="size-full">
        <LottieLight
          src={brandAnimations[name]}
          lottieRef={handle}
          loop={loop}
          autoplay={false}
          aria-hidden
          style={{ width: "100%", height: "100%" }}
          subscriptions={{
            ready: () => {
              if (prefersReducedMotion()) handle.current?.seek({ percent: 100 })
              else handle.current?.play()
            },
          }}
        />
      </div>
      {loop ? (
        <button
          type="button"
          onClick={() => {
            if (paused) handle.current?.play()
            else handle.current?.pause()
            setPaused(!paused)
          }}
          aria-label={`${paused ? "Lire" : "Mettre en pause"} l’animation`}
          aria-pressed={paused}
          className="absolute -bottom-1 -right-1 inline-flex size-7 items-center justify-center rounded-full border border-idn-border bg-idn-surface text-idn-muted outline-none hover:text-idn-ink focus-visible:ring-2 focus-visible:ring-ring"
        >
          {paused ? <Play size={12} aria-hidden /> : <Pause size={12} aria-hidden />}
        </button>
      ) : null}
    </div>
  )
}
