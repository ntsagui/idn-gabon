import * as React from "react"
import type { Metadata } from "next"

import { pages } from "../../_content/fr"
import { QueueWorkspace } from "./_components/workspace"

export const metadata: Metadata = { title: pages.queue.title }

/**
 * File de demandes en maître-détail. Sélection, filtre et recherche vivent
 * dans l'URL (`?id`, `?status`, `?q`, `?page`) : recharger la page ne perd
 * pas le dossier ouvert.
 */
export default function QueuePage() {
  return (
    <React.Suspense fallback={null}>
      <QueueWorkspace />
    </React.Suspense>
  )
}
