"use client"

import * as React from "react"

import { cn } from "@repo/ui/lib/utils"

import { A4_H, A4_W, renderTemplate } from "./cv-templates"

/**
 * Aperçu A4 d'un CV — wrapper de mise à l'échelle.
 *
 * Les templates dans `./cv-templates.tsx` sont rendus à leur taille A4
 * native (794×1123 @ 96dpi) avec de vraies tailles de typographie
 * (text-sm, text-xl, etc.) — exactement comme les exports PDF.
 *
 * Ce composant scale ensuite la page à la largeur cible (`scale` prop).
 * Par défaut on rend à 1 (taille native A4). Pour une vignette : passer
 * `scale={0.4}` (≈ 320×452) ou utiliser `targetWidth` pour calculer auto.
 *
 * Le rendu PDF imprimable est produit côté serveur via `cv.export.renderPdf`.
 */

export interface PreviewCv {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  summary: string
  portfolioUrl?: string
  linkedinUrl?: string
  activeTheme?: string
  experiences: Array<{
    id: string
    title: string
    company: string
    startDate: string
    endDate?: string
    current: boolean
    description: string
  }>
  education: Array<{
    id: string
    degree: string
    school: string
    year: string
    description?: string
  }>
  skills: Array<{ id: string; name: string; level: string }>
  languages: Array<{ id: string; name: string; level: string }>
  hobbies: string[]
}

export function CvPreviewA4({
  cv,
  themeId,
  scale,
  targetWidth,
  className,
  label,
}: {
  cv: PreviewCv
  /** Si non fourni, utilise `cv.activeTheme`. */
  themeId?: string
  /** Facteur d'échelle directe (par défaut : taille native A4). */
  scale?: number
  /**
   * Largeur cible en pixels — calcule automatiquement le scale pour que
   * la page A4 tienne dans cette largeur. Prioritaire sur `scale`.
   */
  targetWidth?: number
  className?: string
  /** Nom accessible de l'aperçu (l'intérieur est une image du document). */
  label?: string
}) {
  const id = themeId ?? cv.activeTheme ?? "modern"
  const effectiveScale =
    typeof targetWidth === "number" ? targetWidth / A4_W : (scale ?? 1)
  const renderedW = A4_W * effectiveScale
  const renderedH = A4_H * effectiveScale

  return (
    <div
      role="img"
      aria-label={label ?? "Aperçu du CV"}
      className={cn("relative overflow-hidden border border-idn-border bg-white", className)}
      style={{ width: renderedW, height: renderedH }}
    >
      <div
        style={{
          width: A4_W,
          height: A4_H,
          transform: `scale(${effectiveScale})`,
          transformOrigin: "top left",
        }}
      >
        {renderTemplate(id, cv)}
      </div>
    </div>
  )
}
