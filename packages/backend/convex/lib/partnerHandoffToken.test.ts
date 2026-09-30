import { crossDomain } from "@convex-dev/better-auth/plugins"
import { describe, expect, it } from "vitest"

import { partnerHandoffOneTimeToken } from "./partnerHandoffToken"

/** Reproduit la fusion de Better Auth : une clé déclarée plus tard écrase la précédente. */
function mergedPaths(plugins: { endpoints?: Record<string, unknown> }[]) {
  const endpoints = plugins.reduce<Record<string, unknown>>(
    (acc, plugin) => ({ ...acc, ...plugin.endpoints }),
    {},
  )
  return Object.values(endpoints).map(
    (endpoint) => (endpoint as { path: string }).path,
  )
}

describe("partnerHandoffOneTimeToken", () => {
  it("garde /one-time-token/verify quand crossDomain est enregistré après", () => {
    const paths = mergedPaths([
      partnerHandoffOneTimeToken(),
      crossDomain({ siteUrl: "https://identite.ga" }),
    ])

    expect(paths).toContain("/one-time-token/generate")
    expect(paths).toContain("/one-time-token/verify")
    expect(paths).toContain("/cross-domain/one-time-token/verify")
  })
})
