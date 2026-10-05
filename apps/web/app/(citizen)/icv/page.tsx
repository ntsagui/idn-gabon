"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Card, Note, Row, ScreenTitle, SectionTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Screen } from "@/app/_components/idn/screen"

import { CvPreviewA4, type PreviewCv } from "./_components/cv-preview-a4"
import { CvSelector } from "./_components/cv-selector"
import { CvLoading, plural } from "./_components/cv-ui"
import { PdfButton, useCanShareFiles, useCvPdf } from "./_components/pdf"
import { ScoreRing } from "./_components/score-ring"
import { ThemeChips, normalizeTheme } from "./_components/theme-picker"
import { useActiveCv } from "./_hooks/use-active-cv"

type SectionKey = "experience" | "education" | "skill" | "info" | "language" | "hobby"

const SECTIONS: { key: SectionKey; label: string; icon: IconName }[] = [
  { key: "info", label: "Tes informations", icon: "user" },
  { key: "experience", label: "Expériences", icon: "briefcase" },
  { key: "education", label: "Formation", icon: "cap" },
  { key: "skill", label: "Compétences", icon: "star" },
  { key: "language", label: "Langues", icon: "globe" },
  { key: "hobby", label: "Centres d’intérêt", icon: "heart" },
]

const IMPACT: Record<string, string> = { high: "Impact élevé", medium: "Impact moyen", low: "Impact faible" }

/** Largeur disponible d'un conteneur (aperçu A4 à l'échelle). */
function useWidth(el: HTMLElement | null) {
  const [w, setW] = React.useState(0)
  React.useLayoutEffect(() => {
    if (!el) return
    const update = () => setW(el.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [el])
  return w
}

/**
 * Accueil iCV (apps/mobile/src/app/icv/index.tsx) : CV actif, thèmes,
 * aperçu, score et rubriques, partage du PDF.
 */
export default function ICVHome() {
  const router = useRouter()
  const params = useSearchParams()
  const { cvs, activeCvId, activeCv, setActiveCvId, isLoading } = useActiveCv()
  const fullCv = useQuery(api.cv.profile.get, activeCvId ? { cvId: activeCvId } : "skip")
  const scoreData = useQuery(api.cv.score.get, activeCvId ? { cvId: activeCvId } : "skip")
  const pdf = useCvPdf(activeCvId, activeCv?.name)
  const canShare = useCanShareFiles()
  const [previewEl, setPreviewEl] = React.useState<HTMLDivElement | null>(null)
  const previewWidth = useWidth(previewEl)

  // ?cv=… : bascule sur ce CV.
  const cvParam = params.get("cv")
  React.useEffect(() => {
    if (cvParam && cvs?.some((c) => c._id === cvParam)) {
      setActiveCvId(cvParam as Id<"citizenCv">)
      router.replace("/icv", { scroll: false })
    }
  }, [cvParam, cvs, setActiveCvId, router])

  if (isLoading) return <CvLoading title="iCV" back="/dashboard" />
  if (!cvs || cvs.length === 0) return <EmptyState />
  if (!activeCvId || !activeCv) return <CvLoading title="iCV" back="/dashboard" />

  const counts: Record<SectionKey, string> = {
    info: `Complètes à ${contactPercent(fullCv)} %`,
    experience: plural(fullCv?.experiences.length ?? 0, "expérience", "expériences", "Aucune expérience"),
    education: plural(fullCv?.education.length ?? 0, "formation", "formations", "Aucune formation"),
    skill: plural(fullCv?.skills.length ?? 0, "compétence", "compétences", "Aucune compétence"),
    language: plural(fullCv?.languages.length ?? 0, "langue", "langues", "Aucune langue"),
    hobby: plural(fullCv?.hobbies.length ?? 0, "centre d’intérêt", "centres d’intérêt", "Aucun centre d’intérêt"),
  }

  return (
    <Screen
      width="wide"
      header={<AppBar title="iCV" back="/dashboard" right={<PdfButton cvId={activeCvId} fileName={activeCv.name} />} />}
      footer={
        <div className="lg:max-w-[calc(100%-392px)]">
          <IdnButton
            full
            onClick={() => void pdf.share()}
            loading={pdf.pending === "share"}
            leadIcon={<Icon name={canShare ? "share" : "download"} size={18} />}
          >
            {canShare ? "Partager mon CV" : "Télécharger mon CV"}
          </IdnButton>
          {pdf.errorDialog}
        </div>
      }
    >
      <div className="grid gap-x-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 lg:col-start-1">
          <CvSelector active={activeCv} />
          {fullCv ? <CivilNameHint cvId={activeCvId} firstName={fullCv.firstName} lastName={fullCv.lastName} /> : null}
          <SectionTitle action="Galerie" actionHref={`/icv/themes?cv=${activeCvId}`}>
            Thème
          </SectionTitle>
          <ThemeChips cvId={activeCvId} activeTheme={normalizeTheme(activeCv.activeTheme)} />
        </div>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-6">
            <div ref={setPreviewEl} className="mt-4 flex justify-center rounded-[14px] bg-idn-surface-2 p-3">
              {fullCv && previewWidth > 0 ? (
                <CvPreviewA4 cv={fullCv as PreviewCv} themeId={normalizeTheme(activeCv.activeTheme)} targetWidth={Math.min(previewWidth - 24, 360)} />
              ) : (
                <div className="flex h-80 items-center justify-center">
                  <IdnLottie name="loader" size={56} loop label="Chargement de l’aperçu" />
                </div>
              )}
            </div>
            <Note center>Aperçu du thème choisi. Le PDF exporté suit une mise en page unique.</Note>
          </div>
        </div>

        <div className="min-w-0 lg:col-start-1">
          <SectionTitle>Ton score</SectionTitle>
          <Card>
            <ScoreRing score={scoreData?.score ?? activeCv.completionScore} level={scoreData?.level ?? "Débutant"} />
            {(scoreData?.suggestions ?? []).map((s) => (
              <Row key={s.id} icon="sparkles" tone="green" title={s.title} sub={IMPACT[s.impact] ?? undefined} />
            ))}
          </Card>
          {scoreData && scoreData.suggestions.length === 0 ? <Note>Aucune suggestion pour l’instant : ton CV est bien rempli.</Note> : null}

          <SectionTitle>Rubriques du CV</SectionTitle>
          <Card>
            {SECTIONS.map((s) => (
              <Row key={s.key} icon={s.icon} title={s.label} sub={counts[s.key]} chevron href={`/icv/edit?section=${s.key}&cv=${activeCvId}`} />
            ))}
          </Card>

          <SectionTitle>Aller plus loin</SectionTitle>
          <Card>
            <Row icon="sparkles" tone="green" title="Studio et outils IA" sub="Aperçu détaillé, résumé, lettre, score ATS" chevron href="/icv/studio" />
            <Row icon="upload" title="Importer un CV" sub="PDF ou image, 5 Mo maximum" chevron href="/icv/import" />
            <Row icon="folder" title="Mes CV" sub={plural(cvs.length, "CV", "CV", "Aucun CV")} chevron href="/icv/list" />
          </Card>
        </div>
      </div>
    </Screen>
  )
}

function contactPercent(cv: { firstName: string; lastName: string; email: string; phone: string } | null | undefined): number {
  if (!cv) return 0
  const filled = [cv.firstName, cv.lastName, cv.email, cv.phone].filter((s) => s.trim().length > 0).length
  return Math.round((filled / 4) * 100)
}

function EmptyState() {
  return (
    <Screen
      header={<AppBar title="iCV" back="/dashboard" />}
      footer={
        <>
          <IdnButton href="/icv/create" full leadIcon={<Icon name="plus" size={18} />}>
            Crée ton CV
          </IdnButton>
          <IdnButton href="/icv/import" full variant="ghost" leadIcon={<Icon name="upload" size={18} />}>
            Importer un CV existant
          </IdnButton>
        </>
      }
    >
      <div className="mt-8 flex flex-col items-center">
        <IdnLottie name="icv" size={140} label="iCV" />
        <ScreenTitle
          center
          title="Ton CV professionnel, en quelques minutes"
          lead="6 thèmes, des outils d’IA pour rédiger, un score de compatibilité ATS et l’export en PDF."
        />
      </div>
    </Screen>
  )
}

/**
 * Un CV vierge est pré-rempli par le backend avec le nom du compte, qui est
 * l'identifiant @idn.ga (« nadia.ekomie »). On propose en un geste le nom
 * d'état civil du profil, sans rien écrire d'office.
 */
function CivilNameHint({ cvId, firstName, lastName }: { cvId: Id<"citizenCv">; firstName: string; lastName: string }) {
  const me = useQuery(api.profile.getCurrentUser)
  const upsert = useMutation(api.cv.profile.upsert)
  const [saving, setSaving] = React.useState(false)
  const pivot = me?.profile?.pivot
  const handle = me?.email?.split("@")[0] ?? ""
  const looksTechnical = !firstName.trim() || firstName === handle || (!lastName.trim() && firstName.includes("."))
  if (!pivot || !looksTechnical || (firstName === pivot.firstName && lastName === pivot.lastName)) return null
  const civil = `${pivot.firstName} ${pivot.lastName}`
  return (
    <Card padded className="mt-3 border-transparent bg-c-yellow-badge">
      <Row icon="user" tone="yellow" title={`Ton CV affiche « ${[firstName, lastName].filter(Boolean).join(" ") || "aucun nom"} »`} sub={`Utilise ton nom d’état civil : ${civil}.`} />
      <IdnButton
        variant="secondary"
        full
        loading={saving}
        onClick={async () => {
          setSaving(true)
          try {
            await upsert({ cvId, patch: { firstName: pivot.firstName, lastName: pivot.lastName } })
          } finally {
            setSaving(false)
          }
        }}
      >
        {`Utiliser « ${civil} »`}
      </IdnButton>
    </Card>
  )
}
