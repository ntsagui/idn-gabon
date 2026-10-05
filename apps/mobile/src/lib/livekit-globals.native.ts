import { registerGlobals } from "@livekit/react-native"

/**
 * Hermes n'expose pas de constructeur `Event` global. Or les correctifs
 * webrtc-adapter embarqués par livekit-client font `new Event('track')`
 * (et `instanceof Event`) à la réception d'une piste distante : sans ce
 * constructeur, la vidéo du contrôleur n'arrivait jamais à l'écran
 * (« ReferenceError: Property 'Event' doesn't exist »). L'objet n'a besoin
 * que de `type` : `dispatchEvent` de react-native-webrtc l'enveloppe.
 */
function ensureEventConstructor() {
  const g = globalThis as { Event?: unknown }
  if (typeof g.Event === "function") return
  class EventPolyfill {
    readonly type: string
    readonly bubbles: boolean
    readonly cancelable: boolean
    readonly timeStamp = Date.now()
    defaultPrevented = false
    constructor(type: string, init?: { bubbles?: boolean; cancelable?: boolean }) {
      this.type = type
      this.bubbles = !!init?.bubbles
      this.cancelable = !!init?.cancelable
    }
    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true
    }
    stopPropagation() {}
    stopImmediatePropagation() {}
  }
  g.Event = EventPolyfill
}

export function registerLiveKitGlobals() {
  ensureEventConstructor()
  registerGlobals()
}
