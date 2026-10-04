"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon, ImageOffIcon, MaximizeIcon, MinusIcon, PlusIcon, RotateCwIcon } from "lucide-react"

import { Button } from "@repo/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@repo/ui/components/dialog"
import { cn } from "@repo/ui/lib/utils"

export type ViewerImage = { label: string; url: string | null }

const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3, 4]

/**
 * Pièces d'un dossier côte à côte, chacune agrandissable : zoom (boutons ou
 * + / − / 0), rotation, passage d'une pièce à l'autre (← / →).
 */
export function DocumentGallery({ images, className }: { images: ViewerImage[]; className?: string }) {
  const [open, setOpen] = React.useState<number | null>(null)
  return (
    <>
      <ul className={cn("grid gap-3 sm:grid-cols-3", className)}>
        {images.map((image, index) => (
          <li key={image.label}>
            {image.url ? (
              <button
                type="button"
                onClick={() => setOpen(index)}
                className="group block w-full overflow-hidden rounded-lg border border-idn-border bg-idn-surface-2 text-left transition-colors duration-150 hover:border-idn-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex aspect-[1.58/1] items-center justify-center overflow-hidden bg-[#E9E7E0] dark:bg-[#10120e]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt={image.label} className="size-full object-contain" />
                </span>
                <span className="flex items-center justify-between gap-2 border-t border-idn-border px-3 py-2">
                  <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-ink-2">
                    {image.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-idn-muted group-hover:text-idn-ink">
                    <MaximizeIcon aria-hidden className="size-3.5" />
                    Agrandir
                  </span>
                </span>
              </button>
            ) : (
              <div className="overflow-hidden rounded-lg border border-dashed border-idn-border">
                <div className="flex aspect-[1.58/1] flex-col items-center justify-center gap-1 text-idn-muted">
                  <ImageOffIcon aria-hidden className="size-5" />
                  <span className="text-xs">Non fournie</span>
                </div>
                <p className="border-t border-dashed border-idn-border px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-idn-muted">
                  {image.label}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {open !== null && (
        <ImageViewer images={images.filter((i) => i.url)} startAt={images.filter((i) => i.url).indexOf(images[open]!)} onClose={() => setOpen(null)} />
      )}
    </>
  )
}

function ImageViewer({ images, startAt, onClose }: { images: ViewerImage[]; startAt: number; onClose: () => void }) {
  const [index, setIndex] = React.useState(Math.max(0, startAt))
  const [zoom, setZoom] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const image = images[index]!

  const go = (delta: number) => {
    setIndex((i) => (i + delta + images.length) % images.length)
    setZoom(1)
    setRotation(0)
  }
  const step = (delta: number) =>
    setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, ZOOMS.indexOf(z) + delta))] ?? 1)

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight") go(1)
    else if (event.key === "ArrowLeft") go(-1)
    else if (event.key === "+" || event.key === "=") step(1)
    else if (event.key === "-") step(-1)
    else if (event.key === "0") setZoom(1)
    else return
    event.preventDefault()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onKeyDown={onKeyDown}
        className="flex h-[min(92vh,900px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1200px]"
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-idn-border px-4 py-3 pr-12">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-sm font-semibold">{image.label}</DialogTitle>
            <DialogDescription className="text-xs">
              Pièce {index + 1} sur {images.length} · ← → pour changer, + / − pour zoomer, 0 pour revenir à 100 %
            </DialogDescription>
          </div>
          <div className="flex items-center gap-1">
            {images.length > 1 && (
              <>
                <Button variant="outline" size="icon-sm" onClick={() => go(-1)} aria-label="Pièce précédente">
                  <ChevronLeftIcon aria-hidden />
                </Button>
                <Button variant="outline" size="icon-sm" onClick={() => go(1)} aria-label="Pièce suivante">
                  <ChevronRightIcon aria-hidden />
                </Button>
              </>
            )}
            <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label="Dézoomer">
              <MinusIcon aria-hidden />
            </Button>
            <span className="w-14 text-center font-mono text-xs tabular-nums text-idn-ink-2" aria-live="polite">
              {Math.round(zoom * 100)} %
            </span>
            <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label="Zoomer">
              <PlusIcon aria-hidden />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              aria-label="Pivoter de 90 degrés"
            >
              <RotateCwIcon aria-hidden />
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-[#E9E7E0] dark:bg-[#10120e]">
          <div className="flex min-h-full min-w-full items-center justify-center p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url!}
              alt={image.label}
              style={{ transform: `rotate(${rotation}deg)`, width: `${zoom * 100}%`, maxWidth: "none" }}
              className="h-auto max-h-none transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
