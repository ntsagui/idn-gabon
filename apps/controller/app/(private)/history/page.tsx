import * as React from "react"
import type { Metadata } from "next"

import { pages } from "../../_content/fr"
import { HistoryTable } from "./_components/history-table"

export const metadata: Metadata = { title: pages.history.title }

export default function HistoryPage() {
  return (
    <React.Suspense fallback={null}>
      <HistoryTable />
    </React.Suspense>
  )
}
