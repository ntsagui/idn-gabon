/** CSV « Excel français » : séparateur point-virgule, BOM UTF-8, champs échappés. */
export function toCsv(header: string[], rows: Array<Array<string | number | undefined>>): string {
  const cell = (value: string | number | undefined) => {
    const text = value === undefined ? "" : String(value)
    return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  return "﻿" + [header, ...rows].map((row) => row.map(cell).join(";")).join("\r\n")
}

export function downloadText(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
