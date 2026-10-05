import { v } from "convex/values"

import { query } from "../_generated/server"
import type { Doc } from "../_generated/dataModel"
import { requireVerifiedAuth } from "../lib/auth"
import { scoreToLevel } from "./shared"

/**
 * iCV — Score de complétion + suggestions par CV.
 * Cf. SPECS_FEATURE_ICV.md §7.3 (suggestions ordonnées par impact).
 */

const LEVEL = v.union(
  v.literal("Débutant"),
  v.literal("Bon"),
  v.literal("Expert"),
)

const SUGGESTION = v.object({
  id: v.string(),
  title: v.string(),
  impact: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
})

const SCORE_OUT = v.object({
  score: v.number(),
  level: LEVEL,
  suggestions: v.array(SUGGESTION),
})

/** Suggestions au tutoiement, comme toute l'interface citoyenne (web et mobile). */
export function buildSuggestions(cv: Doc<"citizenCv">) {
  const out: Array<{ id: string; title: string; impact: "high" | "medium" | "low" }> = []

  const hasCoords =
    cv.firstName.trim().length > 0 &&
    cv.lastName.trim().length > 0 &&
    cv.email.trim().length > 0 &&
    cv.phone.trim().length > 0
  if (!hasCoords) {
    out.push({
      id: "complete_contact",
      title: "Complète tes coordonnées",
      impact: "high",
    })
  }

  if (cv.summary.trim().length < 50) {
    out.push({
      id: "write_summary",
      title: "Rédige un résumé professionnel (50 caractères minimum)",
      impact: "high",
    })
  }

  if (cv.experiences.length === 0) {
    out.push({
      id: "add_experience",
      title: "Ajoute ta première expérience",
      impact: "high",
    })
  } else if (cv.experiences.length === 1) {
    out.push({
      id: "add_more_experience",
      title: "Ajoute une seconde expérience pour étoffer ton parcours",
      impact: "medium",
    })
  }

  if (cv.education.length === 0) {
    out.push({
      id: "add_education",
      title: "Ajoute une formation",
      impact: "high",
    })
  }

  if (cv.skills.length < 3) {
    out.push({
      id: "add_skills",
      title:
        cv.skills.length === 0
          ? "Ajoute tes compétences principales (3 minimum)"
          : "Complète à au moins 3 compétences",
      impact: "medium",
    })
  }

  if (cv.languages.length === 0) {
    out.push({
      id: "add_languages",
      title: "Ajoute les langues que tu parles",
      impact: "medium",
    })
  }

  if (
    (!cv.portfolioUrl || cv.portfolioUrl.trim().length === 0) &&
    (!cv.linkedinUrl || cv.linkedinUrl.trim().length === 0)
  ) {
    out.push({
      id: "add_links",
      title: "Ajoute un lien LinkedIn ou portfolio",
      impact: "low",
    })
  }

  // Tri par impact (high → medium → low), puis cap à 5 pour ne pas inonder l'UI.
  const order = { high: 0, medium: 1, low: 2 }
  out.sort((a, b) => order[a.impact] - order[b.impact])
  return out.slice(0, 5)
}

export const get = query({
  args: { cvId: v.id("citizenCv") },
  returns: v.union(SCORE_OUT, v.null()),
  handler: async (ctx, args) => {
    const user = await requireVerifiedAuth(ctx)
    const cv = await ctx.db.get(args.cvId)
    if (!cv || cv.userId !== user.userId || cv.deletedAt !== undefined) {
      return null
    }
    return {
      score: cv.completionScore,
      level: scoreToLevel(cv.completionScore),
      suggestions: buildSuggestions(cv),
    }
  },
})
