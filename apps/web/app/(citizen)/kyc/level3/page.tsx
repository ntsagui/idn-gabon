"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAction, useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { AppBar } from "@/app/_components/idn/app-bar"
import { IdnButton } from "@/app/_components/idn/button"
import { ConfirmDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { ErrorNote } from "@/app/_components/idn/list"
import { Screen } from "@/app/_components/idn/screen"
import { Stepper } from "@/app/_components/idn/stepper"
import { formatLevel3Time } from "@/lib/citizen/level3"
import { level3Ref, level3View } from "@/lib/citizen/level3-view"

import { errorMessage, useKycFlow } from "../_components/flow"
import { downloadFile, level3Ics } from "../_components/ics"
import { Level3Call, type Level3Credentials } from "../_components/level3-call"
import { Level3Confirm } from "../_components/level3-confirm"
import { Level3Intro } from "../_components/level3-intro"
import { Level3Result } from "../_components/level3-result"
import { Level3Slots, slotSummary, type AvailableSlot } from "../_components/level3-slots"
import { Level3Waiting } from "../_components/level3-waiting"

const L3_STEPS = ["Créneau", "Confirmation", "Équipement", "Entretien"]

/** Parcours Niveau 3 : présentation, créneau, confirmation, salle d'attente, visio, résultat. */
export default function LevelThreePage() {
  return (
    <React.Suspense fallback={null}>
      <LevelThree />
    </React.Suspense>
  )
}

function LevelThree() {
  const router = useRouter()
  const flow = useKycFlow()
  // « Modifier le créneau » est porté par l'URL : le bouton retour y revient.
  const choosingSlot = useSearchParams().get("modifier") === "1"
  const me = useQuery(api.profile.getCurrentUser)
  const verification = useQuery(api.level3.getMine)
  const request = useMutation(api.verification.request)
  const cancel = useMutation(api.level3.cancel)
  const book = useMutation(api.level3.scheduling.book)
  const issueJoinToken = useAction(api.level3.livekit.issueJoinToken)

  const [selected, setSelected] = React.useState<AvailableSlot | null>(null)
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [ready, setReady] = React.useState(false)
  const [credentials, setCredentials] = React.useState<Level3Credentials | null>(null)
  const [confirmCancel, setConfirmCancel] = React.useState(false)
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const loa = me?.profile?.loa ?? 1
  const view = me === undefined || verification === undefined ? null : level3View({ loa, verification, now, choosingSlot })
  const slots = useQuery(api.level3.scheduling.listAvailable, view === "slots" || view === "intro" ? {} : "skip")
  const shortestMin = slots?.length ? Math.min(...slots.map((s) => Math.round((s.endsAt - s.startsAt) / 60_000))) : undefined

  // Parcours délégué (app partenaire) : retour dès que le Niveau 3 est accordé.
  React.useEffect(() => {
    if (flow.returnTo && me && loa >= 3) window.location.assign(flow.returnTo)
  }, [flow.returnTo, me, loa])

  async function run(key: string, fn: () => Promise<void>, fallback: string) {
    setPending(key)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(errorMessage(err, fallback))
    } finally {
      setPending(null)
    }
  }

  const startRequest = () =>
    run(
      "start",
      async () => {
        await request({ targetLoa: 3 })
      },
      "Impossible d’ouvrir la demande."
    )

  const bookSelected = () =>
    run(
      "book",
      async () => {
        if (!verification || !selected) return
        await book({ verificationId: verification._id, slotId: selected._id })
        setSelected(null)
        if (choosingSlot) router.replace(flow.href("/kyc/level3"))
      },
      "Ce créneau n’est plus disponible."
    )

  function addToCalendar() {
    if (!verification?.scheduledAt || !verification.scheduledEndAt) return
    const ics = level3Ics({
      uid: verification._id,
      startsAt: verification.scheduledAt,
      endsAt: verification.scheduledEndAt,
      title: "Entretien Niveau 3 · Identité Numérique",
      description: `Entretien vidéo dans l’application IDN${verification.controllerName ? ` avec ${verification.controllerName}` : ""}. Garde ta CNI à portée de main. Référence ${level3Ref(verification._id)}.`,
      url: `${window.location.origin}/kyc/level3`,
    })
    downloadFile("entretien-niveau-3.ics", ics, "text/calendar;charset=utf-8")
  }

  const join = () =>
    run(
      "join",
      async () => {
        if (!verification) return
        setCredentials(await issueJoinToken({ verificationId: verification._id }))
      },
      "Connexion à l’entretien impossible."
    )

  // ── Visio : plein écran sombre ───────────────────────────────────────────
  if (credentials && verification && (verification.status === "claimed" || verification.status === "in_interview")) {
    return (
      <Level3Call
        credentials={credentials}
        onLeave={() => setCredentials(null)}
        onError={(message) => {
          setCredentials(null)
          setError(`L’entretien vidéo s’est interrompu : ${message}`)
        }}
      />
    )
  }

  if (!view) {
    return <Screen header={<AppBar title="Niveau 3 · Élevé" back="/dashboard" />}>{null}</Screen>
  }

  const back = choosingSlot && verification?.scheduledAt ? flow.href("/kyc/level3") : "/dashboard"
  const stepIndex = view === "slots" ? 0 : view === "confirm" ? 1 : view === "waiting" ? 2 : -1
  const title = view === "slots" ? "Choisir un créneau" : view === "confirm" ? "Rendez-vous" : view === "waiting" ? "Salle d’attente" : "Niveau 3 · Élevé"
  const joinOpensAt = verification?.joinOpensAt ?? (verification?.scheduledAt ? verification.scheduledAt - 15 * 60_000 : undefined)

  const cancelLink = (label: string) => (
    <button
      type="button"
      onClick={() => setConfirmCancel(true)}
      className="self-center rounded-md p-2.5 text-sm font-semibold text-c-red-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </button>
  )

  let footer: React.ReactNode = null
  if (view === "needs-level2") {
    footer = (
      <IdnButton full href="/kyc/intro?target=3" replace>
        Vérifier d’abord mon identité
      </IdnButton>
    )
  } else if (view === "intro" || view === "rejected") {
    footer = (
      <IdnButton full onClick={() => void startRequest()} loading={pending === "start"}>
        {view === "rejected" ? "Refaire une demande" : "Choisir un créneau"}
      </IdnButton>
    )
  } else if (view === "slots") {
    footer = (
      <>
        {selected ? <p className="text-center text-sm font-semibold text-idn-ink">{slotSummary(selected)}</p> : null}
        <IdnButton full onClick={() => void bookSelected()} disabled={!selected} loading={pending === "book"}>
          Réserver ce créneau
        </IdnButton>
        {verification && !verification.scheduledAt ? cancelLink("Annuler ma demande") : null}
      </>
    )
  } else if (view === "confirm") {
    footer = (
      <>
        <IdnButton full disabled>
          {joinOpensAt ? `Salle d’attente à partir de ${formatLevel3Time(joinOpensAt)}` : "Rejoindre la salle d’attente"}
        </IdnButton>
        <IdnButton variant="ghost" full href={flow.href("/kyc/level3", { modifier: "1" })}>
          Modifier le créneau
        </IdnButton>
      </>
    )
  } else if (view === "waiting") {
    footer = (
      <IdnButton full onClick={() => void join()} disabled={!ready} loading={pending === "join"} leadIcon={<Icon name="video" size={18} />}>
        Entrer en visio
      </IdnButton>
    )
  } else if (view === "approved") {
    footer = (
      <>
        <IdnButton full href="/dashboard" replace>
          Retour à l’accueil
        </IdnButton>
        <IdnButton variant="ghost" full href="/id-card" replace>
          Voir ma carte
        </IdnButton>
      </>
    )
  }

  return (
    <Screen
      header={<AppBar title={title} back={back} />}
      subHeader={stepIndex >= 0 ? <Stepper steps={L3_STEPS} current={stepIndex} /> : undefined}
      footer={footer}
    >
      {view === "intro" || view === "needs-level2" ? <Level3Intro needsLevel2={view === "needs-level2"} durationMin={shortestMin} /> : null}
      {view === "slots" ? <Level3Slots slots={slots} selected={selected} onSelect={setSelected} /> : null}
      {view === "confirm" && verification?.scheduledAt ? (
        <>
          <Level3Confirm
            scheduledAt={verification.scheduledAt}
            scheduledEndAt={verification.scheduledEndAt}
            controllerName={verification.controllerName}
            reference={level3Ref(verification._id)}
            now={now}
          />
          <IdnButton variant="secondary" full className="mt-4" onClick={addToCalendar} leadIcon={<Icon name="calendarPlus" size={16} />}>
            Ajouter au calendrier
          </IdnButton>
          <div className="mt-2 flex justify-center">{cancelLink("Annuler le rendez-vous")}</div>
        </>
      ) : null}
      {view === "waiting" ? <Level3Waiting onReadyChange={setReady} /> : null}
      {view === "approved" ? <Level3Result approved controllerName={verification?.controllerName} /> : null}
      {view === "rejected" ? <Level3Result approved={false} reason={verification?.rejectionReason} /> : null}
      <ErrorNote>{error}</ErrorNote>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Annuler ta demande ?"
        description="Le créneau sera libéré. Tu pourras refaire une demande plus tard."
        cancelLabel="Conserver"
        confirmLabel="Annuler la demande"
        destructive
        onConfirm={async () => {
          if (!verification) return
          try {
            await cancel({ verificationId: verification._id })
          } catch (err) {
            throw new Error(errorMessage(err, "Annulation impossible."))
          }
        }}
      />
    </Screen>
  )
}
