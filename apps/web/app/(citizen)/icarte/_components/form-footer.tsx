import * as React from "react"

import { IdnButton } from "@/app/_components/idn/button"

/** Pied des formulaires iCarte : « Annuler » et l’action principale côte à côte. */
export function FormFooter({
  onCancel,
  submitting,
  submitLabel,
  submitIcon,
  form,
}: {
  onCancel: () => void
  submitting: boolean
  submitLabel: string
  submitIcon: React.ReactNode
  form: string
}) {
  return (
    <div className="flex gap-2.5">
      <IdnButton variant="ghost" size="lg" full className="flex-1" onClick={onCancel} disabled={submitting}>
        Annuler
      </IdnButton>
      <IdnButton type="submit" form={form} size="lg" full className="flex-1" loading={submitting} leadIcon={submitIcon}>
        {submitLabel}
      </IdnButton>
    </div>
  )
}
