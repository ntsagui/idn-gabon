import * as React from "react"
import type { Metadata } from "next"

import { pages } from "../../_content/fr"
import { Agenda } from "./_components/agenda"

export const metadata: Metadata = { title: pages.agenda.title }

export default function AgendaPage() {
  return (
    <React.Suspense fallback={null}>
      <Agenda />
    </React.Suspense>
  )
}
