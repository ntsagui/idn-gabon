"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import { IdnFlagBars } from "@repo/ui/components/idn-flag-bars"

import { IconButton } from "@/app/_components/idn/app-bar"
import { LevelBadge } from "@/app/_components/idn/badge"
import { Icon, type IconName } from "@/app/_components/idn/icons"
import { Avatar, Card, IconTile, Row, SectionTitle, type RowTone } from "@/app/_components/idn/list"
import { AUDIT_ACTION_LABELS, formatRelativeDate } from "@/lib/citizen/activity-format"
import { activityVisual, frDate, profileLabel } from "@/lib/citizen/display"
import { homeTasks } from "@/lib/citizen/home-tasks"
import { initialsOf, setLastAccount } from "@/lib/citizen/last-account"

/** Accueil : transposition de apps/mobile/src/app/(tabs)/home.tsx. */
export default function HomePage() {
  const user = useQuery(api.profile.getCurrentUser)
  const unread = useQuery(api.notifications.unreadCount)
  const activity = useQuery(api.activity.listMine, { limit: 3 })
  const wallet = useQuery(api.wallet.listMine)
  const accounts = useQuery(api.iboite.accounts.listMine)
  const docs = useQuery(api.idoc.summary)
  const cvs = useQuery(api.cv.cvs.listMine)
  const kyc = useQuery(api.kyc.getMyLatest)
  const level3 = useQuery(api.level3.getMine)
  const deletion = useQuery(api.privacy.getDeletionStatus)

  const pivot = user?.profile?.pivot
  React.useEffect(() => {
    if (user?.email) setLastAccount({ email: user.email, firstName: pivot?.firstName, lastName: pivot?.lastName })
  }, [user?.email, pivot?.firstName, pivot?.lastName])

  const fullName = pivot ? `${pivot.firstName} ${pivot.lastName}` : ""
  const loa = (user?.profile?.loa ?? 1) as 1 | 2 | 3
  const unreadLetters = accounts?.reduce((n, a) => n + a.counters.unreadLetters, 0) ?? 0
  const unreadMail = accounts?.reduce((n, a) => n + a.counters.unreadLetters + a.counters.unreadMessages, 0)
  const docCount = docs?.reduce((n, f) => n + f.count, 0)
  const defaultCv = cvs?.find((c) => c.isDefault) ?? cvs?.[0]
  const tasks = homeTasks({
    now: Date.now(),
    kycStatus: kyc?.status,
    level3: level3 ?? null,
    unreadLetters,
    deletionScheduledAt: deletion?.deletionScheduledAt ?? null,
  })

  const plural = (n: number | undefined, one: string, many: string) => (n === undefined ? "…" : `${n} ${n > 1 ? many : one}`)
  const shortcuts: { label: string; sub: string; icon: IconName; tone: RowTone; href: string }[] = [
    { label: "iCarte", sub: plural(wallet?.cards.length, "carte", "cartes"), icon: "wallet", tone: "green", href: "/icarte" },
    {
      label: "iBoîte",
      sub: unreadMail === undefined ? "…" : unreadMail ? `${unreadMail} non lu${unreadMail > 1 ? "s" : ""}` : "À jour",
      icon: "mailbox",
      tone: "blue",
      href: "/iboite",
    },
    { label: "iDocument", sub: plural(docCount, "document", "documents"), icon: "lock", tone: "yellow", href: "/idoc" },
    {
      label: "iCV",
      sub: cvs === undefined ? "…" : defaultCv ? `Complet à ${Math.round(defaultCv.completionScore)} %` : "À créer",
      icon: "fileUser",
      tone: "neutral",
      href: "/icv",
    },
  ]

  const upgrade =
    loa === 1 && !tasks.some((x) => x.id.startsWith("kyc"))
      ? { title: "Vérifie ton identité", sub: "Pièce d’identité et selfie, en 5 minutes, pour passer au Niveau 2.", href: "/kyc/intro" }
      : loa === 2 && !tasks.some((x) => x.id.startsWith("l3"))
        ? { title: "Passe au Niveau 3", sub: "Mets à jour tes pièces, puis un entretien vidéo de 10 min avec un contrôleur.", href: "/kyc/level3" }
        : null

  const genderBorn = pivot?.dateOfBirth ? `${pivot.gender === "F" ? "Née" : "Né"} le ${frDate(pivot.dateOfBirth)}` : ""

  return (
    <div className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-8 md:px-8 md:pb-12">
      <h1 className="sr-only">Accueil</h1>
      <div className="flex items-center gap-3 py-2 md:pb-4 md:pt-8">
        <Avatar photoUrl={user?.profile?.photoUrl} initials={initialsOf(pivot?.firstName, pivot?.lastName, user?.email)} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-idn-muted">Bonjour,</p>
          <p className="truncate text-base font-semibold text-idn-ink md:text-xl">{fullName || " "}</p>
        </div>
        <IconButton icon="scanLine" label="Vérifier un acte officiel" href="/scanner" />
        <IconButton
          icon="bell"
          label={unread ? `Notifications, ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"}
          badge={!!unread}
          href="/notifications"
        />
      </div>

      <div className="grid gap-x-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
        <div className="min-w-0">
          <section aria-label="Résumé de ton identité" className="mt-2 rounded-[20px] bg-idn-green p-5 text-white">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#d9eadf]">Identité numérique</p>
              <IdnFlagBars width={42} height={3} />
            </div>
            <p className="mt-3.5 text-[22px] font-semibold leading-7">{fullName || "…"}</p>
            <p className="mt-1 text-[13px] text-[#d9eadf]">
              {[profileLabel(user?.profile?.profileType, pivot?.gender), genderBorn].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <LevelBadge level={loa} onGreen short={loa < 3} />
              <Link
                href="/id-card"
                className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-idn-green-dark px-3.5 py-2 text-sm font-medium text-white outline-none hover:bg-[#08401f] focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-idn-green"
              >
                <Icon name="qr" size={16} />
                Présenter ma carte
              </Link>
            </div>
          </section>

          <ul className="mt-3 grid grid-cols-4 gap-2" aria-label="Mes services">
            {shortcuts.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  aria-label={`${s.label}, ${s.sub}`}
                  className="flex h-full flex-col items-center gap-1.5 rounded-[14px] border border-idn-border bg-idn-surface px-1 py-3.5 outline-none transition-colors hover:bg-idn-surface-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <IconTile icon={s.icon} tone={s.tone} />
                  <span className="text-[13px] font-semibold text-idn-ink">{s.label}</span>
                  <span className="max-w-full truncate text-[11px] text-idn-muted">{s.sub}</span>
                </Link>
              </li>
            ))}
          </ul>

          {upgrade ? (
            <Link
              href={upgrade.href}
              className="mt-3 flex items-center gap-3 rounded-[14px] border border-c-yellow-border bg-c-yellow-badge p-3.5 outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-idn-yellow text-[#16170f]">
                <Icon name="shield" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-idn-ink">{upgrade.title}</span>
                <span className="mt-0.5 block text-[13px] leading-[18px] text-idn-ink-2">{upgrade.sub}</span>
              </span>
              <Icon name="arrow" size={18} className="shrink-0 text-idn-ink-2" />
            </Link>
          ) : null}

          {tasks.length ? (
            <>
              <SectionTitle>À traiter</SectionTitle>
              <Card>
                {tasks.map((task) => (
                  <Row key={task.id} icon={task.icon} tone={task.tone} title={task.title} sub={task.sub} chevron href={task.route} />
                ))}
              </Card>
            </>
          ) : null}
        </div>

        <div className="min-w-0 lg:pt-2">
          <SectionTitle action="Tout voir" actionHref="/activity" className="lg:mt-0">
            Activité récente
          </SectionTitle>
          <Card>
            {activity === undefined ? (
              <Row title="Chargement…" />
            ) : activity.length === 0 ? (
              <Row title="Aucune activité pour l’instant" sub="Tes connexions et démarches apparaîtront ici." />
            ) : (
              activity.map((a) => {
                const v = activityVisual(a.action)
                return (
                  <Row key={a._id} icon={v.icon} tone={v.tone} title={AUDIT_ACTION_LABELS[a.action] ?? a.action} sub={formatRelativeDate(a.createdAt)} />
                )
              })
            )}
          </Card>

          <SectionTitle>Démarches</SectionTitle>
          <Card>
            <Row icon="landmark" tone="green" title="Services publics" sub="Démarches accessibles avec ton compte IDN" chevron href="/mes-services" />
            <Row icon="keyRound" tone="neutral" title="Applications autorisées" sub="Ce que tu partages avec les services partenaires" chevron href="/consents" />
          </Card>
        </div>
      </div>
    </div>
  )
}
