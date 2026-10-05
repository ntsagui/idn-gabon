import { PrivacyScreen } from "../_components/privacy-screen"

/** `?action=delete` (bouton « Supprimer mon compte » du Profil) ouvre directement la confirmation. */
export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ action?: string }> }) {
  const { action } = await searchParams
  return <PrivacyScreen initialAction={action} />
}
