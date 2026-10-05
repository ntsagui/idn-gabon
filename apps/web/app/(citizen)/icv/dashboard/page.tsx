"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { CvLoading } from "../_components/cv-ui"

/**
 * Le contenu du tableau de bord (score, suggestions, rubriques) est sur
 * l'accueil `/icv`, comme sur mobile : ancienne adresse redirigée.
 */
export default function ICVDashboardRedirect() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/icv")
  }, [router])
  return <CvLoading title="iCV" />
}
