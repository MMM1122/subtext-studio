"use client";
import { useEditorState, type Editor } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, Minus, Quote, Redo2, Search, Strikethrough, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/text";

function Tool({ onClick, active, disabled, label, children }: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded text-muted transition-colors hover:bg-surface hover:text-ink disabled:opacity-35",
        active && "bg-surface-2 text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function EditorToolbar({ editor, onFind }: { editor: Editor; onFind: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
({
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        strike: e.isActive("strike"),
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        quote: e.isActive("blockquote"),
        ul: e.isActive("bulletList"),
        ol: e.isActive("orderedList"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      }),
  });
  const c = () => editor.chain().focus();
  const sep = <span className="mx-1 h-4 w-px bg-line" aria-hidden />;
  return (
    <div role="toolbar" aria-label="Formatting" className="flex h-10 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line px-3">
      <Tool label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => c().undo().run()}>
        <Undo2 size={15} />
      </Tool>
      <Tool label="Redo (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => c().redo().run()}>
        <Redo2 size={15} />
      </Tool>
      {sep}
      <Tool label="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold size={15} />
      </Tool>
      <Tool label="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic size={15} />
      </Tool>
      <Tool label="Strikethrough" active={s.strike} onClick={() => c().toggleStrike().run()}>
        <Strikethrough size={15} />
      </Tool>
      {sep}
      <Tool label="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={15} />
      </Tool>
      <Tool label="Subheading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={15} />
      </Tool>
      <Tool label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
        <Quote size={15} />
      </Tool>
      <Tool label="Bulleted list" active={s.ul} onClick={() => c().toggleBulletList().run()}>
        <List size={15} />
      </Tool>
      <Tool label="Numbered list" active={s.ol} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered size={15} />
      </Tool>
      <Tool label="Scene break" onClick={() => c().setHorizontalRule().run()}>
        <Minus size={15} />
      </Tool>
      {sep}
      <Tool label="Find & replace (Ctrl+F)" onClick={onFind}>
        <Search size={15} />
      </Tool>
    </div>
  );
}
