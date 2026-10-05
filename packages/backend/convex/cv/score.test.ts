import { describe, expect, test } from "vitest"

import type { Doc } from "../_generated/dataModel"
import { buildSuggestions } from "./score"

const VOUVOIEMENT = /\b(vous|votre|vos)\b|ez\b/i

function cv(over: Partial<Doc<"citizenCv">> = {}): Doc<"citizenCv"> {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    summary: "",
    experiences: [],
    education: [],
    skills: [],
    languages: [],
    ...over,
  } as unknown as Doc<"citizenCv">
}

describe("cv.score.buildSuggestions", () => {
  // Web et mobile tutoient le citoyen : une suggestion au vouvoiement
  // détonnerait au milieu de l'écran iCV.
  test.each([
    ["CV vide", cv()],
    ["une expérience, une compétence", cv({ experiences: [{}] as never, skills: [{}] as never })],
  ])("%s : toutes les suggestions tutoient", (_label, doc) => {
    const titles = buildSuggestions(doc).map((s) => s.title)
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) expect(title).not.toMatch(VOUVOIEMENT)
  })

  test("les suggestions restent triées par impact et limitées à 5", () => {
    const list = buildSuggestions(cv())
    const rank = { high: 0, medium: 1, low: 2 }
    expect(list.length).toBeLessThanOrEqual(5)
    expect(list.map((s) => rank[s.impact])).toEqual([...list.map((s) => rank[s.impact])].sort())
  })
})
