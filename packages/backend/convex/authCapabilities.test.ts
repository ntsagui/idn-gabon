/// <reference types="vite/client" />
import { register as registerBetterAuth } from "@convex-dev/better-auth/test"
import { convexTest } from "convex-test"
import { describe, expect, test } from "vitest"

import { api } from "./_generated/api"
import { componentHasModel } from "./authCapabilities"
import schema from "./schema"

const modules = import.meta.glob("/convex/**/*.ts")

function makeTestClient() {
  const t = convexTest(schema, modules)
  registerBetterAuth(t, "betterAuth")
  return t
}

describe("authCapabilities", () => {
  test("la sonde reconnaît un modèle que le composant porte réellement", async () => {
    // Garde-fou du test suivant : sans elle, un composant mal enregistré
    // ferait aussi répondre `false` et le test passerait pour de mauvaises raisons.
    const t = makeTestClient()
    expect(await t.run((ctx) => componentHasModel(ctx, "user"))).toBe(true)
  })

  test("annonce les clés d'accès indisponibles tant que le composant n'a pas de table passkey", async () => {
    // Les clients se fient à cette réponse pour ne pas appeler les routes
    // /passkey/* qui répondraient 500 : un `true` à tort produirait une erreur
    // réseau à chaque ouverture du Profil.
    const t = makeTestClient()
    expect(await t.query(api.authCapabilities.get, {})).toEqual({ passkeys: false })
  })
})
