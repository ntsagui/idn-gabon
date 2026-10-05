"use client"

import * as React from "react"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { cleanError, IdnDialog } from "@/app/_components/idn/dialog"
import { ErrorNote } from "@/app/_components/idn/list"
import { PinEntry } from "@/app/_components/idn/pin"

type Phase = "check" | "new" | "confirm"

/**
 * Changement (ou création) du code PIN : PIN actuel → nouveau → confirmation,
 * comme le `PinChangeModal` du mobile. Le PIN actuel est vérifié dès sa saisie.
 */
export function PinChangeDialog({
  open,
  configured,
  onClose,
  onDone,
}: {
  open: boolean
  configured: boolean
  onClose: () => void
  onDone: () => void
}) {
  const createPin = useMutation(api.onboarding.createPin)
  const changePin = useMutation(api.onboarding.changePin)
  const verifyPin = useMutation(api.onboarding.verifyPin)
  const [phase, setPhase] = React.useState<Phase>(configured ? "check" : "new")
  const [pin, setPin] = React.useState("")
  const [currentPin, setCurrentPin] = React.useState("")
  const [newPin, setNewPin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setPhase(configured ? "check" : "new")
    setPin("")
    setCurrentPin("")
    setNewPin("")
    setError(null)
    setSubmitting(false)
  }, [open, configured])

  async function complete(value: string) {
    setError(null)
    if (phase === "check") {
      setSubmitting(true)
      try {
        const { valid } = await verifyPin({ pin: value })
        if (!valid) {
          setError("Code PIN incorrect.")
          setPin("")
          return
        }
        setCurrentPin(value)
        setPhase("new")
        setPin("")
      } catch (caught) {
        setError(caught instanceof Error ? cleanError(caught.message) : "Vérification impossible.")
        setPin("")
      } finally {
        setSubmitting(false)
      }
      return
    }
    if (phase === "new") {
      setNewPin(value)
      setPhase("confirm")
      setPin("")
      return
    }
    if (value !== newPin) {
      setError("Les deux codes sont différents.")
      setPhase("new")
      setPin("")
      setNewPin("")
      return
    }
    setSubmitting(true)
    try {
      if (configured) await changePin({ currentPin, newPin: value })
      else await createPin({ pin: value })
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? cleanError(caught.message) : "Modification impossible.")
      setPin("")
      setSubmitting(false)
    }
  }

  const title = phase === "check" ? "Ton code PIN actuel" : phase === "new" ? "Ton nouveau code PIN" : "Confirme le nouveau code"

  return (
    <IdnDialog open={open} onOpenChange={(o) => !o && !submitting && onClose()} title={configured ? "Changer le code PIN" : "Créer un code PIN"}>
      <div className="mt-4 flex flex-col items-center text-center">
        <h3 className="text-xl font-semibold text-idn-ink" aria-live="polite">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-idn-muted">6 chiffres. Évite ta date de naissance.</p>
      </div>
      <PinEntry value={pin} onChange={setPin} onComplete={(v) => void complete(v)} error={!!error} disabled={submitting} />
      <ErrorNote>{error}</ErrorNote>
    </IdnDialog>
  )
}
