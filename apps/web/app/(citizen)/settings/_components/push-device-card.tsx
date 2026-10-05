"use client"

import * as React from "react"
import { useMutation, useQuery } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"

import { cleanError } from "@/app/_components/idn/dialog"
import { Card, ErrorNote, Note, Row, RowAction } from "@/app/_components/idn/list"
import {
  currentPushSubscription,
  getOrCreatePushSubscription,
  isInstalledPwa,
  isIosDevice,
  registerServiceWorker,
  subscriptionPayload,
  supportsPushNotifications,
} from "@/lib/pwa"

/**
 * Notifications sur cet appareil (Web Push). Propre au web : le mobile
 * reçoit ses notifications push natives ; le navigateur doit s'abonner.
 * Reprend la fonction de l'ancien onglet Notifications (`PwaDeviceSettings`).
 */
export function PushDeviceCard() {
  const status = useQuery(api.pushSubscriptions.getMyStatus, {})
  const subscribe = useMutation(api.pushSubscriptions.subscribe)
  const unsubscribe = useMutation(api.pushSubscriptions.unsubscribe)
  const [permission, setPermission] = React.useState<NotificationPermission | "unsupported">("unsupported")
  const [iosBrowser, setIosBrowser] = React.useState(false)
  const [subscribed, setSubscribed] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setIosBrowser(isIosDevice() && !isInstalledPwa())
    setPermission(supportsPushNotifications() ? Notification.permission : "unsupported")
    void registerServiceWorker()
    void currentPushSubscription().then((s) => setSubscribed(!!s))
  }, [])

  async function enable() {
    if (!status?.publicKey) return
    setPending(true)
    setError(null)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") return
      const sub = await getOrCreatePushSubscription(status.publicKey)
      await subscribe(subscriptionPayload(sub))
      setSubscribed(true)
    } catch (e) {
      setError(e instanceof Error ? cleanError(e.message) : "Activation impossible.")
    } finally {
      setPending(false)
    }
  }

  async function disable() {
    setPending(true)
    setError(null)
    try {
      const sub = await currentPushSubscription()
      if (sub) {
        await unsubscribe({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (e) {
      setError(e instanceof Error ? cleanError(e.message) : "Désactivation impossible.")
    } finally {
      setPending(false)
    }
  }

  let sub: string
  let action: React.ReactNode = null
  if (status === undefined) sub = "Chargement…"
  else if (!status.configured) sub = "Pas encore disponible sur le service IDN"
  else if (iosBrowser) sub = "Sur iPhone : Safari, Partager, « Sur l’écran d’accueil », puis active-les dans l’app installée."
  else if (permission === "unsupported") sub = "Ce navigateur ne prend pas en charge les notifications."
  else if (permission === "denied") sub = "Bloquées dans les réglages du navigateur"
  else if (permission === "granted" && subscribed) {
    sub = "Activées sur cet appareil"
    action = (
      <RowAction danger disabled={pending} onClick={() => void disable()}>
        Désactiver
      </RowAction>
    )
  } else {
    sub = "Reçois tes alertes même quand le site est fermé"
    action = (
      <RowAction disabled={pending} onClick={() => void enable()}>
        Activer
      </RowAction>
    )
  }

  return (
    <>
      <Card>
        <Row icon="bell" tone="green" title="Sur cet appareil" sub={sub} right={action} />
      </Card>
      <Note className="mt-2">Notifications du navigateur, comme les notifications push de l’app mobile.</Note>
      <ErrorNote>{error}</ErrorNote>
    </>
  )
}
