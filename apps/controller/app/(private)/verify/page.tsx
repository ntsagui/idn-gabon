import type { Metadata } from "next"

import { pages } from "../../_content/fr"
import { ActVerifier } from "./_components/act-verifier"

export const metadata: Metadata = { title: pages.verify.title }

export default function VerifyPage() {
  return <ActVerifier />
}
