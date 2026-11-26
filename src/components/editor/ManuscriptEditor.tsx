"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import type { EditorState } from "@tiptap/pm/state";
import { SearchExtension } from "@/features/writing/search-extension";
import { saveDocContent } from "@/lib/repositories/manuscript";
import { countText, type TextCounts } from "@/lib/utils/text";
import { useUI, toast } from "@/stores/ui";
import { useEditorBridge } from "@/stores/editor";
import type { DocRef, RichDoc } from "@/types";
import { EditorToolbar } from "./EditorToolbar";
import { FindReplaceBar } from "./FindReplaceBar";

const SAVE_DELAY = 700;

export function docText(state: EditorState): string {
  return state.doc.textBetween(0, state.doc.content.size, "\n\n", "\n");
}

export function ManuscriptEditor({
  docRef,
  initialDoc,
  onCounts,
  placeholder = "Begin here…  从这里开始写。",
}: {
  docRef: DocRef;
  initialDoc: RichDoc;
  onCounts?: (c: TextCounts) => void;
  placeholder?: string;
}) {
  const [findOpen, setFindOpen] = useState(false);
  const stateRef = useRef<EditorState | null>(null);
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countsCb = useRef(onCounts);
  useEffect(() => {
    countsCb.current = onCounts;
  }, [onCounts]);

  const save = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const state = stateRef.current;
    if (!state || !dirty.current) return;
    dirty.current = false;
    const setStatus = useUI.getState().setSaveStatus;
    setStatus("saving");
    const text = docText(state);
    const counts = countText(text);
    const job = (async () => {
      try {
        const ok = await saveDocContent(docRef, state.doc.toJSON() as RichDoc, text, counts.total);
        if (!ok) throw new Error("This document no longer exists.");
        // If more edits arrived while saving, stay "unsaved" until the next save.
        setStatus(dirty.current ? "unsaved" : "saved");
        countsCb.current?.(counts);
      } catch (e) {
        dirty.current = true;
        setStatus("error");
        toast(`Could not save: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    })();
    saving.current = job;
    await job;
  }, [docRef]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        codeBlock: false,
      }),
      Placeholder.configure({ placeholder }),
      SearchExtension,
    ],
    content: initialDoc as JSONContent,
    editorProps: {
      attributes: {
        class: "ProseMirror",
        spellcheck: "true",
        "aria-label": "Manuscript editor",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onCreate: ({ editor }) => {
      stateRef.current = editor.state;
      countsCb.current?.(countText(docText(editor.state)));
    },
    onUpdate: ({ editor, transaction }) => {
      stateRef.current = editor.state;
      if (!transaction.docChanged) return;
      dirty.current = true;
      useUI.getState().setSaveStatus("unsaved");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), SAVE_DELAY);
    },
  });

  // Expose to inspector & flush on hide / unmount so nothing is lost.
  useEffect(() => {
    if (!editor) return;
    useEditorBridge.getState().set({ editor, docRef, flush: save });
    const onHide = () => void save();
    const onVis = () => document.visibilityState === "hidden" && void save();
    window.addEventListener("pagehide", onHide);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onVis);
      void save();
      if (useEditorBridge.getState().editor === editor) useEditorBridge.getState().set({ editor: null, docRef: null, flush: null });
    };
  }, [editor, docRef, save]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "f" || e.key === "h") && !e.shiftKey) {
        e.preventDefault();
        setFindOpen(true);
      } else if (mod && e.key === "s") {
        e.preventDefault();
        dirty.current = true;
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const focusMode = useUI((s) => s.focusMode);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!focusMode && (editor ? <EditorToolbar editor={editor} onFind={() => setFindOpen((o) => !o)} /> : <div className="h-10 shrink-0 border-b border-line" />)}
      {findOpen && editor && <FindReplaceBar editor={editor} onClose={() => setFindOpen(false)} />}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-10 sm:px-10" onClick={(e) => e.target === e.currentTarget && editor?.commands.focus("end")}>
        <div className="manuscript">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
