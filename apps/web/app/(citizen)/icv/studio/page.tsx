"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { Card, DetailRow, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { AiResultCard } from "../_components/ai-result-card"
import { AiTools, type AiToolId } from "../_components/ai-tools"
import { CvPreviewA4, type PreviewCv } from "../_components/cv-preview-a4"
import { A4_W } from "../_components/cv-templates"
import { CvSelector } from "../_components/cv-selector"
import { CvLoading } from "../_components/cv-ui"
import { PdfButton } from "../_components/pdf"
import { ThemePicker, normalizeTheme } from "../_components/theme-picker"
import { useActiveCv } from "../_hooks/use-active-cv"

const ZOOM_STEPS = [0.6, 0.8, 1, 1.25, 1.5] as const

/**
 * Studio iCV (apps/mobile/src/app/icv/studio.tsx) : aperçu en grand, outils
 * IA, choix du thème. Sur grand écran l'aperçu occupe une colonne à part,
 * avec un zoom.
 */
export default function ICVStudio() {
  const router = useRouter()
  const params = useSearchParams()
  const { cvs, activeCvId, activeCv, setActiveCvId, isLoading } = useActiveCv()
  const fullCv = useQuery(api.cv.profile.get, activeCvId ? { cvId: activeCvId } : "skip")
  const [openResult, setOpenResult] = React.useState<AiToolId | null>(null)
  const [zoom, setZoom] = React.useState(2)
  const [box, setBox] = React.useState<HTMLDivElement | null>(null)
  const [boxWidth, setBoxWidth] = React.useState(0)

  const cvParam = params.get("cv")
  React.useEffect(() => {
    if (cvParam && cvs?.some((c) => c._id === cvParam)) {
      setActiveCvId(cvParam as Id<"citizenCv">)
      router.replace("/icv/studio", { scroll: false })
    }
  }, [cvParam, cvs, setActiveCvId, router])

  // Sans CV → état vide de /icv.
  React.useEffect(() => {
    if (!isLoading && cvs && cvs.length === 0) router.replace("/icv")
  }, [isLoading, cvs, router])

  React.useLayoutEffect(() => {
    if (!box) return
    const update = () => setBoxWidth(box.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(box)
    return () => ro.disconnect()
  }, [box])

  if (isLoading || !cvs || !activeCv || !activeCvId) return <CvLoading title="Studio" />

  const fit = Math.min(boxWidth - 24, 560)
  const previewWidth = Math.min(Math.round(fit * (ZOOM_STEPS[zoom] ?? 1)), A4_W)

  return (
    <Screen width="wide" header={<AppBar title="Studio" back="/icv" right={<PdfButton cvId={activeCvId} fileName={activeCv.name} />} />}>
      <div className="grid gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 lg:col-start-1">
          <CvSelector active={activeCv} />
        </div>

        <section aria-label="Aperçu" className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-6">
            <SectionTitle>Aperçu</SectionTitle>
            <div ref={setBox} className="overflow-auto rounded-[14px] bg-idn-surface-2 p-3 lg:max-h-[calc(100svh-180px)]">
              <div className="flex min-w-fit justify-center">
                {fullCv && boxWidth > 0 ? (
                  <CvPreviewA4 cv={fullCv as PreviewCv} themeId={normalizeTheme(activeCv.activeTheme)} targetWidth={previewWidth} />
                ) : (
                  <div className="flex h-[420px] items-center justify-center">
                    <IdnLottie name="loader" size={56} loop label="Chargement de l’aperçu" />
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2">
              <IconButton icon="minus" label="Réduire l’aperçu" onClick={() => setZoom((z) => Math.max(0, z - 1))} size={36} />
              <span aria-live="polite" className="min-w-14 text-center font-mono text-[13px] text-idn-muted">
                {Math.round((ZOOM_STEPS[zoom] ?? 1) * 100)} %
              </span>
              <IconButton icon="plus" label="Agrandir l’aperçu" onClick={() => setZoom((z) => Math.min(ZOOM_STEPS.length - 1, z + 1))} size={36} />
            </div>
          </div>
        </section>

        <div className="min-w-0 lg:col-start-1">
          <AiTools cvId={activeCvId} onResult={(tool) => (tool === "ats_check" ? router.push(`/icv/ats?cv=${activeCvId}`) : setOpenResult(tool))} />
          {openResult === "improve_summary" && fullCv ? (
            <AiResultCard cvId={activeCvId} feature="improve_summary" currentSummary={fullCv.summary} onClose={() => setOpenResult(null)} />
          ) : null}
          {openResult === "suggest_skills" ? <AiResultCard cvId={activeCvId} feature="suggest_skills" onClose={() => setOpenResult(null)} /> : null}
          {openResult === "generate_letter" ? <AiResultCard cvId={activeCvId} feature="generate_letter" onClose={() => setOpenResult(null)} /> : null}

          <ThemePicker cvId={activeCvId} activeTheme={normalizeTheme(activeCv.activeTheme)} galleryHref={`/icv/themes?cv=${activeCvId}`} />

          {fullCv ? (
            <>
              <SectionTitle>Ton profil</SectionTitle>
              <Card>
                <dl className="divide-y divide-idn-border">
                  <DetailRow label="Nom" value={`${fullCv.firstName} ${fullCv.lastName}`.trim() || "Non renseigné"} />
                  <DetailRow label="E-mail" value={fullCv.email || "Non renseigné"} />
                  <DetailRow label="Expériences" value={String(fullCv.experiences.length)} />
                  <DetailRow label="Compétences" value={String(fullCv.skills.length)} />
                </dl>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </Screen>
  )
}
