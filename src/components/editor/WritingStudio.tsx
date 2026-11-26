"use client";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Minimize2, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useChapters, useScenes, useSettings } from "@/hooks/data";
import { getDoc, updateChapter, updateScene } from "@/lib/repositories/manuscript";
import { useCurrentProject } from "@/components/layout/ProjectShell";
import { useUI } from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { BufferedInput } from "@/components/ui/field";
import { EmptyState, Loading } from "@/components/ui/misc";
import { formatCount, type TextCounts } from "@/lib/utils/text";
import { cn } from "@/lib/utils/text";
import type { DocRef, ID, RichDoc } from "@/types";
import { Binder } from "./Binder";
import { WriteInspector } from "./WriteInspector";

const ManuscriptEditor = dynamic(() => import("./ManuscriptEditor").then((m) => m.ManuscriptEditor), {
  ssr: false,
  loading: () => <Loading label="Preparing the page…" />,
});

/** Loads a document once per (doc, version) so the editor is never overwritten while typing. */
function DocLoader({ docRef, version, onCounts }: { docRef: DocRef; version: number; onCounts: (c: TextCounts) => void }) {
  const [doc, setDoc] = useState<{ key: string; doc: RichDoc } | null | "missing">(null);
  const key = `${docRef.kind}:${docRef.id}:${version}`;
  useEffect(() => {
    let cancel = false;
    getDoc(docRef).then((d) => {
      if (!cancel) setDoc(d ? { key, doc: d.doc } : "missing");
    });
    return () => {
      cancel = true;
    };
  }, [docRef, key]);
  if (doc === "missing") return <EmptyState title="This document no longer exists" />;
  if (!doc || doc.key !== key) return <Loading />;
  return <ManuscriptEditor key={key} docRef={docRef} initialDoc={doc.doc} onCounts={onCounts} />;
}

export function WritingStudio() {
  const project = useCurrentProject();
  const chapters = useChapters(project.id);
  const scenes = useScenes(project.id);
  const settings = useSettings();
  const params = useSearchParams();
  const { binderOpen, toggleBinder, focusMode, setFocusMode } = useUI();
  const [selected, setSelected] = useState<{ kind: DocRef["kind"]; id: ID } | null>(null);
  const [version, setVersion] = useState(0);
  const [counts, setCounts] = useState<TextCounts | null>(null);

  // Choose initial document: ?doc= → last edited → first chapter.
  useEffect(() => {
    if (selected || !chapters || !scenes) return;
    const wanted = params.get("doc") ?? project.lastDocId;
    const asChapter = chapters.find((c) => c.id === wanted);
    const asScene = scenes.find((s) => s.id === wanted);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time initial selection after data loads
    if (asChapter) setSelected({ kind: "chapter", id: asChapter.id });
    else if (asScene) setSelected({ kind: "scene", id: asScene.id });
    else if (chapters[0]) setSelected({ kind: "chapter", id: chapters[0].id });
  }, [chapters, scenes, selected, params, project.lastDocId]);

  // If the selected doc is deleted elsewhere, fall back.
  useEffect(() => {
    if (!selected || !chapters || !scenes) return;
    const exists = selected.kind === "chapter" ? chapters.some((c) => c.id === selected.id) : scenes.some((s) => s.id === selected.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recover from deleted selection
    if (!exists) setSelected(chapters[0] ? { kind: "chapter", id: chapters[0].id } : null);
  }, [selected, chapters, scenes]);

  const docRef = useMemo<DocRef | null>(() => (selected ? { kind: selected.kind, id: selected.id } : null), [selected]);

  if (!chapters || !scenes || !settings) return <Loading />;

  const chapter = selected?.kind === "chapter" ? chapters.find((c) => c.id === selected.id) : undefined;
  const scene = selected?.kind === "scene" ? scenes.find((s) => s.id === selected.id) : undefined;
  const parentChapter = scene ? chapters.find((c) => c.id === scene.chapterId) : chapter;
  const title = chapter?.title ?? scene?.title ?? "";
  const goal = chapter?.wordGoal ?? null;

  return (
    <div className="flex h-full min-h-0">
      {!focusMode && binderOpen && (
        <div className="hidden w-64 shrink-0 border-r border-line md:block">
          <Binder projectId={project.id} chapters={chapters} scenes={scenes} selected={docRef} onSelect={(r) => setSelected(r)} />
        </div>
      )}
      <section className="relative flex min-w-0 flex-1 flex-col" aria-label="Writing area">
        {focusMode ? (
          <Button variant="ghost" size="sm" className="absolute right-4 top-3 z-10 opacity-40 hover:opacity-100" onClick={() => setFocusMode(false)}>
            <Minimize2 size={14} /> Exit focus (Esc)
          </Button>
        ) : (
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Button variant="ghost" size="icon-sm" onClick={toggleBinder} aria-label={binderOpen ? "Hide chapter list" : "Show chapter list"} className="hidden md:inline-flex">
              {binderOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </Button>
            {/* Mobile chapter picker */}
            <select
              className="h-8 max-w-[45vw] rounded border border-line bg-bg px-1 text-sm md:hidden"
              aria-label="Choose chapter"
              value={selected ? `${selected.kind}:${selected.id}` : ""}
              onChange={(e) => {
                const [kind, id] = e.target.value.split(":");
                setSelected({ kind: kind as DocRef["kind"], id });
              }}
            >
              {chapters.map((c) => (
                <optgroup key={c.id} label={c.title}>
                  <option value={`chapter:${c.id}`}>{c.title}</option>
                  {scenes
                    .filter((s) => s.chapterId === c.id)
                    .map((s) => (
                      <option key={s.id} value={`scene:${s.id}`}>
                        ↳ {s.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {selected && (
              <div className="min-w-0 flex-1">
                {scene && parentChapter && <div className="truncate text-[11px] text-muted">{parentChapter.title} /</div>}
                <BufferedInput
                  key={selected.id}
                  value={title}
                  aria-label="Document title"
                  className="serif h-8 border-transparent bg-transparent px-1 text-lg hover:border-line"
                  onCommit={(v) => {
                    const t = v.trim();
                    if (!t) return;
                    if (selected.kind === "chapter") void updateChapter(selected.id, { title: t });
                    else void updateScene(selected.id, { title: t });
                  }}
                />
              </div>
            )}
          </div>
        )}
        <div className="min-h-0 flex-1">
          {docRef ? (
            <DocLoader docRef={docRef} version={version} onCounts={setCounts} />
          ) : (
            <EmptyState title="No chapter selected">Add a chapter from the manuscript list to begin.</EmptyState>
          )}
        </div>
        {counts && (
          <footer
            className={cn(
              "flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-1.5 text-[11px] tabular-nums text-muted",
              focusMode && "border-transparent opacity-40 transition-opacity hover:opacity-100",
            )}
          >
            <span title="CJK characters + Latin words">{formatCount(counts.total)} total</span>
            <span>{formatCount(counts.cjk)} 字</span>
            <span>{formatCount(counts.words)} words</span>
            <span>{formatCount(counts.characters)} chars (no spaces)</span>
            {goal ? (
              <span className="ml-auto flex items-center gap-2">
                Chapter goal {formatCount(counts.total)} / {formatCount(goal)}
                <span className="inline-block h-[3px] w-20 overflow-hidden rounded bg-line">
                  <span className="block h-full bg-accent" style={{ width: `${Math.min(100, (counts.total / goal) * 100)}%` }} />
                </span>
              </span>
            ) : null}
          </footer>
        )}
      </section>
      {docRef && (
        <WriteInspector
          projectId={project.id}
          docRef={docRef}
          chapter={chapter}
          scene={scene}
          chapters={chapters}
          scenes={scenes}
          dailyGoal={settings.dailyWordGoal}
          onRestored={() => setVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}
