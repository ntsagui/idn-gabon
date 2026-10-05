"use client"

import * as React from "react"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import TextAlign from "@tiptap/extension-text-align"
import Link from "@tiptap/extension-link"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  ItalicIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  MinusIcon,
  RedoIcon,
  UnderlineIcon,
  UndoIcon,
} from "lucide-react"

import { cn } from "@repo/ui/lib/utils"

import { letterEditorContent } from "../_content/letter-editor"
import "../_lib/letter-content.css"

type ToolbarItemBase = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive?: () => boolean
  isDisabled?: () => boolean
}
type ToolbarButton = ToolbarItemBase & {
  kind: "button"
  onClick: () => void
}
type ToolbarSeparator = { kind: "separator" }
type ToolbarItem = ToolbarButton | ToolbarSeparator

export type LetterEditorHandle = {
  /** Renvoie l'HTML courant. `null` si l'éditeur n'est pas prêt. */
  getHtml: () => string | null
  /** Vrai si le document est vide (utile pour la validation à l'envoi). */
  isEmpty: () => boolean
  /** Donne le focus à la zone d'édition. */
  focus: () => void
}

export const LetterEditor = React.forwardRef<
  LetterEditorHandle,
  {
    initialHtml?: string
    /** Callback d'upload d'image : doit retourner l'URL durable insérée dans
     *  l'HTML. Lève une exception en cas d'échec pour qu'un toast prévienne
     *  l'utilisateur — sinon TipTap rendrait une image cassée. */
    onUploadImage: (file: File) => Promise<string>
    onUploadError?: (err: unknown) => void
    className?: string
  }
>(function LetterEditor(
  { initialHtml, onUploadImage, onUploadError, className },
  ref,
) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  // Évite les rerenders : la callback d'upload est stockée dans un ref, mais
  // doit rester à jour pour capter le bon `accountId` du parent.
  const uploadRef = React.useRef(onUploadImage)
  React.useEffect(() => {
    uploadRef.current = onUploadImage
  }, [onUploadImage])

  const editor = useEditor({
    // Désactive le rendu immédiat pour éviter l'hydration mismatch en SSR
    // (Next.js App Router).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // L'extension Link est ajoutée séparément avec sa config (target,
        // etc.). Underline reste activée par StarterKit v3 par défaut.
        link: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Image.configure({
        // Largeur naturelle, mais on plafonne en CSS via la classe `prose`
        // appliquée à l'éditeur.
        inline: false,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
          class: "underline text-idn-green",
        },
      }),
    ],
    content: initialHtml ?? "",
    editorProps: {
      attributes: {
        // La classe `letter-content` style les balises HTML (p, h1, listes,
        // etc.). Le fond blanc et la couleur foncée viennent du parent
        // `.letter-paper` — pas de couleur ici pour éviter toute surcharge
        // dark mode involontaire.
        class: "letter-content min-h-[50vh] focus:outline-none md:min-h-[200mm]",
      },
    },
  })

  React.useImperativeHandle(
    ref,
    () => ({
      getHtml: () => editor?.getHTML() ?? null,
      isEmpty: () => (editor?.getText().trim().length ?? 0) === 0,
      focus: () => editor?.commands.focus(),
    }),
    [editor],
  )

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !editor) return
    try {
      const url = await uploadRef.current(file)
      editor.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch (err) {
      onUploadError?.(err)
    }
  }

  const items: ToolbarItem[] = React.useMemo(() => {
    if (!editor) return []
    return [
      {
        kind: "button",
        icon: UndoIcon,
        label: letterEditorContent.toolbar.undo,
        onClick: () => editor.chain().focus().undo().run(),
        isDisabled: () => !editor.can().undo(),
      },
      {
        kind: "button",
        icon: RedoIcon,
        label: letterEditorContent.toolbar.redo,
        onClick: () => editor.chain().focus().redo().run(),
        isDisabled: () => !editor.can().redo(),
      },
      { kind: "separator" },
      {
        kind: "button",
        icon: BoldIcon,
        label: letterEditorContent.toolbar.bold,
        onClick: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive("bold"),
      },
      {
        kind: "button",
        icon: ItalicIcon,
        label: letterEditorContent.toolbar.italic,
        onClick: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive("italic"),
      },
      {
        kind: "button",
        icon: UnderlineIcon,
        label: letterEditorContent.toolbar.underline,
        onClick: () => editor.chain().focus().toggleUnderline().run(),
        isActive: () => editor.isActive("underline"),
      },
      { kind: "separator" },
      {
        kind: "button",
        icon: Heading1Icon,
        label: letterEditorContent.toolbar.h1,
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
        isActive: () => editor.isActive("heading", { level: 1 }),
      },
      {
        kind: "button",
        icon: Heading2Icon,
        label: letterEditorContent.toolbar.h2,
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
        isActive: () => editor.isActive("heading", { level: 2 }),
      },
      {
        kind: "button",
        icon: Heading3Icon,
        label: letterEditorContent.toolbar.h3,
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 3 }).run(),
        isActive: () => editor.isActive("heading", { level: 3 }),
      },
      { kind: "separator" },
      {
        kind: "button",
        icon: AlignLeftIcon,
        label: letterEditorContent.toolbar.alignLeft,
        onClick: () => editor.chain().focus().setTextAlign("left").run(),
        isActive: () => editor.isActive({ textAlign: "left" }),
      },
      {
        kind: "button",
        icon: AlignCenterIcon,
        label: letterEditorContent.toolbar.alignCenter,
        onClick: () => editor.chain().focus().setTextAlign("center").run(),
        isActive: () => editor.isActive({ textAlign: "center" }),
      },
      {
        kind: "button",
        icon: AlignRightIcon,
        label: letterEditorContent.toolbar.alignRight,
        onClick: () => editor.chain().focus().setTextAlign("right").run(),
        isActive: () => editor.isActive({ textAlign: "right" }),
      },
      {
        kind: "button",
        icon: AlignJustifyIcon,
        label: letterEditorContent.toolbar.alignJustify,
        onClick: () => editor.chain().focus().setTextAlign("justify").run(),
        isActive: () => editor.isActive({ textAlign: "justify" }),
      },
      { kind: "separator" },
      {
        kind: "button",
        icon: ListIcon,
        label: letterEditorContent.toolbar.bulletList,
        onClick: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive("bulletList"),
      },
      {
        kind: "button",
        icon: ListOrderedIcon,
        label: letterEditorContent.toolbar.orderedList,
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive("orderedList"),
      },
      {
        kind: "button",
        icon: MinusIcon,
        label: letterEditorContent.toolbar.horizontalRule,
        onClick: () => editor.chain().focus().setHorizontalRule().run(),
      },
      { kind: "separator" },
      {
        kind: "button",
        icon: Link2Icon,
        label: letterEditorContent.toolbar.link,
        onClick: () => {
          const previous = editor.getAttributes("link").href as
            | string
            | undefined
          const url = window.prompt(letterEditorContent.linkPrompt, previous ?? "")
          if (url === null) return
          if (url === "") {
            editor.chain().focus().unsetLink().run()
            return
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
        },
        isActive: () => editor.isActive("link"),
      },
      {
        kind: "button",
        icon: ImageIcon,
        label: letterEditorContent.toolbar.image,
        onClick: openFilePicker,
      },
    ]
  }, [editor])

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-[10px] border border-idn-border bg-idn-surface",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label={letterEditorContent.toolbarLabel}
        className="flex flex-wrap items-center gap-0.5 border-b border-idn-border bg-idn-surface-2 px-1.5 py-1"
      >
        {items.map((item, i) =>
          item.kind === "separator" ? (
            <div
              key={`sep-${i}`}
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-idn-border"
            />
          ) : (
            <ToolbarButtonView key={`${item.label}-${i}`} item={item} />
          ),
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handlePickImage}
        />
      </div>

      <div className="flex-1 overflow-auto bg-idn-surface-2 p-2 md:p-6">
        {/* Feuille A4 stricte (210×297mm min). `.letter-paper` impose les
            dimensions, le fond blanc et la couleur foncée — peu importe le
            thème de l'app. Indispensable pour que l'export PDF capture une
            feuille papier propre, pas une capture en dark mode. */}
        <div className="letter-paper focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-idn-green">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
})

function ToolbarButtonView({ item }: { item: ToolbarButton }) {
  const Icon = item.icon
  const active = item.isActive?.() ?? false
  const disabled = item.isDisabled?.() ?? false
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      aria-pressed={active}
      disabled={disabled}
      title={item.label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-idn-ink-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-idn-green text-white hover:bg-idn-green-dark"
          : "hover:bg-idn-surface hover:text-idn-ink",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  )
}

/**
 * Lecture d’un courrier rédigé avec l’éditeur (HTML). Le contenu est relu par
 * le schéma de l’éditeur, en lecture seule : seules les balises et attributs
 * connus (paragraphes, titres, listes, liens http, images) sont rendus, ce qui
 * neutralise tout script ou attribut d’événement venu d’un expéditeur.
 */
export function LetterBody({ html, className }: { html: string; className?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({ link: false }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: true, autolink: false, HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } }),
    ],
    content: html,
    editorProps: { attributes: { class: "letter-content focus:outline-none" } },
  })
  return <EditorContent editor={editor} className={className} />
}
