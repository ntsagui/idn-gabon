import { redirect } from "next/navigation"

/** L'ancienne page Paramètres à onglets est remplacée par l'onglet Profil et ses sous-écrans. */
export default function SettingsPage() {
  redirect("/profile")
}
