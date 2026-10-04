"use client"

import { forwardRef, useState, type ComponentProps } from "react"

import { Input } from "@repo/ui/components/input"

import { Icon } from "../../_components/icons"

/** Champ mot de passe avec bouton afficher / masquer accessible. */
export const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? "text" : "password"} className="h-11 pr-11" {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-idn-muted hover:text-idn-ink focus-visible:outline-2 focus-visible:outline-idn-green"
        >
          <Icon name={visible ? "eyeOff" : "eye"} size={17} />
        </button>
      </div>
    )
  },
)
