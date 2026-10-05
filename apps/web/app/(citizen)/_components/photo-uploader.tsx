"use client"

import * as React from "react"
import Cropper, { type Area } from "react-easy-crop"
import { useMutation } from "convex/react"

import { api } from "@repo/backend/convex/_generated/api"
import type { Id } from "@repo/backend/convex/_generated/dataModel"

import { IdnButton } from "@/app/_components/idn/button"
import { IdnDialog } from "@/app/_components/idn/dialog"
import { Icon } from "@/app/_components/idn/icons"
import { Avatar, ErrorNote } from "@/app/_components/idn/list"

const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 Mo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

/** Recadre l'image sur un carré de 512 px (avatar léger), en JPEG. */
async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      const canvas = document.createElement("canvas")
      const targetSize = 512
      canvas.width = targetSize
      canvas.height = targetSize
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, targetSize, targetSize)
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9)
    }
    image.onerror = () => reject(new Error("Lecture de l’image impossible."))
    image.src = imageSrc
  })
}

/**
 * Photo de profil de l'écran « Modifier mon profil » : avatar 92 px et
 * « Changer la photo » comme sur le mobile ; le web garde l'étape de
 * recadrage (le sélecteur natif du mobile recadre en carré).
 */
export function PhotoUploader({ initials, photoUrl }: { initials: string; photoUrl?: string | null }) {
  const [imageSrc, setImageSrc] = React.useState<string | null>(null)
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [area, setArea] = React.useState<Area | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cropError, setCropError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(api.profile.generateProfilePhotoUploadUrl)
  const setProfilePhoto = useMutation(api.profile.setProfilePhoto)

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError(null)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Format non pris en charge. Choisis une image JPEG, PNG ou WebP.")
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image trop lourde : 5 Mo au maximum.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropError(null)
    }
    reader.readAsDataURL(file)
  }

  const onCropComplete = React.useCallback((_: Area, pixels: Area) => setArea(pixels), [])

  async function save() {
    if (!imageSrc || !area) return
    setSubmitting(true)
    setCropError(null)
    try {
      const blob = await getCroppedBlob(imageSrc, area)
      if (!blob) throw new Error("Recadrage impossible.")
      const uploadUrl = await generateUploadUrl({})
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type }, body: blob })
      if (!res.ok) throw new Error("Envoi de la photo impossible.")
      const { storageId } = (await res.json()) as { storageId: string }
      await setProfilePhoto({ storageRef: storageId as Id<"_storage"> })
      setImageSrc(null)
    } catch (err) {
      setCropError(err instanceof Error ? err.message : "Envoi de la photo impossible.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex flex-col items-center gap-2 rounded-[14px] p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar photoUrl={photoUrl} initials={initials} size={92} />
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-c-green-text">
          <Icon name="camera" size={15} />
          Changer la photo
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        onChange={onFileChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <ErrorNote className="self-stretch">{error}</ErrorNote>

      <IdnDialog
        open={imageSrc !== null}
        onOpenChange={(o) => !o && !submitting && setImageSrc(null)}
        title="Recadrer la photo"
        description="Déplace et agrandis l’image pour centrer ton visage."
      >
        {imageSrc ? (
          <>
            <div className="relative mt-4 h-[300px] w-full overflow-hidden rounded-[14px] bg-idn-surface-2">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <label className="mt-4 flex items-center gap-3 text-[13px] text-idn-muted">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-idn-green"
              />
            </label>
          </>
        ) : null}
        <ErrorNote>{cropError}</ErrorNote>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <IdnButton variant="ghost" size="sm" className="min-h-11" disabled={submitting} onClick={() => setImageSrc(null)}>
            Annuler
          </IdnButton>
          <IdnButton size="sm" className="min-h-11" loading={submitting} onClick={save}>
            Enregistrer la photo
          </IdnButton>
        </div>
      </IdnDialog>
    </div>
  )
}
