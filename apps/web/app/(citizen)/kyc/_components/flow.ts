"use client"

import { useSearchParams } from "next/navigation"
import { ConvexError } from "convex/values"

import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { cleanError } from "@/app/_components/idn/dialog"
import { isAllowedReturnTo } from "@/lib/kyc-flow"

/** Statuts d'un dossier envoyé que le citoyen suit sans pouvoir le modifier. */
export const IN_REVIEW = ["submitted", "under_review"]

/**
 * Paramètres du parcours portés par l'URL : niveau visé (`target`, comme le
 * mobile) et retour vers une app partenaire (`return_to`, parcours délégué
 * ouvert depuis /oauth/authorize, validé par la liste blanche de lib/kyc-flow).
 */
export function useKycFlow() {
  const params = useSearchParams()
  const rawTarget = params.get("target")
  const target = rawTarget === "3" ? 3 : rawTarget === "2" ? 2 : undefined
  const rawReturn = params.get("return_to")
  const returnTo = rawReturn && isAllowedReturnTo(rawReturn) ? rawReturn : null

  /** Lien interne au parcours qui conserve `target` et `return_to`. */
  function href(path: string, extra?: Record<string, string>) {
    const p = new URLSearchParams()
    if (target) p.set("target", String(target))
    if (returnTo) p.set("return_to", returnTo)
    for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v)
    const s = p.toString()
    return s ? `${path}?${s}` : path
  }

  return { target, returnTo, href } as const
}

/** Message lisible d'une erreur Convex (ConvexError) ou réseau. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string } | undefined
    if (data?.message) return data.message
  }
  if (err instanceof Error && err.message) return cleanError(err.message)
  return fallback
}

/** Envoie une image vers l'URL d'upload Convex Storage (équivalent de lib/storage-upload du mobile). */
export async function uploadToStorage(uploadUrl: string, image: Blob): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": image.type || "image/jpeg" },
    body: image,
  })
  if (!res.ok) throw new Error("Envoi de la photo impossible. Réessaie.")
  const { storageId } = (await res.json()) as { storageId: Id<"_storage"> }
  return storageId
}
