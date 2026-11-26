"use client";
import { useEffect, useRef, useState } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { searchKey } from "@/features/writing/search-extension";
import { Button } from "@/components/ui/button";

export function FindReplaceBar({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [term, setTerm] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const search = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const st = e ? searchKey.getState(e.state) : undefined;
      return { count: st?.matches.length ?? 0, current: st?.current ?? 0 };
    },
  });

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { term, caseSensitive, current: 0 }));
  }, [term, caseSensitive, editor]);

  // Clear highlights when closed.
  useEffect(
    () => () => {
      if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(searchKey, { term: "" }));
    },
    [editor],
  );

  const go = (delta: number) => {
    const st = searchKey.getState(editor.state);
    if (!st || !st.matches.length) return;
    const next = (st.current + delta + st.matches.length) % st.matches.length;
    const m = st.matches[next];
    editor.view.dispatch(editor.state.tr.setMeta(searchKey, { current: next }));
    editor.commands.setTextSelection({ from: m.from, to: m.to });
    editor.commands.scrollIntoView();
  };

  const replaceOne = () => {
    const st = searchKey.getState(editor.state);
    if (!st || !st.matches.length) return;
    const m = st.matches[st.current];
    editor.view.dispatch(editor.state.tr.insertText(replacement, m.from, m.to));
  };

  const replaceAll = () => {
    const st = searchKey.getState(editor.state);
    if (!st || !st.matches.length) return;
    let tr = editor.state.tr;
    for (const m of [...st.matches].reverse()) tr = tr.insertText(replacement, m.from, m.to);
    editor.view.dispatch(tr);
  };

  const field = "h-7 rounded border border-line bg-bg px-2 text-sm focus:border-accent focus:outline-none";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface/60 px-3 py-2" role="search">
      <input
        ref={inputRef}
        className={field}
        placeholder="Find"
        aria-label="Find"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go(e.shiftKey ? -1 : 1);
          } else if (e.key === "Escape") onClose();
        }}
      />
      <span className="min-w-[56px] text-xs tabular-nums text-muted">{term ? `${search.count ? search.current + 1 : 0} / ${search.count}` : ""}</span>
      <Button size="icon-sm" variant="ghost" onClick={() => go(-1)} aria-label="Previous match">
        <ChevronUp size={14} />
      </Button>
      <Button size="icon-sm" variant="ghost" onClick={() => go(1)} aria-label="Next match">
        <ChevronDown size={14} />
      </Button>
      <label className="flex items-center gap-1 text-xs text-muted">
        <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} /> Aa
      </label>
      <input
        className={field}
        placeholder="Replace with"
        aria-label="Replace with"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      />
      <Button size="sm" variant="outline" onClick={replaceOne} disabled={!search.count}>
        Replace
      </Button>
      <Button size="sm" variant="outline" onClick={replaceAll} disabled={!search.count}>
        Replace all
      </Button>
      <span className="text-[11px] text-muted">Undo with Ctrl+Z</span>
      <Button size="icon-sm" variant="ghost" className="ml-auto" onClick={onClose} aria-label="Close find">
        <X size={14} />
      </Button>
    </div>
  );
}
