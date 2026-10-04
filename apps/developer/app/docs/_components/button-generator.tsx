"use client"

import { useState } from "react"

import { cn } from "@repo/ui/lib/utils"

import { CodeBlock } from "../../_components/code-block"
import {
  BUTTON_LABELS,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  buttonCss,
  buttonReactCode,
  DEFAULT_BUTTON,
  IdnButtonPreview,
  type ButtonConfig,
} from "../../_components/idn-button"

function Choice<K extends keyof ButtonConfig>({
  legend,
  field,
  value,
  options,
  onChange,
}: {
  legend: string
  field: K
  value: ButtonConfig[K]
  options: Array<{ value: ButtonConfig[K]; label: string }>
  onChange: (field: K, value: ButtonConfig[K]) => void
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium text-idn-ink">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={String(option.value)}
            className={cn(
              "cursor-pointer rounded-[8px] border px-2.5 py-1 text-[13px] focus-within:outline-2 focus-within:outline-idn-green",
              value === option.value
                ? "border-idn-green bg-idn-green-soft text-idn-green dark:bg-[#0F2A18] dark:text-idn-green-on-dark"
                : "border-idn-border text-idn-ink-2 hover:bg-idn-surface-2",
            )}
          >
            <input
              type="radio"
              name={String(field)}
              className="sr-only"
              checked={value === option.value}
              onChange={() => onChange(field, option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Générateur : l'aperçu et le code suivent les réglages, valeurs de la charte. */
export function ButtonGenerator() {
  const [config, setConfig] = useState<ButtonConfig>(DEFAULT_BUTTON)
  const set = <K extends keyof ButtonConfig>(field: K, value: ButtonConfig[K]) =>
    setConfig((c) => ({ ...c, [field]: value }))
  return (
    <div className="mt-4 rounded-[14px] border border-idn-border bg-idn-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Variante" field="variant" value={config.variant} onChange={set}
          options={(Object.keys(BUTTON_VARIANTS) as Array<ButtonConfig["variant"]>).map((v) => ({ value: v, label: BUTTON_VARIANTS[v].label }))} />
        <Choice legend="Taille" field="size" value={config.size} onChange={set}
          options={(Object.keys(BUTTON_SIZES) as Array<ButtonConfig["size"]>).map((v) => ({ value: v, label: BUTTON_SIZES[v].label }))} />
        <Choice legend="Forme" field="shape" value={config.shape} onChange={set}
          options={[{ value: "arrondi", label: "Arrondi 10 px" }, { value: "pilule", label: "Pilule" }]} />
        <Choice legend="Libellé" field="label" value={config.label} onChange={set}
          options={(Object.keys(BUTTON_LABELS) as Array<ButtonConfig["label"]>).map((v) => ({ value: v, label: BUTTON_LABELS[v].fr }))} />
        <Choice legend="Langue" field="lang" value={config.lang} onChange={set}
          options={[{ value: "fr", label: "Français" }, { value: "en", label: "English" }]} />
        <Choice legend="Niveau exigé" field="level" value={config.level} onChange={set}
          options={[{ value: "none", label: "Aucun" }, { value: "2", label: "Niveau 2" }, { value: "3", label: "Niveau 3" }]} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="grid min-h-28 place-items-center rounded-[10px] border border-idn-border bg-white p-5">
          <IdnButtonPreview config={config} />
        </div>
        <div className="grid min-h-28 place-items-center rounded-[10px] border border-idn-border bg-[#16170F] p-5">
          {config.variant === "sombre" ? (
            <p className="text-center text-[13px] text-[#D4D2C7]">Variante Sombre interdite sur fond sombre.</p>
          ) : (
            <IdnButtonPreview config={config} />
          )}
        </div>
      </div>
      <CodeBlock title="bouton-idn.css" code={buttonCss(config)} className="mt-4" />
      <CodeBlock title="bouton-idn.tsx" code={buttonReactCode(config)} className="mt-3" />
    </div>
  )
}
