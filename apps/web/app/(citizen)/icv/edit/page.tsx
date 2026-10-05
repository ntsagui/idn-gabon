"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import type { FunctionReturnType } from "convex/server"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"
import { cn } from "@repo/ui/lib/utils"

import { AppBar, IconButton } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog, cleanError } from "@/app/_components/idn/dialog"
import { Card, ErrorNote, Row, SectionTitle } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"

import { CvChips, CvField, CvLoading } from "../_components/cv-ui"

type SectionKind = "info" | "experience" | "education" | "skill" | "language" | "hobby"
const VALID_SECTIONS: SectionKind[] = ["info", "experience", "education", "skill", "language", "hobby"]
const SKILL_LEVELS = ["Débutant", "Intermédiaire", "Avancé", "Expert"] as const
const LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Natif"] as const

type CvFull = NonNullable<FunctionReturnType<typeof api.cv.profile.get>>

/**
 * Cadre d'écran fourni par l'éditeur à chaque formulaire : le formulaire
 * garde son état et ses actions, l'éditeur fournit la barre et la liste.
 */
type Frame = (children: React.ReactNode, footer: React.ReactNode) => React.ReactElement

const SAVE_FAILED = "L’enregistrement a échoué. Réessaie dans un instant."

function errText(e: unknown): string {
  return e instanceof Error && e.message ? cleanError(e.message) : SAVE_FAILED
}

/** Éditeur d'une rubrique du CV (apps/mobile/src/app/icv/edit.tsx). */
export default function ICVEdit() {
  const params = useSearchParams()
  const section = params.get("section") as SectionKind | null
  const cvParam = params.get("cv") as Id<"citizenCv"> | null
  const idParam = params.get("id")

  if (!section || !VALID_SECTIONS.includes(section) || !cvParam) {
    return (
      <Screen header={<AppBar title="iCV" back="/icv" />} footer={<IdnButton href="/icv" variant="ghost" full>Retour</IdnButton>}>
        <ErrorNote>Cette rubrique est introuvable. Reviens à ton CV et réessaie.</ErrorNote>
      </Screen>
    )
  }
  return <Editor key={`${section}-${idParam ?? "new"}`} section={section} cvId={cvParam} entryId={idParam} />
}

function Editor({ section, cvId, entryId }: { section: SectionKind; cvId: Id<"citizenCv">; entryId: string | null }) {
  const router = useRouter()
  const cv = useQuery(api.cv.profile.get, { cvId })

  if (cv === undefined) return <CvLoading title="iCV" />
  if (cv === null) {
    return (
      <Screen header={<AppBar title="iCV" back="/icv" />}>
        <ErrorNote>Impossible de charger ce CV.</ErrorNote>
      </Screen>
    )
  }

  const isEditing = entryId !== null
  const listUrl = `/icv/edit?section=${section}&cv=${cvId}`
  const back = isEditing ? listUrl : "/icv"
  const onDone = () => router.push(back)
  const showList = !isEditing && section !== "info" && section !== "hobby" && sectionItems(cv, section).length > 0
  const title = showList ? listTitleFor(section) : computeTitle(section, isEditing)

  const frame: Frame = (children, footer) => (
    <Screen header={<AppBar title={title} back={back} />} footer={footer}>
      {showList ? <SectionList section={section} cv={cv} cvId={cvId} /> : null}
      {showList ? <SectionTitle>{addTitleFor(section)}</SectionTitle> : null}
      {children}
    </Screen>
  )

  if (section === "info") return <InfoForm cv={cv} onDone={onDone} frame={frame} />
  if (section === "experience") return <ExperienceForm cvId={cvId} entry={findEntry(cv.experiences, entryId)} onDone={onDone} frame={frame} />
  if (section === "education") return <EducationForm cvId={cvId} entry={findEntry(cv.education, entryId)} onDone={onDone} frame={frame} />
  if (section === "skill") return <SkillForm cvId={cvId} entry={findEntry(cv.skills, entryId)} onDone={onDone} frame={frame} />
  if (section === "language") return <LanguageForm cvId={cvId} entry={findEntry(cv.languages, entryId)} onDone={onDone} frame={frame} />
  return <HobbyForm cv={cv} cvId={cvId} onDone={onDone} frame={frame} />
}

// ── Liste des entrées existantes (au-dessus du formulaire d'ajout) ──────────

function sectionItems(cv: CvFull, section: SectionKind): { id: string }[] {
  if (section === "experience") return cv.experiences
  if (section === "education") return cv.education
  if (section === "skill") return cv.skills
  if (section === "language") return cv.languages
  return []
}

function listTitleFor(section: SectionKind): string {
  if (section === "experience") return "Tes expériences"
  if (section === "education") return "Tes formations"
  if (section === "skill") return "Tes compétences"
  if (section === "language") return "Tes langues"
  return ""
}

function addTitleFor(section: SectionKind): string {
  if (section === "experience") return "Ajouter une expérience"
  if (section === "education") return "Ajouter une formation"
  if (section === "skill") return "Ajouter une compétence"
  if (section === "language") return "Ajouter une langue"
  return ""
}

function SectionList({ section, cv, cvId }: { section: SectionKind; cv: CvFull; cvId: Id<"citizenCv"> }) {
  const removeExperience = useMutation(api.cv.experiences.remove)
  const removeEducation = useMutation(api.cv.education.remove)
  const removeSkill = useMutation(api.cv.skills.remove)
  const removeLanguage = useMutation(api.cv.languages.remove)
  const [pending, setPending] = React.useState<{ label: string; exec: () => Promise<unknown> } | null>(null)

  const href = (id: string) => `/icv/edit?section=${section}&cv=${cvId}&id=${id}`
  const rows: { id: string; primary: string; secondary?: string; del: () => void }[] =
    section === "experience"
      ? cv.experiences.map((e) => ({
          id: e.id,
          primary: e.title || "Poste sans intitulé",
          secondary: [e.company, formatRange(e.startDate, e.endDate, e.current)].filter(Boolean).join(" · "),
          del: () => setPending({ label: "cette expérience", exec: () => removeExperience({ cvId, id: e.id }) }),
        }))
      : section === "education"
        ? cv.education.map((e) => ({
            id: e.id,
            primary: e.degree || "Diplôme sans intitulé",
            secondary: [e.school, e.year].filter(Boolean).join(" · "),
            del: () => setPending({ label: "cette formation", exec: () => removeEducation({ cvId, id: e.id }) }),
          }))
        : section === "skill"
          ? cv.skills.map((e) => ({
              id: e.id,
              primary: e.name,
              secondary: e.level,
              del: () => setPending({ label: "cette compétence", exec: () => removeSkill({ cvId, id: e.id }) }),
            }))
          : cv.languages.map((e) => ({
              id: e.id,
              primary: e.name,
              secondary: e.level,
              del: () => setPending({ label: "cette langue", exec: () => removeLanguage({ cvId, id: e.id }) }),
            }))

  return (
    <>
      <Card className="mt-4">
        {rows.map((r) => (
          <Row
            key={r.id}
            title={r.primary}
            sub={r.secondary || undefined}
            href={href(r.id)}
            ariaLabel={`Modifier ${r.primary}`}
            right={<IconButton icon="trash" label={`Supprimer ${r.primary}`} onClick={r.del} plain className="text-c-red-text" />}
          />
        ))}
      </Card>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={`Supprimer ${pending?.label ?? ""} ?`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          await pending?.exec()
        }}
      />
    </>
  )
}

function formatRange(start: string, end: string | undefined, current: boolean): string {
  if (current) return `${start} → aujourd’hui`
  if (!end) return start
  return `${start} → ${end}`
}

function computeTitle(s: SectionKind, editing: boolean): string {
  if (s === "info") return "Tes informations"
  if (s === "experience") return editing ? "Modifier l’expérience" : "Ajouter une expérience"
  if (s === "education") return editing ? "Modifier la formation" : "Ajouter une formation"
  if (s === "skill") return editing ? "Modifier la compétence" : "Ajouter une compétence"
  if (s === "language") return editing ? "Modifier la langue" : "Ajouter une langue"
  return "Centres d’intérêt"
}

function findEntry<T extends { id: string }>(arr: T[], id: string | null): T | null {
  if (!id) return null
  return arr.find((e) => e.id === id) ?? null
}

/** Pied d'écran : enregistrer (et supprimer en modification). */
function SaveBar({
  onSave,
  onDelete,
  busy,
  error,
  deleteTitle,
}: {
  onSave: () => void
  onDelete?: () => Promise<unknown>
  busy: boolean
  error: string | null
  deleteTitle?: string
}) {
  const [confirm, setConfirm] = React.useState(false)
  return (
    <>
      <ErrorNote className="mt-0">{error}</ErrorNote>
      <IdnButton full onClick={onSave} loading={busy}>
        Enregistrer
      </IdnButton>
      {onDelete ? (
        <>
          <IdnButton full variant="dangerGhost" onClick={() => setConfirm(true)} disabled={busy}>
            Supprimer
          </IdnButton>
          <ConfirmDialog
            open={confirm}
            onOpenChange={setConfirm}
            title={deleteTitle ?? "Supprimer ?"}
            confirmLabel="Supprimer"
            destructive
            onConfirm={async () => {
              await onDelete()
            }}
          />
        </>
      ) : null}
    </>
  )
}

/** Le hook commun : état d'envoi, erreur, exécution. */
function useSave(onDone: () => void) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  async function run(fn: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await fn()
      onDone()
    } catch (e) {
      setError(errText(e))
      setBusy(false)
    }
  }
  return { busy, error, run }
}

// ── Tes informations ───────────────────────────────────────────────────────

function InfoForm({ cv, onDone, frame }: { cv: CvFull; onDone: () => void; frame: Frame }) {
  const upsert = useMutation(api.cv.profile.upsert)
  const { busy, error, run } = useSave(onDone)
  const [form, setForm] = React.useState({
    firstName: cv.firstName,
    lastName: cv.lastName,
    email: cv.email,
    phone: cv.phone,
    address: cv.address,
    summary: cv.summary,
    linkedinUrl: cv.linkedinUrl ?? "",
    portfolioUrl: cv.portfolioUrl ?? "",
  })
  const save = () =>
    run(() =>
      upsert({
        cvId: cv._id,
        patch: { ...form, linkedinUrl: form.linkedinUrl || undefined, portfolioUrl: form.portfolioUrl || undefined },
      })
    )
  return frame(
    <>
      <div className="grid gap-x-3 sm:grid-cols-2">
        <CvField label="Prénom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} autoComplete="given-name" />
        <CvField label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} autoComplete="family-name" />
        <CvField label="E-mail" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" />
        <CvField label="Téléphone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" />
      </div>
      <CvField label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} autoComplete="street-address" />
      <CvField
        label="Résumé professionnel"
        hint="Entre 50 et 300 caractères pour un score optimal."
        value={form.summary}
        onChange={(v) => setForm({ ...form, summary: v })}
        multiline
      />
      <CvField label="LinkedIn (adresse du profil)" type="url" value={form.linkedinUrl} onChange={(v) => setForm({ ...form, linkedinUrl: v })} />
      <CvField label="Portfolio (adresse du site)" type="url" value={form.portfolioUrl} onChange={(v) => setForm({ ...form, portfolioUrl: v })} />
    </>,
    <SaveBar onSave={save} busy={busy} error={error} />
  )
}

// ── Expérience ─────────────────────────────────────────────────────────────

function ExperienceForm({ cvId, entry, onDone, frame }: { cvId: Id<"citizenCv">; entry: CvFull["experiences"][number] | null; onDone: () => void; frame: Frame }) {
  const add = useMutation(api.cv.experiences.add)
  const update = useMutation(api.cv.experiences.update)
  const remove = useMutation(api.cv.experiences.remove)
  const { busy, error, run } = useSave(onDone)
  const [form, setForm] = React.useState({
    title: entry?.title ?? "",
    company: entry?.company ?? "",
    startDate: entry?.startDate ?? "",
    endDate: entry?.endDate ?? "",
    current: entry?.current ?? false,
    description: entry?.description ?? "",
  })
  const save = () =>
    run(() => {
      const data = {
        title: form.title,
        company: form.company,
        startDate: form.startDate,
        endDate: form.current ? undefined : form.endDate || undefined,
        current: form.current,
        description: form.description,
      }
      return entry ? update({ cvId, id: entry.id, patch: data }) : add({ cvId, data })
    })
  return frame(
    <>
      <CvField label="Intitulé du poste" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Par exemple : Chef de projet numérique" />
      <CvField label="Entreprise ou organisme" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
      <div className="grid grid-cols-2 gap-2.5">
        <CvField label="Début" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} placeholder="01/2022" />
        <CvField
          label="Fin"
          value={form.current ? "" : form.endDate}
          onChange={(v) => setForm({ ...form, endDate: v })}
          placeholder={form.current ? "En cours" : "06/2024"}
          disabled={form.current}
        />
      </div>
      <Card className="mt-4">
        <Row
          title="J’occupe ce poste actuellement"
          right={<Switch checked={form.current} onChange={(v) => setForm({ ...form, current: v })} label="J’occupe ce poste actuellement" />}
        />
      </Card>
      <CvField
        label="Description"
        value={form.description}
        onChange={(v) => setForm({ ...form, description: v })}
        multiline
        minHeight={120}
        hint="Tes missions et tes résultats, en quelques lignes."
      />
    </>,
    <SaveBar
      onSave={save}
      busy={busy}
      error={error}
      deleteTitle="Supprimer cette expérience ?"
      onDelete={entry ? async () => { await remove({ cvId, id: entry.id }); onDone() } : undefined}
    />
  )
}

// ── Formation ──────────────────────────────────────────────────────────────

function EducationForm({ cvId, entry, onDone, frame }: { cvId: Id<"citizenCv">; entry: CvFull["education"][number] | null; onDone: () => void; frame: Frame }) {
  const add = useMutation(api.cv.education.add)
  const update = useMutation(api.cv.education.update)
  const remove = useMutation(api.cv.education.remove)
  const { busy, error, run } = useSave(onDone)
  const [form, setForm] = React.useState({
    degree: entry?.degree ?? "",
    school: entry?.school ?? "",
    year: entry?.year ?? "",
    description: entry?.description ?? "",
  })
  const save = () =>
    run(() => {
      const data = { degree: form.degree, school: form.school, year: form.year, description: form.description || undefined }
      return entry ? update({ cvId, id: entry.id, patch: data }) : add({ cvId, data })
    })
  return frame(
    <>
      <CvField label="Diplôme" value={form.degree} onChange={(v) => setForm({ ...form, degree: v })} placeholder="Par exemple : Master en droit des affaires" />
      <CvField label="Établissement" value={form.school} onChange={(v) => setForm({ ...form, school: v })} />
      <CvField label="Année d’obtention" value={form.year} onChange={(v) => setForm({ ...form, year: v })} placeholder="2024" inputMode="numeric" />
      <CvField label="Description (facultatif)" value={form.description} onChange={(v) => setForm({ ...form, description: v })} multiline />
    </>,
    <SaveBar
      onSave={save}
      busy={busy}
      error={error}
      deleteTitle="Supprimer cette formation ?"
      onDelete={entry ? async () => { await remove({ cvId, id: entry.id }); onDone() } : undefined}
    />
  )
}

// ── Compétence ─────────────────────────────────────────────────────────────

function SkillForm({ cvId, entry, onDone, frame }: { cvId: Id<"citizenCv">; entry: CvFull["skills"][number] | null; onDone: () => void; frame: Frame }) {
  const add = useMutation(api.cv.skills.add)
  const update = useMutation(api.cv.skills.update)
  const remove = useMutation(api.cv.skills.remove)
  const { busy, error, run } = useSave(onDone)
  const [form, setForm] = React.useState<{ name: string; level: (typeof SKILL_LEVELS)[number] }>({
    name: entry?.name ?? "",
    level: entry?.level ?? "Intermédiaire",
  })
  const save = () => run(() => (entry ? update({ cvId, id: entry.id, patch: form }) : add({ cvId, data: form })))
  return frame(
    <>
      <CvField label="Compétence" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Par exemple : Gestion de projet" />
      <LevelPicker label="Niveau" value={form.level} options={[...SKILL_LEVELS]} onChange={(v) => setForm({ ...form, level: v as (typeof SKILL_LEVELS)[number] })} />
    </>,
    <SaveBar
      onSave={save}
      busy={busy}
      error={error}
      deleteTitle="Supprimer cette compétence ?"
      onDelete={entry ? async () => { await remove({ cvId, id: entry.id }); onDone() } : undefined}
    />
  )
}

// ── Langue ─────────────────────────────────────────────────────────────────

function LanguageForm({ cvId, entry, onDone, frame }: { cvId: Id<"citizenCv">; entry: CvFull["languages"][number] | null; onDone: () => void; frame: Frame }) {
  const add = useMutation(api.cv.languages.add)
  const update = useMutation(api.cv.languages.update)
  const remove = useMutation(api.cv.languages.remove)
  const { busy, error, run } = useSave(onDone)
  const [form, setForm] = React.useState<{ name: string; level: (typeof LANG_LEVELS)[number] }>({
    name: entry?.name ?? "",
    level: entry?.level ?? "B2",
  })
  const save = () => run(() => (entry ? update({ cvId, id: entry.id, patch: form }) : add({ cvId, data: form })))
  return frame(
    <>
      <CvField label="Langue" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Par exemple : Anglais" />
      <LevelPicker
        label="Niveau"
        hint="Cadre européen : de A1 (débutant) à C2 (maîtrise)."
        value={form.level}
        options={[...LANG_LEVELS]}
        onChange={(v) => setForm({ ...form, level: v as (typeof LANG_LEVELS)[number] })}
      />
    </>,
    <SaveBar
      onSave={save}
      busy={busy}
      error={error}
      deleteTitle="Supprimer cette langue ?"
      onDelete={entry ? async () => { await remove({ cvId, id: entry.id }); onDone() } : undefined}
    />
  )
}

// ── Centres d'intérêt, édités en bloc (un par ligne) ───────────────────────

function HobbyForm({ cv, cvId, onDone, frame }: { cv: CvFull; cvId: Id<"citizenCv">; onDone: () => void; frame: Frame }) {
  const upsert = useMutation(api.cv.profile.upsert)
  const { busy, error, run } = useSave(onDone)
  const [value, setValue] = React.useState(cv.hobbies.join("\n"))
  const save = () =>
    run(() =>
      upsert({
        cvId,
        patch: {
          hobbies: value
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0),
        },
      })
    )
  return frame(
    <CvField
      label="Tes centres d’intérêt"
      hint="Un par ligne (par exemple : photographie, course à pied, échecs)."
      value={value}
      onChange={setValue}
      multiline
      minHeight={140}
      placeholder={"Photographie\nCourse à pied\nÉchecs"}
    />,
    <SaveBar onSave={save} busy={busy} error={error} />
  )
}

// ── Briques ────────────────────────────────────────────────────────────────

function LevelPicker({ label, hint, value, options, onChange }: { label: string; hint?: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-idn-ink">{label}</p>
      <CvChips wrap label={label} items={options.map((o) => ({ id: o, label: o }))} value={value} onChange={onChange} />
      {hint ? <p className="mt-2 text-[13px] leading-[18px] text-idn-muted">{hint}</p> : null}
    </div>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "border-idn-green bg-idn-green" : "border-idn-border bg-idn-surface-2"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-6 rounded-full bg-white transition-transform motion-reduce:transition-none",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  )
}
