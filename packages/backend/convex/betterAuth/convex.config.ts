import { defineComponent } from "convex/server"

// Même nom que le composant npm qu'il remplace : les tables (et donc les
// comptes, sessions, clients OIDC existants) restent dans le même espace.
const component = defineComponent("betterAuth")

export default component
