import { redirect } from "next/navigation"

/** Route du mobile ; le web garde une seule adresse : /settings/notifications. */
export default function NotificationPreferencesRedirect() {
  redirect("/settings/notifications")
}
