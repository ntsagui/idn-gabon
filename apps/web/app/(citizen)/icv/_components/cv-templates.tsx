"use client"

/**
 * Catalogue iCV — 6 modèles fidèlement portés du projet `gabon-diplomatie`
 * (apps/citizen-web/src/components/cv/themes/*). Chaque template est rendu
 * à pleine taille A4 (794×1123 @ 96dpi) avec une vraie typographie
 * lisible ; c'est `CvPreviewA4` qui scale le rendu pour les vignettes.
 *
 * Pour ajouter un template : créer un composant `TplFoo`, l'enregistrer
 * dans `TEMPLATES` et ajouter l'entrée dans `_content/themes.ts`.
 */

import * as React from "react"
import { Mail, MapPin, Phone, Link2 } from "lucide-react"

import type { PreviewCv } from "./cv-preview-a4"

// ─────────────────────────────────────────────────────────────────────────
// Dimensions A4 — chaque template rend à cette taille native, scalé par
// `CvPreviewA4` selon le contexte (mini-aperçu, preview principal, etc.).
// ─────────────────────────────────────────────────────────────────────────

export const A4_W = 794
export const A4_H = 1123

// ─────────────────────────────────────────────────────────────────────────
// Helpers communs
// ─────────────────────────────────────────────────────────────────────────

function formatRange(start: string, end?: string, current?: boolean) {
  if (current) return `${start || ""} — Présent`
  if (!end) return start || ""
  return `${start} — ${end}`
}

function initials(cv: PreviewCv) {
  return `${(cv.firstName || "?")[0] ?? ""}${(cv.lastName || "?")[0] ?? ""}`.toUpperCase()
}

function role(cv: PreviewCv) {
  return cv.experiences[0]?.title ?? ""
}

/** Map nos niveaux de skill vers un pourcentage pour les barres. */
function skillPercent(level: string): number {
  if (level === "Expert") return 100
  if (level === "Avancé") return 80
  if (level === "Intermédiaire") return 60
  return 35
}

// ─────────────────────────────────────────────────────────────────────────
// 1. MODERN — Sidebar slate-900 + corps blanc avec timeline
// ─────────────────────────────────────────────────────────────────────────

function TplModern({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="flex h-full w-full bg-white text-slate-800"
      style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
    >
      {/* Sidebar */}
      <div className="flex w-1/3 flex-col gap-7 bg-slate-900 p-8 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-slate-600 bg-slate-700 text-2xl font-bold">
            {initials(cv)}
          </div>
          <h2 className="text-2xl font-bold uppercase leading-tight tracking-wider">
            {cv.firstName}
            <br />
            {cv.lastName}
          </h2>
          {role(cv) ? (
            <p className="mt-2 text-sm font-medium text-slate-400">
              {role(cv)}
            </p>
          ) : null}
        </div>

        <div className="space-y-3 text-sm">
          {cv.email ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2"><Mail size={13} /></div>
              <span className="truncate">{cv.email}</span>
            </div>
          ) : null}
          {cv.phone ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2"><Phone size={13} /></div>
              <span>{cv.phone}</span>
            </div>
          ) : null}
          {cv.address ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2"><MapPin size={13} /></div>
              <span>{cv.address}</span>
            </div>
          ) : null}
          {cv.linkedinUrl ? (
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-800 p-2"><Link2 size={13} /></div>
              <span className="truncate text-xs">{cv.linkedinUrl}</span>
            </div>
          ) : null}
        </div>

        {cv.skills.length > 0 ? (
          <div>
            <h4 className="mb-3 border-b border-slate-700 pb-2 text-sm font-bold uppercase">
              Compétences
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {cv.languages.length > 0 ? (
          <div>
            <h4 className="mb-3 border-b border-slate-700 pb-2 text-sm font-bold uppercase">
              Langues
            </h4>
            <div className="space-y-1.5">
              {cv.languages.map((l) => (
                <div key={l.id} className="flex justify-between text-sm">
                  <span>{l.name}</span>
                  <span className="text-xs text-slate-400">{l.level}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.hobbies.length > 0 ? (
          <div>
            <h4 className="mb-3 border-b border-slate-700 pb-2 text-sm font-bold uppercase">
              Centres d’intérêt
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {cv.hobbies.map((h) => (
                <span key={h} className="text-xs text-slate-300">{h}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Main */}
      <div className="w-2/3 bg-white p-8">
        {cv.summary ? (
          <div className="mb-7">
            <h3 className="mb-3 border-b-2 border-slate-900 pb-2 text-lg font-bold uppercase tracking-widest text-slate-900">
              Profil
            </h3>
            <p className="text-justify text-sm leading-relaxed text-slate-600">
              {cv.summary}
            </p>
          </div>
        ) : null}

        {cv.experiences.length > 0 ? (
          <div className="mb-7">
            <h3 className="mb-4 border-b-2 border-slate-900 pb-2 text-lg font-bold uppercase tracking-widest text-slate-900">
              Expérience
            </h3>
            <div className="space-y-5">
              {cv.experiences.map((e) => (
                <div
                  key={e.id}
                  className="relative border-l-2 border-slate-200 pl-5"
                >
                  <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-white bg-slate-900" />
                  <h4 className="text-sm font-bold text-slate-800">
                    {e.title}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500">
                    {e.company}
                  </p>
                  <p className="mb-1 font-mono text-[11px] text-slate-400">
                    {formatRange(e.startDate, e.endDate, e.current)}
                  </p>
                  {e.description ? (
                    <p className="text-xs leading-relaxed text-slate-600">
                      {e.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.education.length > 0 ? (
          <div>
            <h3 className="mb-4 border-b-2 border-slate-900 pb-2 text-lg font-bold uppercase tracking-widest text-slate-900">
              Formation
            </h3>
            <div className="space-y-3">
              {cv.education.map((e) => (
                <div key={e.id}>
                  <h4 className="text-sm font-bold text-slate-800">
                    {e.degree}
                  </h4>
                  <p className="text-xs text-slate-600">{e.school}</p>
                  <p className="font-mono text-[11px] text-slate-400">
                    {e.year}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 2. CLASSIC — Centré serif (Georgia), traits horizontaux, zéro couleur
// ─────────────────────────────────────────────────────────────────────────

function TplClassic({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="h-full w-full bg-white p-10 text-gray-800"
      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
    >
      <div className="mb-6 border-b-2 border-gray-800 pb-4 text-center">
        <h2 className="text-3xl font-bold uppercase tracking-wide">
          {cv.firstName} {cv.lastName}
        </h2>
        {role(cv) ? (
          <p className="mt-1 text-lg italic text-gray-600">{role(cv)}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
          {cv.email ? <span>{cv.email}</span> : null}
          {cv.phone ? <span>• {cv.phone}</span> : null}
          {cv.address ? <span>• {cv.address}</span> : null}
        </div>
      </div>

      {cv.summary ? (
        <div className="mb-5">
          <h3 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-widest text-gray-700">
            Profil Professionnel
          </h3>
          <p className="text-justify text-sm leading-relaxed text-gray-600">
            {cv.summary}
          </p>
        </div>
      ) : null}

      {cv.experiences.length > 0 ? (
        <div className="mb-5">
          <h3 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-widest text-gray-700">
            Expérience Professionnelle
          </h3>
          <div className="space-y-4">
            {cv.experiences.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-bold">{e.title}</h4>
                  <span className="text-xs text-gray-500">
                    {formatRange(e.startDate, e.endDate, e.current)}
                  </span>
                </div>
                <p className="text-sm italic text-gray-600">{e.company}</p>
                {e.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    {e.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cv.education.length > 0 ? (
        <div className="mb-5">
          <h3 className="mb-3 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-widest text-gray-700">
            Formation
          </h3>
          <div className="space-y-3">
            {cv.education.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-bold">{e.degree}</h4>
                  <span className="text-xs text-gray-500">{e.year}</span>
                </div>
                <p className="text-sm italic text-gray-600">{e.school}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        {cv.skills.length > 0 ? (
          <div>
            <h3 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-widest text-gray-700">
              Compétences
            </h3>
            <ul className="space-y-1">
              {cv.skills.map((s) => (
                <li key={s.id} className="flex justify-between text-xs">
                  <span>{s.name}</span>
                  <span className="text-gray-400">{s.level}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {cv.languages.length > 0 ? (
          <div>
            <h3 className="mb-2 border-b border-gray-300 pb-1 text-sm font-bold uppercase tracking-widest text-gray-700">
              Langues
            </h3>
            <ul className="space-y-1">
              {cv.languages.map((l) => (
                <li key={l.id} className="flex justify-between text-xs">
                  <span>{l.name}</span>
                  <span className="text-gray-400">{l.level}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 3. MINIMALIST — Helvetica Neue, beaucoup d'air, contrastes très doux
// ─────────────────────────────────────────────────────────────────────────

function TplMinimalist({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="h-full w-full bg-white px-12 py-10 text-gray-900"
      style={{ fontFamily: '"Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="mb-8">
        <h2 className="text-3xl font-light uppercase tracking-[0.2em]">
          {cv.firstName}{" "}
          <span className="font-semibold">{cv.lastName}</span>
        </h2>
        {role(cv) ? (
          <p className="mt-1 text-sm uppercase tracking-wider text-gray-400">
            {role(cv)}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {cv.email ? <span>{cv.email}</span> : null}
          {cv.phone ? (
            <>
              <span className="text-gray-200">|</span>
              <span>{cv.phone}</span>
            </>
          ) : null}
          {cv.address ? (
            <>
              <span className="text-gray-200">|</span>
              <span>{cv.address}</span>
            </>
          ) : null}
        </div>
        <div className="mt-4 h-px w-12 bg-gray-900" />
      </div>

      {cv.summary ? (
        <div className="mb-8">
          <p className="max-w-[520px] text-sm leading-relaxed text-gray-600">
            {cv.summary}
          </p>
        </div>
      ) : null}

      {cv.experiences.length > 0 ? (
        <div className="mb-8">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Expérience
          </h3>
          <div className="space-y-5">
            {cv.experiences.map((e) => (
              <div key={e.id}>
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold">{e.title}</h4>
                  <span className="text-[11px] text-gray-400">
                    {formatRange(e.startDate, e.endDate, e.current)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{e.company}</p>
                {e.description ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                    {e.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cv.education.length > 0 ? (
        <div className="mb-8">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Formation
          </h3>
          <div className="space-y-3">
            {cv.education.map((e) => (
              <div key={e.id} className="flex items-baseline justify-between">
                <div>
                  <h4 className="text-sm font-semibold">{e.degree}</h4>
                  <p className="text-xs text-gray-500">{e.school}</p>
                </div>
                <span className="text-[11px] text-gray-400">{e.year}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {cv.skills.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Compétences
          </h3>
          <p className="text-xs text-gray-600">
            {cv.skills.map((s) => s.name).join(" · ")}
          </p>
        </div>
      ) : null}

      {cv.languages.length > 0 ? (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
            Langues
          </h3>
          <p className="text-xs text-gray-600">
            {cv.languages.map((l) => `${l.name} (${l.level})`).join(" · ")}
          </p>
        </div>
      ) : null}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 4. PROFESSIONAL — Bandeau teal en haut, sections avec barre d'accent
// ─────────────────────────────────────────────────────────────────────────

function TplProfessional({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="h-full w-full bg-white text-gray-800"
      style={{ fontFamily: '"Roboto", sans-serif' }}
    >
      <div className="bg-teal-700 px-10 py-6 text-white">
        <h2 className="text-2xl font-bold">
          {cv.firstName} {cv.lastName}
        </h2>
        {role(cv) ? (
          <p className="mt-1 text-sm text-teal-100">{role(cv)}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-teal-200">
          {cv.email ? <span>✉ {cv.email}</span> : null}
          {cv.phone ? <span>☎ {cv.phone}</span> : null}
          {cv.address ? <span>⌖ {cv.address}</span> : null}
          {cv.linkedinUrl ? <span>↗ LinkedIn</span> : null}
        </div>
      </div>

      <div className="space-y-5 px-10 py-6">
        {cv.summary ? (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <span className="h-0.5 w-6 bg-teal-700" />
              Profil Professionnel
            </h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {cv.summary}
            </p>
          </div>
        ) : null}

        {cv.experiences.length > 0 ? (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <span className="h-0.5 w-6 bg-teal-700" />
              Expérience
            </h3>
            <div className="space-y-4">
              {cv.experiences.map((e) => (
                <div key={e.id} className="border-l-2 border-teal-200 pl-4">
                  <h4 className="text-sm font-bold">{e.title}</h4>
                  <p className="text-xs font-medium text-teal-700">
                    {e.company}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    {formatRange(e.startDate, e.endDate, e.current)}
                  </p>
                  {e.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {e.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.education.length > 0 ? (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <span className="h-0.5 w-6 bg-teal-700" />
              Formation
            </h3>
            <div className="space-y-2">
              {cv.education.map((e) => (
                <div key={e.id} className="border-l-2 border-teal-200 pl-4">
                  <h4 className="text-sm font-bold">{e.degree}</h4>
                  <p className="text-xs text-gray-500">{e.school}</p>
                  <p className="text-[11px] text-gray-400">{e.year}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.skills.length > 0 ? (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <span className="h-0.5 w-6 bg-teal-700" />
              Compétences
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span
                  key={s.id}
                  className="rounded border border-teal-100 bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {cv.languages.length > 0 ? (
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700">
              <span className="h-0.5 w-6 bg-teal-700" />
              Langues
            </h3>
            <div className="flex gap-4">
              {cv.languages.map((l) => (
                <div key={l.id} className="text-xs">
                  <span className="font-medium">{l.name}</span>
                  <span className="ml-1 text-gray-400">({l.level})</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 5. CREATIVE — Gradient rose/violet + cartes glass, Poppins
// ─────────────────────────────────────────────────────────────────────────

function TplCreative({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="h-full w-full bg-gradient-to-br from-rose-50 to-violet-50 text-gray-800"
      style={{ fontFamily: '"Poppins", "Inter", sans-serif' }}
    >
      <div className="px-10 pb-6 pt-8">
        <div className="flex items-end gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-violet-500 text-xl font-bold text-white shadow-lg">
            {initials(cv)}
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-rose-600 to-violet-600 bg-clip-text text-2xl font-bold text-transparent">
              {cv.firstName} {cv.lastName}
            </h2>
            {role(cv) ? (
              <p className="text-sm font-medium text-violet-500">{role(cv)}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
          {cv.email ? (
            <span className="rounded-full bg-white/60 px-2.5 py-1">{cv.email}</span>
          ) : null}
          {cv.phone ? (
            <span className="rounded-full bg-white/60 px-2.5 py-1">{cv.phone}</span>
          ) : null}
          {cv.address ? (
            <span className="rounded-full bg-white/60 px-2.5 py-1">{cv.address}</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-5 px-10 pb-8">
        {cv.summary ? (
          <div className="rounded-xl border border-white/50 bg-white/70 p-4 backdrop-blur">
            <p className="text-sm leading-relaxed text-gray-600">{cv.summary}</p>
          </div>
        ) : null}

        {cv.experiences.length > 0 ? (
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500">
              ✦ Expérience
            </h3>
            <div className="space-y-3">
              {cv.experiences.map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-white/50 bg-white/70 p-4 backdrop-blur"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">
                        {e.title}
                      </h4>
                      <p className="text-xs font-medium text-violet-500">
                        {e.company}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-400">
                      {formatRange(e.startDate, e.endDate, e.current)}
                    </span>
                  </div>
                  {e.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                      {e.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.education.length > 0 ? (
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-violet-500">
              ✦ Formation
            </h3>
            <div className="space-y-2">
              {cv.education.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-white/50 bg-white/70 p-3 backdrop-blur"
                >
                  <div>
                    <h4 className="text-sm font-bold">{e.degree}</h4>
                    <p className="text-xs text-gray-500">{e.school}</p>
                  </div>
                  <span className="text-[10px] text-gray-400">{e.year}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {cv.skills.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500">
              ✦ Compétences
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {cv.skills.map((s) => (
                <span
                  key={s.id}
                  className="rounded-full border border-rose-200/50 bg-gradient-to-r from-rose-100 to-violet-100 px-3 py-1 text-[11px] font-medium text-gray-700"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {cv.languages.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-violet-500">
              ✦ Langues
            </h3>
            <div className="flex flex-wrap gap-2">
              {cv.languages.map((l) => (
                <span
                  key={l.id}
                  className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs"
                >
                  {l.name} <span className="text-gray-400">({l.level})</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// 6. ELEGANT — Playfair Display + accents amber, sidebar avec barres
// ─────────────────────────────────────────────────────────────────────────

function TplElegant({ cv }: { cv: PreviewCv }) {
  return (
    <div
      className="h-full w-full bg-white text-gray-800"
      style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
    >
      <div className="border-b-2 border-amber-600 px-10 pb-6 pt-10">
        <h2 className="text-3xl font-bold tracking-wide">
          {cv.firstName} <span className="text-amber-700">{cv.lastName}</span>
        </h2>
        {role(cv) ? (
          <p className="mt-1 text-sm font-medium italic text-amber-600">
            {role(cv)}
          </p>
        ) : null}
        <div
          className="mt-3 flex items-center gap-4 text-xs text-gray-500"
          style={{ fontFamily: '"Inter", sans-serif' }}
        >
          {cv.email ? <span>{cv.email}</span> : null}
          {cv.phone ? <span>• {cv.phone}</span> : null}
          {cv.address ? <span>• {cv.address}</span> : null}
        </div>
      </div>

      <div className="flex gap-8 px-10 py-6">
        <div className="flex-1 space-y-5">
          {cv.summary ? (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-amber-700">
                Profil
              </h3>
              <p
                className="text-sm leading-relaxed text-gray-600"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                {cv.summary}
              </p>
            </div>
          ) : null}

          {cv.experiences.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-700">
                Expérience
              </h3>
              <div className="space-y-4">
                {cv.experiences.map((e) => (
                  <div key={e.id}>
                    <h4 className="text-sm font-bold">{e.title}</h4>
                    <p
                      className="text-xs font-medium text-amber-600"
                      style={{ fontFamily: '"Inter", sans-serif' }}
                    >
                      {e.company}
                    </p>
                    <p
                      className="mt-0.5 text-[11px] text-gray-400"
                      style={{ fontFamily: '"Inter", sans-serif' }}
                    >
                      {formatRange(e.startDate, e.endDate, e.current)}
                    </p>
                    {e.description ? (
                      <p
                        className="mt-1 text-xs leading-relaxed text-gray-600"
                        style={{ fontFamily: '"Inter", sans-serif' }}
                      >
                        {e.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {cv.education.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-amber-700">
                Formation
              </h3>
              <div className="space-y-3">
                {cv.education.map((e) => (
                  <div key={e.id}>
                    <h4 className="text-sm font-bold">{e.degree}</h4>
                    <p
                      className="text-xs text-gray-500"
                      style={{ fontFamily: '"Inter", sans-serif' }}
                    >
                      {e.school}
                    </p>
                    <p
                      className="text-[11px] text-gray-400"
                      style={{ fontFamily: '"Inter", sans-serif' }}
                    >
                      {e.year}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-44 space-y-5 border-l border-amber-200 pl-6">
          {cv.skills.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                Compétences
              </h3>
              <div
                className="space-y-1.5"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                {cv.skills.map((s) => (
                  <div key={s.id}>
                    <p className="text-xs font-medium text-gray-700">{s.name}</p>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-amber-100">
                      <div
                        className="h-1 rounded-full bg-amber-600"
                        style={{ width: `${skillPercent(s.level)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {cv.languages.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                Langues
              </h3>
              <div
                className="space-y-1"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                {cv.languages.map((l) => (
                  <div key={l.id} className="flex justify-between text-xs">
                    <span className="text-gray-700">{l.name}</span>
                    <span className="font-medium text-amber-600">{l.level}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {cv.hobbies.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                Intérêts
              </h3>
              <div
                className="space-y-1"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                {cv.hobbies.map((h) => (
                  <p key={h} className="text-xs text-gray-600">{h}</p>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────────

/**
 * Les 6 templates actifs (alignés sur `gabon-diplomatie`). Les anciens IDs
 * (startup, bold, tech, academic, executive, compact) sont aliasés vers
 * le template le plus proche pour ne pas casser les CV existants en DB.
 */
export const TEMPLATES: Record<string, React.ComponentType<{ cv: PreviewCv }>> = {
  modern: TplModern,
  classic: TplClassic,
  minimalist: TplMinimalist,
  professional: TplProfessional,
  creative: TplCreative,
  elegant: TplElegant,
  // Aliases pour rétro-compat avec les 6 anciens IDs.
  startup: TplCreative,
  bold: TplProfessional,
  tech: TplModern,
  academic: TplClassic,
  executive: TplModern,
  compact: TplMinimalist,
}

export function renderTemplate(themeId: string, cv: PreviewCv): React.ReactElement {
  const Component = TEMPLATES[themeId] ?? TEMPLATES.modern!
  return <Component cv={cv} />
}
