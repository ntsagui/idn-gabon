import { administrationVerifyApiUrl } from "@/lib/official-act-verification"

import { Scanner } from "./_components/scanner"

// L'adresse du backend de vérification se lit à l'exécution (variable du service), jamais au build.
export const dynamic = "force-dynamic"

/** « Vérifier un acte officiel » : transposition web de apps/mobile/src/app/scanner.tsx. */
export default function ScannerPage() {
  return <Scanner apiBaseUrl={administrationVerifyApiUrl(process.env)} />
}
