import { createApi, convexAdapter } from "@convex-dev/better-auth"
import { convex } from "@convex-dev/better-auth/plugins"
import { passkey } from "@better-auth/passkey"
import type { BetterAuthOptions } from "better-auth/minimal"
import { anonymous } from "better-auth/plugins/anonymous"
import { bearer } from "better-auth/plugins/bearer"
import { emailOTP } from "better-auth/plugins/email-otp"
import { genericOAuth } from "better-auth/plugins/generic-oauth"
import { jwt } from "better-auth/plugins/jwt"
import { magicLink } from "better-auth/plugins/magic-link"
import { oidcProvider } from "better-auth/plugins/oidc-provider"
import { oneTimeToken } from "better-auth/plugins/one-time-token"
import { phoneNumber } from "better-auth/plugins/phone-number"
import { twoFactor } from "better-auth/plugins/two-factor"
import { username } from "better-auth/plugins/username"

import schema from "./schema"

// Options statiques dont l'adaptateur ne lit que la description des tables
// (champs uniques, références). Reprises de `auth-options.ts` du composant
// par défaut, plus `passkey()`. Volontairement découplées de `../auth.ts` :
// importer `createAuth` ici exigerait ses variables d'environnement.
const options = {
  database: convexAdapter({} as any, {} as any),
  rateLimit: { storage: "database" },
  plugins: [
    twoFactor(),
    anonymous(),
    username(),
    phoneNumber(),
    magicLink({ sendMagicLink: async () => {} }),
    emailOTP({ sendVerificationOTP: async () => {} }),
    genericOAuth({ config: [{ clientId: "", clientSecret: "", providerId: "" }] }),
    oidcProvider({ loginPage: "/login", __skipDeprecationWarning: true }),
    bearer(),
    oneTimeToken(),
    jwt(),
    passkey(),
    convex({ authConfig: { providers: [{ applicationID: "convex", domain: "" }] } }),
  ],
} as BetterAuthOptions

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, () => options)
