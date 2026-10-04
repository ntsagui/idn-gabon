"use client"

import dynamic from "next/dynamic"
import { useCallback, useEffect, useRef, useState } from "react"
import type { LottieHandle } from "lottie-react"
import { Pause, Play, RotateCcw } from "lucide-react"

import biometric from "../_lottie/biometric.json"
import iboite from "../_lottie/iboite.json"
import icarte from "../_lottie/icarte.json"
import icv from "../_lottie/icv.json"
import idocument from "../_lottie/idocument.json"
import loader from "../_lottie/loader.json"
import logo from "../_lottie/logo-reveal.json"
import notification from "../_lottie/notification.json"
import partage from "../_lottie/partage.json"
import scan from "../_lottie/scan.json"
import shield from "../_lottie/shield.json"
import success from "../_lottie/success.json"

export const brandAnimations = {
  logo,
  loader,
  success,
  scan,
  shield,
  biometric,
  iboite,
  icarte,
  idocument,
  notification,
  partage,
  icv,
}

export type BrandAnimation = keyof typeof brandAnimations

// lottie-web lit `navigator` au chargement du module : rendu client uniquement.
const LottieLight = dynamic(
  () => import("lottie-react").then((mod) => mod.LottieLight),
  { ssr: false }
)

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

export function LottiePlayer({
  animation,
  label,
  loop = false,
  replayable = false,
  pausable = false,
  className,
}: {
  animation: BrandAnimation
  /** Décrit l'animation pour les lecteurs d'écran (RGAA 1.1). */
  label: string
  loop?: boolean
  replayable?: boolean
  /** Bouton pause : obligatoire pour une boucle qui dure plus de 5 s (WCAG 2.2.2). */
  pausable?: boolean
  className?: string
}) {
  const handle = useRef<LottieHandle>(null)
  const root = useRef<HTMLDivElement>(null)
  const ready = useRef(false)
  const visible = useRef(false)
  const played = useRef(false)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)

  // Joue l'animation quand elle entre à l'écran (une fois si elle ne boucle
  // pas), la met en pause quand elle en sort.
  const sync = useCallback(() => {
    const lottie = handle.current
    if (!lottie || !ready.current) return
    if (reducedMotion()) {
      lottie.seek({ percent: 100 })
      return
    }
    if (visible.current && !pausedRef.current && (loop || !played.current)) {
      played.current = true
      lottie.play()
    } else if (!visible.current && loop) {
      lottie.pause()
    }
  }, [loop])

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry?.isIntersecting ?? false
        sync()
      },
      { threshold: 0.35 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [sync])

  const control = {
    position: "absolute",
    right: 8,
    bottom: 8,
    display: "grid",
    placeItems: "center",
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "1px solid currentColor",
    background: "transparent",
    color: "inherit",
    opacity: 0.7,
    cursor: "pointer",
  } as const

  return (
    <div ref={root} role="img" aria-label={label} className={className}>
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        <LottieLight
          src={brandAnimations[animation]}
          lottieRef={handle}
          loop={loop}
          aria-hidden
          style={{ width: "100%", height: "100%" }}
          subscriptions={{
            ready: () => {
              ready.current = true
              sync()
            },
          }}
        />
        {replayable ? (
          <button
            type="button"
            onClick={() => {
              handle.current?.stop()
              handle.current?.play()
            }}
            aria-label={`Rejouer : ${label}`}
            style={control}
          >
            <RotateCcw size={14} aria-hidden />
          </button>
        ) : null}
        {pausable ? (
          <button
            type="button"
            onClick={() => {
              pausedRef.current = !paused
              setPaused(!paused)
              if (paused) handle.current?.play()
              else handle.current?.pause()
            }}
            aria-label={`${paused ? "Lire" : "Mettre en pause"} : ${label}`}
            aria-pressed={paused}
            style={control}
          >
            {paused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
          </button>
        ) : null}
      </div>
    </div>
  )
}
