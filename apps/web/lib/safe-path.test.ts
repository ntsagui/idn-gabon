import { describe, expect, it } from "vitest"

import { toInternalPath } from "./safe-path"

// `redirect_to` est lu dans l'URL de connexion : un lien piégé ne doit jamais
// renvoyer la personne, juste après sa vraie connexion IDN, vers un autre site.
describe("toInternalPath", () => {
  it.each(["/dashboard", "/oauth/authorize?client_id=a&state=b", "/kyc?return_to=x#y"])("garde le chemin interne %s", (p) => {
    expect(toInternalPath(p)).toBe(p)
  })

  it.each([
    ["//evil.com", "double barre"],
    ["/\\evil.com", "barre oblique inverse"],
    ["/%5Cevil.com", "barre inverse encodée reste un chemin interne"],
    ["/\t/evil.com", "tabulation supprimée par le navigateur"],
    ["/\n/evil.com", "saut de ligne"],
    ["https://evil.com", "URL absolue"],
    ["evil.com", "chemin relatif"],
    ["", "vide"],
  ])("refuse %j (%s)", (input, label) => {
    const out = toInternalPath(input)
    if (label.startsWith("barre inverse encodée")) {
      // Encodée, la barre inverse n'est qu'un caractère du chemin : on reste sur l'origine.
      expect(out).toBe("/%5Cevil.com")
    } else {
      expect(out).toBeNull()
    }
  })

  it("refuse null et undefined", () => {
    expect(toInternalPath(null)).toBeNull()
    expect(toInternalPath(undefined)).toBeNull()
  })
})
