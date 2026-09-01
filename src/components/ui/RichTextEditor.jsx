// RichTextEditor — a Tiptap-backed WYSIWYG editor with a small fixed
// toolbar (bold/italic/strike/headings/lists/blockquote/code/link/undo-redo).
// Value is an HTML string in, HTML string out — same shape as every other
// text-ish field in this app (Field.Textarea stores a plain string; this
// stores markup instead, but the contract with the caller/useForm is
// identical: controlled value + onChange(string)).
//
//   <RichTextEditor value={html} onChange={setHtml} placeholder="Write something…" />
//
// For the useForm-integrated version, use Field.RichText instead (same
// props as every other Field.* — label/error/hint/required/disabled) — see
// components/forms/Field.jsx.
//
// Extensions loaded: StarterKit (bold, italic, strike, headings, bullet/
// ordered lists, blockquote, code, code block, horizontal rule, undo/redo)
// plus Link and Placeholder. Add more by importing the extension and
// pushing it into the `extensions` array below — every Tiptap extension
// works the same way, so this is the entire integration surface for
// growing the editor's feature set later (tables, images, mentions, etc.).

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  IconBold, IconItalic, IconStrikethrough, IconCode, IconBlockquote,
  IconList, IconListNumbers, IconLink, IconLinkOff, IconArrowBackUp,
  IconArrowForwardUp, IconH1, IconH2,
} from '@tabler/icons-react'

function ToolbarButton({ active, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      className={`rte-toolbar-btn${active ? ' active' : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      // Tiptap's selection state is lost if the toolbar button steals focus
      // before its click handler runs — mousedown fires first and would
      // blur the editor, which is why onMouseDown (not the button itself)
      // prevents default here rather than on click.
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }) {
  if (!editor) return null

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('Link URL', previousUrl || 'https://')
    if (url === null) return // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="rte-toolbar">
      <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <IconBold size={15} />
      </ToolbarButton>
      <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <IconItalic size={15} />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <IconStrikethrough size={15} />
      </ToolbarButton>
      <ToolbarButton title="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <IconCode size={15} />
      </ToolbarButton>

      <div className="rte-toolbar-divider" />

      <ToolbarButton title="Heading 1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <IconH1 size={15} />
      </ToolbarButton>
      <ToolbarButton title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <IconH2 size={15} />
      </ToolbarButton>

      <div className="rte-toolbar-divider" />

      <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <IconList size={15} />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <IconListNumbers size={15} />
      </ToolbarButton>
      <ToolbarButton title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <IconBlockquote size={15} />
      </ToolbarButton>

      <div className="rte-toolbar-divider" />

      <ToolbarButton title="Add link" active={editor.isActive('link')} onClick={setLink}>
        <IconLink size={15} />
      </ToolbarButton>
      <ToolbarButton title="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}>
        <IconLinkOff size={15} />
      </ToolbarButton>

      <div className="rte-toolbar-divider" />

      <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
        <IconArrowBackUp size={15} />
      </ToolbarButton>
      <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
        <IconArrowForwardUp size={15} />
      </ToolbarButton>
    </div>
  )
}

export default function RichTextEditor({
  value, onChange, onBlur, placeholder = 'Write something…', disabled = false, minHeight = 140, error,
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: e }) => onChange?.(e.getHTML()),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: { class: 'rte-content' },
    },
  })

  // Keep the editor in sync when `value` changes from OUTSIDE (form reset,
  // loading a different record) — but not on every keystroke, which would
  // fight the user's own typing by resetting cursor position on each
  // onUpdate-triggered re-render. Comparing against editor.getHTML() is
  // what tells the two cases apart: an external change means value now
  // differs from what the editor already has; the editor's own onUpdate →
  // onChange → parent re-render → value-prop round-trip means it's still
  // identical, so this effect is a no-op on every keystroke.
  useEffect(() => {
    if (!editor || value == null) return
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [editor, value])

  return (
    <div className={`rte-wrapper${error ? ' input-error' : ''}${disabled ? ' rte-disabled' : ''}`} style={{ minHeight }}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="rte-editor-content" />
    </div>
  )
}
