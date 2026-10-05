"use client"

import * as React from "react"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"

type Notice = { title: string; body?: string }

/**
 * Message d'information à un bouton (équivalent web des `Alert.alert(titre,
 * texte)` du mobile) : « Code PIN modifié », « Export demandé »…
 */
export function useNotice() {
  const [notice, setNotice] = React.useState<Notice | null>(null)
  const show = React.useCallback((title: string, body?: string) => setNotice({ title, body }), [])
  const element = (
    <IdnDialog open={notice !== null} onOpenChange={(o) => !o && setNotice(null)} title={notice?.title ?? ""} description={notice?.body}>
      <div className="mt-5 flex justify-end">
        <IdnButton size="sm" className="min-h-11 min-w-24" onClick={() => setNotice(null)}>
          OK
        </IdnButton>
      </div>
    </IdnDialog>
  )
  return { notice: element, show }
}
