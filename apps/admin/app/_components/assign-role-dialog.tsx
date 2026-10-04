"use client"

import { useEffect, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { ConvexError } from "convex/values"
import { Search, UserPlus } from "lucide-react"
import { toast } from "sonner"

import { api } from "@repo/backend/convex/_generated/api"
import { Button } from "@repo/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog"
import { Input } from "@repo/ui/components/input"
import { Label } from "@repo/ui/components/label"
import { LoABadge } from "@repo/ui/components/loa-badge"
import { cn } from "@repo/ui/lib/utils"

import { ROLE_LABEL, ROLES, type Role } from "../_lib/labels"

const CONSEQUENCE: Record<Role, string> = {
  admin:
    "Accès complet à cette console : comptes, codes provisoires, applications, rôles et journaux.",
  identity_controller:
    "Accès au portail de contrôle : file des dossiers KYC, examen et vérification d'identité.",
  developer:
    "Accès au portail développeur, limité à la Sandbox tant que vous ne l'avez pas validé pour la production.",
}

/**
 * Attribuer un rôle à un compte existant : recherche (email, nom, ID IDN,
 * NIP), choix du rôle, conséquence explicite, puis confirmation.
 */
export function AssignRoleDialog({ defaultRole }: { defaultRole?: Role }) {
  const assign = useMutation(api.admin.roles.assign)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [term, setTerm] = useState("")
  const [picked, setPicked] = useState<{ userId: string; label: string } | null>(null)
  const [role, setRole] = useState<Role>(defaultRole ?? "identity_controller")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setTerm(input.trim()), 300)
    return () => clearTimeout(id)
  }, [input])

  const search = useQuery(
    api.admin.users.searchProfiles,
    open && term.length >= 2 ? { q: term, limit: 8 } : "skip",
  )

  const reset = () => {
    setInput("")
    setTerm("")
    setPicked(null)
    setRole(defaultRole ?? "identity_controller")
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!picked) return
    setBusy(true)
    try {
      await assign({ userId: picked.userId, role })
      toast.success(`Rôle ${ROLE_LABEL[role]} attribué à ${picked.label}.`)
      setOpen(false)
      reset()
    } catch (err) {
      const msg =
        err instanceof ConvexError
          ? ((err.data as { message?: string })?.message ?? "Attribution impossible.")
          : "Attribution impossible."
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus aria-hidden />
          Attribuer un rôle
        </Button>
      </DialogTrigger>
      <DialogContent className="shadow-none sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Attribuer un rôle</DialogTitle>
          <DialogDescription>
            La recherche porte sur les comptes dotés d&apos;un profil citoyen.
            Pour un nouvel agent, utilisez « Créer un compte opérateur ».
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="assign-search">Compte</Label>
            {picked ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-idn-border px-3 py-2">
                <span className="text-sm font-medium text-idn-ink">{picked.label}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPicked(null)}>
                  Changer
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-idn-muted" />
                  <Input
                    id="assign-search"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="E-mail, nom, ID IDN ou NIP"
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
                {term.length >= 2 ? (
                  <ul
                    aria-label="Comptes trouvés"
                    className="max-h-56 overflow-y-auto rounded-md border border-idn-border"
                  >
                    {search === undefined ? (
                      <li className="px-3 py-2 text-[13px] text-idn-muted">Recherche…</li>
                    ) : search.results.length === 0 ? (
                      <li className="px-3 py-2 text-[13px] text-idn-muted">Aucun compte trouvé.</li>
                    ) : (
                      search.results.map((r) => {
                        const label = r.name ?? r.email
                        return (
                          <li key={r.userId} className="border-b border-idn-border-soft last:border-0">
                            <button
                              type="button"
                              onClick={() => setPicked({ userId: r.userId, label })}
                              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left outline-none hover:bg-idn-surface-2 focus-visible:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-idn-green"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[13px] font-medium text-idn-ink">{label}</span>
                                <span className="block truncate font-mono text-[11px] text-idn-muted">
                                  {r.name ? r.email : (r.idnId ?? r.userId)}
                                </span>
                              </span>
                              <LoABadge level={r.loa as 1 | 2 | 3} compact />
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                ) : null}
              </>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">Rôle</legend>
            <div className="grid gap-2">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border px-3 py-2.5",
                    role === r ? "border-idn-green bg-idn-green-soft/50 dark:bg-[#0F2A18]" : "border-idn-border",
                  )}
                >
                  <input
                    type="radio"
                    name="assign-role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 accent-[#0E7C3A]"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-idn-ink">{ROLE_LABEL[r]}</span>
                    <span className="block text-xs text-idn-muted">{CONSEQUENCE[r]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" disabled={!picked || busy}>
              {busy ? "Attribution…" : "Attribuer le rôle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
