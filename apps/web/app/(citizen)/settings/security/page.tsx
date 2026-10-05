import { SecurityScreen } from "../_components/security-screen"

/** `?action=pin` (rangée « Changer le code PIN » du Profil) ouvre directement la saisie. */
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams
  return <SecurityScreen initialAction={action} />
}
