import type { Metadata } from "next"

import { pages } from "../../_content/fr"
import { ScanStation } from "./_components/scan-station"

export const metadata: Metadata = { title: pages.scan.title }

export default function ScanPage() {
  return <ScanStation />
}
