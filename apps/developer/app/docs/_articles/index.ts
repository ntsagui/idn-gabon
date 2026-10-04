import type { ComponentType } from "react"

import BetterAuth from "./better-auth"
import Button from "./bouton-idn"
import ApiKeys from "./cles-api"
import Quickstart from "./demarrage-rapide"
import RegisterApp from "./enregistrer-une-application"
import Javascript from "./javascript"
import Loa from "./niveaux-de-garantie"
import Scopes from "./scopes"
import SdkCore from "./sdk-core"
import SdkReact from "./sdk-react"
import Security from "./securite"
import Webhooks from "./webhooks"

/** Slug → contenu. Le sommaire (titres, ordre) vit dans meta.ts. */
export const ARTICLE_COMPONENTS: Record<string, ComponentType> = {
  "demarrage-rapide": Quickstart,
  "enregistrer-une-application": RegisterApp,
  "better-auth": BetterAuth,
  javascript: Javascript,
  scopes: Scopes,
  "niveaux-de-garantie": Loa,
  "sdk-react": SdkReact,
  "sdk-core": SdkCore,
  "bouton-idn": Button,
  webhooks: Webhooks,
  "cles-api": ApiKeys,
  securite: Security,
}
