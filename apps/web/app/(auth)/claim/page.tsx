"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { LevelBadge } from "@/app/_components/idn/badge"
import { IdnButton } from "@/app/_components/idn/button"
import { IdnInput } from "@/app/_components/idn/input"
import { Card, DetailRow, ErrorNote, ScreenTitle } from "@/app/_components/idn/list"
import { IdnLottie } from "@/app/_components/idn/lottie"
import { Stepper } from "@/app/_components/idn/stepper"

import { AuthAppBar, AuthScreen } from "../_components/auth-screen"

const CONVEX_SITE = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? ""
const CLAIM_STEPS = ["Recherche", "Confirmation", "Configuration"]

type ClaimResult = {
  found: boolean
  delegatedIdentityId?: string
  idnId?: string
  firstName?: string
  lastName?: string
  loa?: number
  /**
   * Code saisi par le citoyen, conservé en mémoire pour l'étape finale —
   * `/api/claim/complete` le revérifie. Il n'est PAS renvoyé par le serveur :
   * le `delegatedIdentityId` seul n'autorise rien.
   */
  claimCode?: string
}

const STEPS = ["search", "confirm", "setup"] as const
type Step = (typeof STEPS)[number]

function isStep(v: string | null): v is Step {
  return v !== null && (STEPS as readonly string[]).includes(v)
}

export default function ClaimPage() {
  return (
    <React.Suspense fallback={null}>
      <ClaimDispatcher />
    </React.Suspense>
  )
}

/** Récupération d'une identité créée par un organisme : recherche → confirmation → mot de passe et PIN. */
function ClaimDispatcher() {
  const router = useRouter()
  const params = useSearchParams()
  const raw = params.get("step")
  const [result, setResult] = React.useState<ClaimResult | null>(null)

  React.useEffect(() => {
    if (!isStep(raw)) router.replace("/claim?step=search")
  }, [raw, router])

  if (!isStep(raw)) return null

  const onFound = (r: ClaimResult) => {
    setResult(r)
    router.push("/claim?step=confirm")
  }
  if (raw === "confirm" && result) return <ConfirmStep result={result} onConfirm={() => router.push("/claim?step=setup")} />
  if (raw === "setup" && result) return <SetupStep result={result} />
  return <SearchStep onFound={onFound} />
}

function SearchStep({ onFound }: { onFound: (r: ClaimResult) => void }) {
  const [mode, setMode] = React.useState<"nip" | "name">("nip")
  const [claimCode, setClaimCode] = React.useState("")
  const [nip, setNip] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [dob, setDob] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  // Le code de réclamation est exigé dans tous les cas : c'est la preuve de
  // possession, sans elle un NIP (imprimé sur la carte) suffirait à revendiquer
  // l'identité de quelqu'un d'autre.
  const codeFilled = claimCode.replace(/[^0-9A-Za-z]/g, "").length === 12
  const canSubmit = codeFilled && (mode === "nip" ? nip.trim().length === 14 : Boolean(firstName.trim() && lastName.trim() && dob))
  const notFound =
    "Aucune identité réclamable ne correspond à ce code et à ces informations. Vérifie ton code de réclamation, ou rapproche-toi de l’agent qui t’a enrôlé."

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit || busy) return
    setError(null)
    setBusy(true)
    try {
      const identity = mode === "nip" ? { nip: nip.trim() } : { firstName: firstName.trim(), lastName: lastName.trim(), dateOfBirth: dob }
      const res = await fetch(`${CONVEX_SITE}/api/claim/lookup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...identity, claimCode: claimCode.trim() }),
      })
      const data = (await res.json()) as ClaimResult
      if (!data.found) {
        setError(notFound)
        return
      }
      onFound({ ...data, claimCode: claimCode.trim() })
    } catch {
      setError(notFound)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthScreen
      header={<AuthAppBar title="Récupérer mon compte" back="/sign-in" />}
      subHeader={<Stepper steps={CLAIM_STEPS} current={0} />}
      footer={
        <IdnButton type="submit" form="claim-search" full disabled={!canSubmit} loading={busy}>
          Rechercher
        </IdnButton>
      }
    >
      <ScreenTitle
        title="Retrouver mon identité"
        lead="Saisis le code de réclamation remis par l’agent, puis ton NIP ou tes nom et date de naissance."
      />
      <form id="claim-search" onSubmit={submit} className="mt-2">
        <IdnInput
          label="Code de réclamation"
          value={claimCode}
          onChange={(e) => setClaimCode(e.target.value)}
          placeholder="Ex : K7M2-9XQ4-B3TF"
          hint="Ce code figure sur le document que l’agent t’a remis lors de ton enrôlement. Il prouve que cette identité est bien la tienne."
          autoComplete="off"
          spellCheck={false}
          mono
          inputClassName="uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
        />
        {mode === "nip" ? (
          <IdnInput
            label="NIP (14 caractères)"
            value={nip}
            onChange={(e) => setNip(e.target.value.toUpperCase())}
            placeholder="Ex : A1B2C3D4E5F6G7"
            maxLength={14}
            mono
          />
        ) : (
          <>
            <IdnInput label="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
            <IdnInput label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            <IdnInput label="Date de naissance" type="date" value={dob} onChange={(e) => setDob(e.target.value)} autoComplete="bday" />
          </>
        )}
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "nip" ? "name" : "nip")}
        className="mt-4 rounded-[6px] text-sm font-semibold text-c-green-text outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
      >
        {mode === "nip" ? "Rechercher plutôt par nom" : "Rechercher plutôt par NIP"}
      </button>
      <ErrorNote>{error}</ErrorNote>
    </AuthScreen>
  )
}

function ConfirmStep({ result, onConfirm }: { result: ClaimResult; onConfirm: () => void }) {
  const loa = (result.loa === 2 || result.loa === 3 ? result.loa : 1) as 1 | 2 | 3
  return (
    <AuthScreen
      header={<AuthAppBar title="Récupérer mon compte" back="/claim?step=search" />}
      subHeader={<Stepper steps={CLAIM_STEPS} current={1} />}
      footer={
        <IdnButton full onClick={onConfirm}>
          C’est bien moi
        </IdnButton>
      }
    >
      <ScreenTitle title="Confirmer mon identité" lead="Vérifie que les informations ci-dessous correspondent bien à ton identité." />
      <Card className="mt-6">
        <dl className="divide-y divide-idn-border">
          <DetailRow label="Identifiant IDN" value={result.idnId ?? "—"} mono />
          <DetailRow label="Nom" value={result.firstName && result.lastName ? `${result.firstName} ${result.lastName}` : "—"} />
          <DetailRow label="Niveau de garantie" value={<LevelBadge level={loa} />} />
        </dl>
      </Card>
    </AuthScreen>
  )
}

const FORBIDDEN_PINS = new Set([
  "000000", "111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999",
  "123456", "654321", "012345", "543210",
])

function SetupStep({ result }: { result: ClaimResult }) {
  const [password, setPassword] = React.useState("")
  const [confirmPw, setConfirmPw] = React.useState("")
  const [pin, setPin] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const canSubmit = password.length >= 12 && confirmPw.length >= 12 && /^\d{6}$/.test(pin)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()
    if (!canSubmit || busy) return
    setError(null)
    if (password !== confirmPw) {
      setError("Les deux mots de passe sont différents.")
      return
    }
    if (FORBIDDEN_PINS.has(pin)) {
      setError("Ce code PIN est trop simple. Choisis-en un autre.")
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`${CONVEX_SITE}/api/claim/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delegatedIdentityId: result.delegatedIdentityId, claimCode: result.claimCode, password, pin }),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? "Impossible d’activer le compte. Réessaie.")
        return
      }
      setDone(true)
    } catch {
      setError("Impossible d’activer le compte. Réessaie.")
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthScreen
        header={<AuthAppBar title="Récupérer mon compte" />}
        footer={
          <IdnButton full href="/sign-in">
            Me connecter
          </IdnButton>
        }
      >
        <div className="mt-10 flex justify-center md:mt-2">
          <IdnLottie name="success" size={128} label="Identité activée" />
        </div>
        <ScreenTitle center title="Ton identité numérique est activée" lead="Connecte-toi avec ton adresse IDN et ton code PIN pour continuer." />
      </AuthScreen>
    )
  }

  return (
    <AuthScreen
      header={<AuthAppBar title="Récupérer mon compte" back="/claim?step=confirm" />}
      subHeader={<Stepper steps={CLAIM_STEPS} current={2} />}
      footer={
        <IdnButton type="submit" form="claim-setup" full disabled={!canSubmit} loading={busy}>
          Activer mon compte
        </IdnButton>
      }
    >
      <ScreenTitle title="Configurer mon compte" lead="Choisis un mot de passe et un code PIN pour sécuriser ton compte." />
      <form id="claim-setup" onSubmit={submit} className="mt-2">
        <IdnInput label="Mot de passe" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} hint="12 caractères au moins." />
        <IdnInput label="Confirmer le mot de passe" type="password" autoComplete="new-password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        <IdnInput
          label="Code PIN à 6 chiffres"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          hint="Il sert à te connecter et à valider les actions sensibles."
          mono
          inputClassName="tracking-[0.3em]"
        />
      </form>
      <ErrorNote>{error}</ErrorNote>
    </AuthScreen>
  )
}
