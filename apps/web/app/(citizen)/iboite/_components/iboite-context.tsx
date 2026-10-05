"use client"

import * as React from "react"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { FunctionReturnType } from "convex/server"

export type Tab = "emails" | "courriers" | "colis"
export type LetterFolder = "inbox" | "pending" | "sent" | "trash"
export type MessageFolder = "inbox" | "starred" | "archive" | "sent" | "trash"
export type IBoiteAccount = FunctionReturnType<typeof api.iboite.accounts.listMine>[number]

const STORAGE_KEY = "iboite.activeAccountId"

type Ctx = {
  accounts: IBoiteAccount[] | undefined
  /** Compte actif résolu (id mémorisé s’il existe encore, sinon le premier). */
  account: IBoiteAccount | undefined
  setActiveAccountId: (id: string) => void
  tab: Tab
  setTab: (t: Tab) => void
  emailFolder: MessageFolder
  setEmailFolder: (f: MessageFolder) => void
  letterFolder: LetterFolder
  setLetterFolder: (f: LetterFolder) => void
  search: string
  setSearch: (s: string) => void
}

const IBoiteContext = React.createContext<Ctx | null>(null)

/**
 * État partagé d’iBoîte (équivalent de apps/mobile/src/lib/iboite-active-account.tsx) :
 * boîte active mémorisée dans le navigateur, onglet et dossiers ouverts. Posé
 * dans le layout, il survit au passage liste → lecture → liste.
 */
export function IBoiteProvider({ children }: { children: React.ReactNode }) {
  const accounts = useQuery(api.iboite.accounts.listMine)
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [tab, setTab] = React.useState<Tab>("emails")
  const [emailFolder, setEmailFolder] = React.useState<MessageFolder>("inbox")
  const [letterFolder, setLetterFolder] = React.useState<LetterFolder>("inbox")
  const [search, setSearch] = React.useState("")

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setActiveId(stored)
    } catch {
      // stockage indisponible : premier compte par défaut
    }
  }, [])

  const setActiveAccountId = React.useCallback((id: string) => {
    setActiveId(id)
    try {
      window.localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // la sélection reste effective en mémoire
    }
  }, [])

  const account = accounts?.find((a) => a._id === activeId) ?? accounts?.[0]

  const value = React.useMemo<Ctx>(
    () => ({
      accounts,
      account,
      setActiveAccountId,
      tab,
      setTab,
      emailFolder,
      setEmailFolder,
      letterFolder,
      setLetterFolder,
      search,
      setSearch,
    }),
    [accounts, account, setActiveAccountId, tab, emailFolder, letterFolder, search]
  )
  return <IBoiteContext.Provider value={value}>{children}</IBoiteContext.Provider>
}

export function useIBoite(): Ctx {
  const ctx = React.useContext(IBoiteContext)
  if (!ctx) throw new Error("useIBoite doit être appelé sous IBoiteProvider.")
  return ctx
}
