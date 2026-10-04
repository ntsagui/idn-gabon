import * as React from "react"
import type { Metadata } from "next"

import { SignInGate } from "./_components/sign-in-gate"

export const metadata: Metadata = { title: "Connexion" }

export default function SignInPage() {
  return (
    <React.Suspense fallback={<div className="min-h-svh bg-idn-bg" />}>
      <SignInGate />
    </React.Suspense>
  )
}
