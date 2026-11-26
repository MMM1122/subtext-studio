"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRightLeft, Lightbulb, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { useChapters, useNotes } from "@/hooks/data";
import { addNote, convertNote, deleteNote, noteTitle, updateNote } from "@/lib/repositories/notes";
import { getDB } from "@/lib/database/db";
import { Inspector, useCurrentProject } from "@/components/layout/ProjectShell";
import { Button } from "@/components/ui/button";
import { BufferedInput, Field, Input, Select, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge, EmptyState, Loading, SectionTitle, Tabs } from "@/components/ui/misc";
import { toast } from "@/stores/ui";
import { cn, parseTags, relativeTime, truncate } from "@/lib/utils/text";
import type { Chapter, ID, Note, NoteKind } from "@/types";

const KINDS: Record<NoteKind, string> = {
  idea: "Idea",
  dialogue: "Dialogue",
  research: "Research",
  question: "Question",
  visual: "Visual reference",
  plot: "Alternative plot",
};

type View = "notes" | "search";

export function IdeaVault() {
  const project = useCurrentProject();
  const notes = useNotes(project.id);
  const chapters = useChapters(project.id);
  const [view, setView] = useState<View>("notes");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<NoteKind | "">("");
  const [tag, setTag] = useState("");
  const [selected, setSelected] = useState<ID | null>(null);
  const [draft, setDraft] = useState("");
  const [draftKind, setDraftKind] = useState<NoteKind>("idea");
  const [draftTags, setDraftTags] = useState("");

  if (!notes || !chapters) return <Loading />;
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags))).sort();
  const q = query.trim().toLowerCase();
  const list = notes
    .filter((n) => (!kind || n.kind === kind) && (!tag || n.tags.includes(tag)) && (!q || (n.title + " " + n.body + " " + n.tags.join(" ")).toLowerCase().includes(q)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  const sel = notes.find((n) => n.id === selected) ?? null;

  const capture = async () => {
    const text = draft.trim();
    if (!text) return;
    const [first, ...rest] = text.split("\n");
    const n = await addNote(project.id, {
      title: rest.length ? first.slice(0, 120) : "",
      body: rest.length ? rest.join("\n").trim() : text,
      kind: draftKind,
      tags: parseTags(draftTags),
    });
    setDraft("");
    setDraftTags("");
    setSelected(n.id);
  };

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-line px-3">
          <Tabs
            className="border-b-0"
            value={view}
            onChange={setView}
            items={[
              { value: "notes", label: "Notes" },
              { value: "search", label: "Search whole project" },
            ]}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {view === "search" ? (
            <ProjectSearch projectId={project.id} chapters={chapters} />
          ) : (
            <div className="mx-auto max-w-5xl px-6 py-6">
              <form
                className="mb-6 rounded-md border border-line bg-surface/50 p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void capture();
                }}
              >
                <Textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void capture();
                    }
                  }}
                  placeholder="Capture an idea… (first line becomes the title if there are several lines · Ctrl+Enter to save)"
                  aria-label="Quick capture"
                  className="serif border-transparent bg-transparent text-[15px] focus:border-transparent"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Select className="h-8 w-44" value={draftKind} onChange={(e) => setDraftKind(e.target.value as NoteKind)} aria-label="Note type">
                    {(Object.keys(KINDS) as NoteKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KINDS[k]}
                      </option>
                    ))}
                  </Select>
                  <Input className="h-8 w-56" value={draftTags} onChange={(e) => setDraftTags(e.target.value)} placeholder="tags, comma separated" aria-label="Tags" />
                  <Button type="submit" size="sm" variant="primary" className="ml-auto" disabled={!draft.trim()}>
                    <Lightbulb size={13} /> Capture
                  </Button>
                </div>
              </form>

              <div className="mb-4 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <Input className="h-8 w-60 pl-8" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" aria-label="Search notes" />
                </div>
                <Select className="h-8 w-44" value={kind} onChange={(e) => setKind(e.target.value as NoteKind | "")} aria-label="Filter by type">
                  <option value="">All types</option>
                  {(Object.keys(KINDS) as NoteKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KINDS[k]}
                    </option>
                  ))}
                </Select>
                <div className="flex flex-wrap gap-1">
                  {allTags.map((t) => (
                    <button key={t} onClick={() => setTag(tag === t ? "" : t)} aria-pressed={tag === t} className={cn("rounded border px-1.5 py-0.5 text-[11px]", tag === t ? "border-accent text-ink" : "border-line text-muted")}>
                      #{t}
                    </button>
                  ))}
                </div>
              </div>

              {list.length === 0 ? (
                <EmptyState icon={<Lightbulb size={26} />} title={notes.length ? "No matching notes" : "The vault is empty"}>
                  {notes.length ? "Try a different search or filter." : "Dialogue fragments, research, questions, images, alternative plots — capture them above."}
                </EmptyState>
              ) : (
                <ul className="columns-1 gap-4 sm:columns-2 xl:columns-3">
                  {list.map((n) => (
                    <li key={n.id} className="mb-4 break-inside-avoid">
                      <button
                        onClick={() => setSelected(n.id)}
                        className={cn("block w-full rounded-md border bg-bg p-3.5 text-left transition-colors hover:border-accent/60", selected === n.id ? "border-accent" : "border-line")}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
                          {n.pinned && <Pin size={11} className="text-accent-ink" aria-label="Pinned" />}
                          {KINDS[n.kind]}
                          {n.convertedTo && <span className="text-accent-ink">→ {n.convertedTo.kind}</span>}
                          <span className="ml-auto normal-case tracking-normal">{relativeTime(n.updatedAt)}</span>
                        </div>
                        <div className="serif text-[15px] leading-snug text-ink">{noteTitle(n)}</div>
                        {n.title && n.body && <p className="serif mt-1.5 line-clamp-5 whitespace-pre-wrap text-sm leading-relaxed text-muted">{n.body}</p>}
                        {(n.tags.length > 0 || n.chapterIds.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {n.tags.map((t) => (
                              <Badge key={t}>#{t}</Badge>
                            ))}
                            {n.chapterIds.map((cid) => {
                              const i = chapters.findIndex((c) => c.id === cid);
                              return i >= 0 ? <Badge key={cid}>Ch {i + 1}</Badge> : null;
                            })}
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
      <Inspector title="Note">
        {sel ? <NoteEditor key={sel.id} n={sel} chapters={chapters} projectId={project.id} onDeleted={() => setSelected(null)} /> : <p className="text-sm text-muted">Select a note to edit, link or convert it.</p>}
      </Inspector>
    </div>
  );
}

function NoteEditor({ n, chapters, projectId, onDeleted }: { n: Note; chapters: Chapter[]; projectId: ID; onDeleted: () => void }) {
  const [convertKind, setConvertKind] = useState<"character" | "event" | "scene">("character");
  const [convertChapter, setConvertChapter] = useState(chapters[0]?.id ?? "");
  const [confirm, setConfirm] = useState(false);
  const set = (p: Partial<Note>) => updateNote(n.id, p);
  const target =
    n.convertedTo?.kind === "character"
      ? `/projects/${projectId}/characters`
      : n.convertedTo?.kind === "event"
        ? `/projects/${projectId}/timeline`
        : n.convertedTo
          ? `/projects/${projectId}/write?doc=${n.convertedTo.id}`
          : "";
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => set({ pinned: !n.pinned })}>
          {n.pinned ? <PinOff size={13} /> : <Pin size={13} />} {n.pinned ? "Unpin" : "Pin"}
        </Button>
        <Select className="h-7 text-xs" value={n.kind} onChange={(e) => set({ kind: e.target.value as NoteKind })} aria-label="Type">
          {(Object.keys(KINDS) as NoteKind[]).map((k) => (
            <option key={k} value={k}>
              {KINDS[k]}
            </option>
          ))}
        </Select>
      </div>
      <Field label="Title">
        <BufferedInput value={n.title} onCommit={(v) => set({ title: v })} className="serif" placeholder="(optional)" />
      </Field>
      <Field label="Note">
        <BufferedInput multiline rows={8} value={n.body} onCommit={(v) => set({ body: v })} className="serif text-[15px]" />
      </Field>
      <Field label="Tags">
        <BufferedInput value={n.tags.join(", ")} onCommit={(v) => set({ tags: parseTags(v) })} />
      </Field>
      <Field label="Reference URL" hint="Visual or research reference. Images are not fetched automatically.">
        <BufferedInput value={n.reference} onCommit={(v) => set({ reference: v.trim() })} placeholder="https://…" />
      </Field>
      {n.reference && /^https?:\/\//.test(n.reference) && (
        <a href={n.reference} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-accent-ink underline">
          {n.reference}
        </a>
      )}
      <div>
        <SectionTitle>Linked chapters</SectionTitle>
        <div className="max-h-36 space-y-1 overflow-y-auto">
          {chapters.map((c, i) => (
            <label key={c.id} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={n.chapterIds.includes(c.id)}
                onChange={(e) => set({ chapterIds: e.target.checked ? [...n.chapterIds, c.id] : n.chapterIds.filter((x) => x !== c.id) })}
              />
              {i + 1}. {truncate(c.title, 32)}
            </label>
          ))}
        </div>
      </div>
      <div className="rounded-md border border-line p-3">
        <SectionTitle>Convert</SectionTitle>
        {n.convertedTo ? (
          <p className="text-xs text-muted">
            Already converted to a {n.convertedTo.kind}.{" "}
            <Link href={target} className="text-accent-ink underline">
              Open
            </Link>
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select className="h-8" value={convertKind} onChange={(e) => setConvertKind(e.target.value as typeof convertKind)} aria-label="Convert to">
                <option value="character">Character</option>
                <option value="event">Timeline event</option>
                <option value="scene">Scene</option>
              </Select>
              {convertKind !== "character" && (
                <Select className="h-8" value={convertChapter} onChange={(e) => setConvertChapter(e.target.value)} aria-label="Chapter">
                  {convertKind === "event" && <option value="">No chapter</option>}
                  {chapters.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      Ch {i + 1}
                    </option>
                  ))}
                </Select>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  await convertNote(n, convertKind, convertChapter || undefined);
                  toast(`Created a new ${convertKind}. The note is kept.`);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Conversion failed", "error");
                }
              }}
            >
              <ArrowRightLeft size={13} /> Convert (keeps the note)
            </Button>
          </div>
        )}
      </div>
      <Button variant="danger" size="sm" onClick={() => setConfirm(true)}>
        <Trash2 size={13} /> Delete note
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete note?"
        danger
        confirmLabel="Delete"
        description={<>“{noteTitle(n)}” will be removed.</>}
        onConfirm={async () => {
          await deleteNote(n.id);
          onDeleted();
        }}
      />
    </div>
  );
}

interface Hit {
  kind: string;
  title: string;
  snippet: string;
  href: string;
}

function snippet(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return truncate(text, 140);
  const start = Math.max(0, i - 50);
  return (start > 0 ? "…" : "") + text.slice(start, i + q.length + 80).replace(/\s+/g, " ") + "…";
}

/** Simple full-text search across the project's local data. */
function ProjectSearch({ projectId, chapters }: { projectId: ID; chapters: Chapter[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const data = useLiveQuery(async () => {
    const db = getDB();
    const [scenes, characters, events, facts, notes] = await Promise.all([
      db.scenes.where("projectId").equals(projectId).toArray(),
      db.characters.where("projectId").equals(projectId).toArray(),
      db.events.where("projectId").equals(projectId).toArray(),
      db.facts.where("projectId").equals(projectId).toArray(),
      db.notes.where("projectId").equals(projectId).toArray(),
    ]);
    return { scenes, characters, events, facts, notes };
  }, [projectId]);
  const hits = useMemo<Hit[]>(() => {
    if (!data || q.length < 1) return [];
    const out: Hit[] = [];
    const base = `/projects/${projectId}`;
    for (const c of chapters) {
      const hay = `${c.title}\n${c.text}\n${c.notes}`;
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Chapter", title: c.title, snippet: snippet(hay, q), href: `${base}/write?doc=${c.id}` });
    }
    for (const s of data.scenes) {
      const hay = `${s.title}\n${s.summary}\n${s.text}`;
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Scene", title: s.title, snippet: snippet(hay, q), href: `${base}/write?doc=${s.id}` });
    }
    for (const c of data.characters) {
      const hay = [c.name, c.appearance, c.background, c.personality, c.goals, c.motivations, c.fears, c.secrets, c.beliefs, c.memories, c.arc, c.notes].join("\n");
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Character", title: c.name, snippet: snippet(hay, q), href: `${base}/characters` });
    }
    for (const e of data.events) {
      const hay = [e.title, e.description, e.storyTime, e.location, e.consequences, e.tags.join(" ")].join("\n");
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Event", title: e.title, snippet: snippet(hay, q), href: `${base}/timeline` });
    }
    for (const f of data.facts) {
      const hay = `${f.title}\n${f.description}`;
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Fact", title: f.title, snippet: snippet(hay, q), href: `${base}/knowledge` });
    }
    for (const n of data.notes) {
      const hay = `${n.title}\n${n.body}\n${n.tags.join(" ")}`;
      if (hay.toLowerCase().includes(q)) out.push({ kind: "Note", title: noteTitle(n), snippet: snippet(hay, q), href: `${base}/notes` });
    }
    return out;
  }, [data, q, chapters, projectId]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-6">
      <div className="relative mb-5">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Input autoFocus className="h-10 pl-9 text-[15px]" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chapters, scenes, characters, events, facts and notes…" aria-label="Search project" />
      </div>
      {!data ? (
        <Loading />
      ) : q && hits.length === 0 ? (
        <p className="text-sm text-muted">No results for “{query}”.</p>
      ) : (
        <ul className="divide-y divide-line">
          {hits.map((h, i) => (
            <li key={i}>
              <Link href={h.href} className="block py-3 hover:bg-surface/60">
                <span className="text-[10px] uppercase tracking-wider text-muted">{h.kind}</span>
                <span className="serif block text-[15px] text-ink">{h.title}</span>
                <span className="serif block text-sm leading-relaxed text-muted">{h.snippet}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {q && hits.length > 0 && <p className="mt-4 text-xs text-muted">{hits.length} result(s) · searched locally, nothing leaves your browser.</p>}
    </div>
  );
}
