import React from "react"
import { Platform, Pressable, View } from "react-native";
import { Text } from "@/design/text";
import type { TrackReference } from "@livekit/react-native"
import { ConnectionState, Track } from "livekit-client"

import { Icon } from "@/design/icons"

type Credentials = { serverUrl: string; token: string; roomName: string }

function getNativeLiveKit() {
  return require("@livekit/react-native") as typeof import("@livekit/react-native")
}

export function NativeLiveKitRoom({
  credentials,
  controllerName,
  onLeave,
  onError,
}: {
  credentials: Credentials
  controllerName?: string
  onLeave: () => void
  onError: (message: string) => void
}) {
  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 28,
        }}
      >
        <Text style={{ textAlign: "center" }}>
          L’entretien vidéo est disponible dans l’application iOS ou Android.
        </Text>
      </View>
    )
  }
  const { LiveKitRoom } = getNativeLiveKit()
  return (
    <LiveKitRoom
      serverUrl={credentials.serverUrl}
      token={credentials.token}
      connect
      audio
      video
      options={{ adaptiveStream: true, dynacast: true }}
      onDisconnected={onLeave}
      onError={(error) => onError(error.message)}
    >
      <RoomContent controllerName={controllerName} onLeave={onLeave} onError={onError} />
    </LiveKitRoom>
  )
}

function RoomContent({
  controllerName,
  onLeave,
  onError,
}: {
  controllerName?: string
  onLeave: () => void
  onError: (message: string) => void
}) {
  const { isTrackReference, useConnectionState, useRoomContext, useTracks, VideoTrack } =
    getNativeLiveKit()
  const room = useRoomContext()
  const connection = useConnectionState()
  const connected = connection === ConnectionState.Connected
  // LiveKit retente en silence : au-delà de 15 s sans connexion, on le dit.
  const [stalled, setStalled] = React.useState(false)
  React.useEffect(() => {
    if (connected) {
      setStalled(false)
      return
    }
    const timer = setTimeout(() => setStalled(true), 15_000)
    return () => clearTimeout(timer)
  }, [connected])
  const tracks = useTracks([Track.Source.Camera])
  const references = tracks.filter(isTrackReference) as TrackReference[]
  const remote = references.find((reference) => !reference.participant.isLocal)
  const local = references.find((reference) => reference.participant.isLocal)
  const [camera, setCamera] = React.useState(true)
  const [microphone, setMicrophone] = React.useState(true)

  async function toggleCamera() {
    try {
      const next = !camera
      await room.localParticipant.setCameraEnabled(next)
      setCamera(next)
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Caméra indisponible.")
    }
  }

  async function toggleMicrophone() {
    try {
      const next = !microphone
      await room.localParticipant.setMicrophoneEnabled(next)
      setMicrophone(next)
    } catch (caught) {
      onError(
        caught instanceof Error ? caught.message : "Microphone indisponible.",
      )
    }
  }

  async function leave() {
    await room.disconnect()
    onLeave()
  }

  const initials = (controllerName ?? "Contrôleur")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <View style={{ flex: 1, paddingHorizontal: 16 }}>
      <View style={{ flex: 1, borderRadius: 20, backgroundColor: "#181C16", overflow: "hidden" }}>
        {remote ? (
          <VideoTrack trackRef={remote} style={{ flex: 1 }} objectFit="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }}>
            <View style={{ width: 84, height: 84, borderRadius: 9999, backgroundColor: "#2C3128", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "600" }}>{initials}</Text>
            </View>
            <Text accessibilityLiveRegion="polite" style={{ color: "#fff", fontSize: 15, fontWeight: "600", marginTop: 14 }}>
              {connected ? "En attente du contrôleur…" : stalled ? "Le serveur d’entretien ne répond pas" : "Connexion à la salle…"}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.62)", fontSize: 13, marginTop: 6, textAlign: "center" }}>
              {connected
                ? "Garde cette salle ouverte. La connexion est chiffrée."
                : stalled
                  ? "Vérifie ta connexion Internet. Si le problème persiste, raccroche et réessaie plus tard."
                  : "Quelques secondes."}
            </Text>
          </View>
        )}
        <View style={{ position: "absolute", left: 12, bottom: 12, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: "rgba(0,0,0,0.55)" }}>
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{controllerName ?? "Contrôleur IDN"}</Text>
        </View>
        <View style={{ position: "absolute", right: 10, top: 10, width: 92, height: 124, borderRadius: 14, overflow: "hidden", backgroundColor: "#2C3128", alignItems: "center", justifyContent: "center" }}>
          {local && camera ? (
            <VideoTrack trackRef={local} style={{ width: 92, height: 124 }} objectFit="cover" mirror zOrder={1} />
          ) : (
            <Icon name="videoOff" size={22} color="rgba(255,255,255,0.7)" />
          )}
          {!microphone ? (
            <View style={{ position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: 9999, backgroundColor: "#B3261E", alignItems: "center", justifyContent: "center" }}>
              <Icon name="micOff" size={12} color="#fff" />
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-around", paddingTop: 18, paddingBottom: 8 }}>
        <Control icon={microphone ? "mic" : "micOff"} label={microphone ? "Couper le micro" : "Activer le micro"} active={microphone} onPress={() => void toggleMicrophone()} />
        <Control icon={camera ? "video" : "videoOff"} label={camera ? "Couper la caméra" : "Activer la caméra"} active={camera} onPress={() => void toggleCamera()} />
        <Control icon="phoneOff" label="Raccrocher" danger onPress={() => void leave()} />
      </View>
    </View>
  )
}

function Control({
  icon,
  label,
  active = true,
  danger,
  onPress,
}: {
  icon: "mic" | "micOff" | "video" | "videoOff" | "phoneOff"
  label: string
  active?: boolean
  danger?: boolean
  onPress: () => void
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: "center", gap: 8, width: 96 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 9999,
          backgroundColor: danger ? "#B3261E" : active ? "#2C3128" : "#F2F0E8",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={22} color={danger || active ? "#fff" : "#16170F"} />
      </View>
      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, textAlign: "center" }}>{label}</Text>
    </Pressable>
  )
}
