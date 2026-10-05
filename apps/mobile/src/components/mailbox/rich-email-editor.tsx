"use dom"

import React from "react"
import { isHtmlLetterBody, plainTextToLetterHtml } from "@/lib/letter-content"

type Props = {
  initialHtml: string
  onChange: (html: string) => Promise<void>
  theme: {
    dark: boolean
    background: string
    surface: string
    foreground: string
    muted: string
    border: string
    active: string
    link: string
  }
  dom?: import("expo/dom").DOMProps
}

export default function RichEmailEditor({ initialHtml, onChange, theme }: Props) {
  const editorRef = React.useRef<HTMLDivElement>(null)
  const changeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (!editorRef.current) return
    editorRef.current.innerHTML = isHtmlLetterBody(initialHtml)
      ? initialHtml
      : plainTextToLetterHtml(initialHtml)
  }, [initialHtml])

  React.useEffect(
    () => () => {
      if (changeTimer.current) clearTimeout(changeTimer.current)
    },
    [],
  )

  function emitChange() {
    if (!editorRef.current) return
    if (changeTimer.current) clearTimeout(changeTimer.current)
    changeTimer.current = setTimeout(() => {
      if (editorRef.current) void onChange(editorRef.current.innerHTML)
    }, 100)
  }

  function command(name: string) {
    editorRef.current?.focus()
    document.execCommand(name)
    emitChange()
  }

  function addLink() {
    const url = window.prompt("Adresse du lien (https://…)")
    if (url?.startsWith("https://") || url?.startsWith("http://")) {
      editorRef.current?.focus()
      document.execCommand("createLink", false, url)
      emitChange()
    }
  }

  const actions = [
    { label: "G", title: "Gras", command: "bold" },
    { label: "I", title: "Italique", command: "italic" },
    { label: "S", title: "Souligné", command: "underline" },
    { label: "•", title: "Liste à puces", command: "insertUnorderedList" },
    { label: "1.", title: "Liste numérotée", command: "insertOrderedList" },
  ] as const

  return (
    <main>
      <div
        ref={editorRef}
        className="editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Ton message…"
        onInput={emitChange}
        aria-label="Rédiger le message"
      />
      <nav aria-label="Mise en forme du message">
        {actions.map((action) => (
          <button
            key={action.command}
            type="button"
            title={action.title}
            aria-label={action.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => command(action.command)}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          title="Ajouter un lien"
          aria-label="Ajouter un lien"
          onMouseDown={(event) => event.preventDefault()}
          onClick={addLink}
        >
          🔗
        </button>
      </nav>
      <style>{`
        * { box-sizing: border-box; }
        :root { color-scheme: ${theme.dark ? "dark" : "light"}; }
        html, body, #root, main { margin: 0; min-height: 100%; background: ${theme.background}; }
        main { display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: ${theme.foreground}; }
        .editor { flex: 1; min-height: 240px; padding: 16px 2px; outline: none; font-size: 15px; line-height: 1.55; overflow-wrap: anywhere; }
        .editor:empty::before { content: attr(data-placeholder); color: ${theme.muted}; pointer-events: none; }
        .editor p { margin: 0 0 .75em; }
        .editor ul, .editor ol { padding-left: 1.5em; }
        .editor a { color: ${theme.link}; text-decoration: underline; }
        nav { position: sticky; bottom: 0; display: flex; gap: 4px; padding: 7px 0; border-top: 1px solid ${theme.border}; background: ${theme.surface}; }
        button { min-width: 34px; height: 32px; padding: 0 8px; border: 0; border-radius: 7px; background: transparent; color: ${theme.foreground}; font-size: 13px; font-weight: 600; }
        button:active { background: ${theme.active}; }
      `}</style>
    </main>
  )
}
