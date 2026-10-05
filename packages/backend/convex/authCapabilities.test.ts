/// <reference types="vite/client" />
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"

import { api } from "./_generated/api"
import { componentHasModel } from "./authCapabilities"
import authSchema from "./betterAuth/schema"
import schema from "./schema"

const modules = import.meta.glob("/convex/**/*.ts")

// Composant local réel (et non celui de `@convex-dev/better-auth/test`, qui
// n'a pas de table passkey) : c'est lui qui part en production.
function makeTestClient() {
  const t = convexTest(schema, modules)
  t.registerComponent("betterAuth", authSchema, import.meta.glob("/convex/betterAuth/**/*.ts"))
  return t
}

describe("authCapabilities", () => {
  test("la sonde reconnaît un modèle que le composant porte réellement", async () => {
    // Garde-fou du test suivant : sans elle, un composant mal enregistré
    // ferait aussi répondre `false` et le test passerait pour de mauvaises raisons.
    const t = makeTestClient()
    expect(await t.run((ctx) => componentHasModel(ctx, "user"))).toBe(true)
  })

  test("annonce les clés d'accès disponibles dès que le composant porte la table passkey", async () => {
    // Les clients masquent Face ID / Touch ID tant que cette réponse est
    // `false` : si le composant local perdait sa table passkey, l'enrôlement
    // disparaîtrait silencieusement des apps.
    const t = makeTestClient()
    expect(await t.query(api.authCapabilities.get, {})).toEqual({ passkeys: true })
  })
})
