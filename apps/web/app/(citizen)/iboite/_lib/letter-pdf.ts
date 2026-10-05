/**
 * Génère un PDF A4 à partir d'un élément DOM représentant une feuille de
 * courrier déjà mise au format papier (typiquement 210mm de large).
 *
 * Algorithme :
 *  1. Snapshot de l'élément en canvas via html2canvas-pro (qui supporte les
 *     couleurs Tailwind v4 `oklch()`).
 *  2. Calcule le ratio largeur réelle → 210mm A4.
 *  3. Découpe la hauteur en pages : pour chaque page, ajoute une portion du
 *     canvas via `addImage` sur le PDF.
 *
 * Les imports sont dynamiques : jspdf dépend de `fflate` qui référence
 * `worker_threads` dans son bundle CJS — Next.js refuse de les inclure en
 * SSR. En les chargeant via `await import()` uniquement à l'appel (donc
 * côté navigateur), on contourne le problème sans `next.config` custom.
 */
export async function exportLetterToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ])

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
    // Sur le clone : on neutralise tout ce qui n'appartient pas à la feuille
    // (ombre, coins arrondis) pour que le PDF ressemble à une vraie page A4
    // posée à plat — pas à un screenshot de l'app.
    onclone: (_doc, clone) => {
      const html = clone as HTMLElement
      html.style.boxShadow = "none"
      html.style.borderRadius = "0"
      html.style.border = "0"
      html.style.margin = "0"
    },
  })

  const pdf = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "portrait",
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  const ratio = pageWidth / canvas.width
  const totalHeightMm = canvas.height * ratio

  // Tolérance 1mm — un rendu de feuille A4 produit souvent 297.1mm à cause
  // des arrondis pixel/mm. Sans tolérance on bascule à tort en multi-pages.
  if (totalHeightMm <= pageHeight + 1) {
    // Une seule page : on impose la hauteur exacte de la feuille A4 plutôt
    // que `totalHeightMm`. Si le contenu fait 296.9mm, on remplit jusqu'à
    // 297 — sinon on aurait une bande blanche en bas du PDF.
    pdf.addImage(
      canvas.toDataURL("image/jpeg", 0.92),
      "JPEG",
      0,
      0,
      pageWidth,
      pageHeight,
    )
  } else {
    // Multi-pages : on découpe le canvas source en blocs de hauteur =
    // pageHeight / ratio (en pixels source).
    const pageHeightPx = Math.floor(pageHeight / ratio)
    const pages = Math.ceil(canvas.height / pageHeightPx)
    for (let i = 0; i < pages; i++) {
      const sourceY = i * pageHeightPx
      const sliceHeight = Math.min(pageHeightPx, canvas.height - sourceY)
      const slice = document.createElement("canvas")
      slice.width = canvas.width
      slice.height = sliceHeight
      const ctx = slice.getContext("2d")
      if (!ctx) throw new Error("canvas context unavailable")
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      )
      if (i > 0) pdf.addPage()
      pdf.addImage(
        slice.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        pageWidth,
        sliceHeight * ratio,
      )
    }
  }

  pdf.save(filename)
}

/**
 * Nettoie une chaîne pour en faire un nom de fichier sûr (ASCII, espaces →
 * underscores, sans extension).
 */
export function safeFilename(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80) || "courrier"
  )
}
