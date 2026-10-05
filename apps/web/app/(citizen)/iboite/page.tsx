"use client"

import { IdnLottie } from "@/app/_components/idn/lottie"
import { CenterState } from "@/app/_components/idn/screen"

import { useIBoite } from "./_components/iboite-context"

/**
 * Racine d’iBoîte. La liste est rendue par le layout ; cette page n’occupe
 * que le panneau de lecture du grand écran, vide tant que rien n’est ouvert.
 */
export default function IBoitePage() {
  const { tab, account } = useIBoite()
  if (!account) return null
  return (
    <CenterState className="pt-24" visual={<IdnLottie name="iboite" size={120} label="iBoîte" />} title={tab === "courriers" ? "Sélectionne un courrier" : "Sélectionne un message"}>
      Son contenu s’affichera ici.
    </CenterState>
  )
}
