import type { Metadata } from "next"

import { pages } from "../_content/fr"
import { Dashboard } from "./_dashboard/dashboard"

export const metadata: Metadata = { title: pages.dashboard.title }

export default function DashboardPage() {
  return <Dashboard />
}
