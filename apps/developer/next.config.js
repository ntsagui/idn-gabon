import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async redirects() {
    // `/keys` renvoyait vers les identifiants OAuth de la première application :
    // les clés serveur sont désormais réunies sous `/api-keys`, les identifiants
    // OAuth dans chaque application.
    const docs = {
      "register-app": "enregistrer-une-application",
      "quickstart-react": "demarrage-rapide",
      "quickstart-better-auth": "better-auth",
      "quickstart-nextauth": "better-auth",
      "quickstart-vanilla": "javascript",
      "core-overview": "sdk-core",
      "core-api": "sdk-core",
      "react-hooks": "sdk-react",
      "react-components": "sdk-react",
      loa: "niveaux-de-garantie",
      security: "securite",
      "migration-clerk": "demarrage-rapide",
      playground: "demarrage-rapide",
    }
    return [
      { source: "/keys", destination: "/api-keys", permanent: true },
      ...Object.entries(docs).map(([from, to]) => ({
        source: `/docs/${from}`,
        destination: `/docs/${to}`,
        permanent: true,
      })),
    ]
  },
}

export default nextConfig
